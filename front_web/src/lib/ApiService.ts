const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// Company context — populated once the user session is loaded.
// Set via setCompanyContext() from a Redux-connected component.
let _companyId = '';

export function setCompanyContext(id: string): void {
  _companyId = id;
}

/* ── Types ───────────────────────────────────────────────────────────── */

export interface ApiRequestOptions<TBody = Record<string, unknown>> {
  url: string;
  data?: TBody;
  protected?: boolean;
  isMultipart?: boolean;
}

export interface ApiResponse<TData = unknown> {
  data: TData | null;
  status: number;
  ok: boolean;
  error?: string;
}

/* ── Internals ───────────────────────────────────────────────────────── */

/**
 * Ensures the Keycloak token has at least `minValidity` seconds left.
 * Forces a refresh if not. Redirects to login if the refresh token is
 * also invalid. Returns the (potentially refreshed) token, or null SSR.
 */
async function ensureFreshToken(minValidity = 30): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { getKeycloakInstance } = require("./keycloak") as typeof import("./keycloak");
  const kc = getKeycloakInstance();
  if (!kc.authenticated) return null;
  try {
    await kc.updateToken(minValidity);
    return kc.token ?? null;
  } catch {
    // Refresh token expired or revoked — redirect to login
    kc.login({ redirectUri: window.location.href });
    return null;
  }
}

function buildHeaders(isProtected: boolean, isMultipart: boolean, token: string | null): HeadersInit {
  const headers: Record<string, string> = {};
  if (!isMultipart) headers["Content-Type"] = "application/json";
  if (isProtected && token) headers["Authorization"] = `Bearer ${token}`;
  if (_companyId) headers["X-Company-Id"] = _companyId;
  return headers;
}

function buildBody(data: unknown, isMultipart: boolean): BodyInit | undefined {
  if (data === undefined || data === null) return undefined;

  if (isMultipart) {
    if (data instanceof FormData) return data;
    const form = new FormData();
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      form.append(key, value instanceof File ? value : String(value));
    });
    return form;
  }

  return JSON.stringify(data);
}

async function parseResponse<TData>(res: Response): Promise<ApiResponse<TData>> {
  let responseData: TData | null = null;
  const contentType = res.headers.get("content-type") ?? "";

  const raw = res.status !== 204 ? await res.text() : "";
  const text = raw.trim();
  if (text) {
    if (contentType.includes("application/json")) {
      try {
        responseData = JSON.parse(text) as TData;
      } catch {
        // corps non-JSON malgré le content-type — on l'ignore
      }
    } else {
      responseData = text as unknown as TData;
    }
  }

  if (!res.ok) {
    const payload = responseData as Record<string, unknown> | null;

    // Erreur de validation FastAPI : { detail: [{ loc, msg, type }] }
    if (Array.isArray(payload?.detail)) {
      type ValidationEntry = { loc?: unknown[]; msg?: string };
      const entries = payload!.detail as ValidationEntry[];
      const errMsg = entries
        .map(e => {
          const field = Array.isArray(e.loc) ? String(e.loc[e.loc.length - 1]) : '';
          return field ? `${field}: ${e.msg ?? ''}` : (e.msg ?? '');
        })
        .filter(Boolean)
        .join(' · ');
      return { data: null, status: res.status, ok: false, error: errMsg || `HTTP ${res.status}` };
    }

    // `detail` can be a plain string (FastAPI default) or a structured object
    // like { code: "NO_WORKFLOW", message: "..." } — extract the string safely.
    let detailMsg: string | undefined;
    if (typeof payload?.detail === 'string') {
      detailMsg = payload.detail;
    } else if (payload?.detail && typeof payload.detail === 'object') {
      detailMsg = (payload.detail as { message?: string }).message;
    }

    const errMsg =
      (payload?.message as string | undefined) ??
      detailMsg ??
      (payload?.error_description as string | undefined) ??
      (payload?.error as string | undefined) ??
      `HTTP ${res.status}`;
    return { data: null, status: res.status, ok: false, error: errMsg };
  }

  return { data: responseData, status: res.status, ok: true };
}

async function request<TData = unknown, TBody = Record<string, unknown>>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  opts: ApiRequestOptions<TBody>,
): Promise<ApiResponse<TData>> {
  const {
    url,
    data,
    protected: isProtected = false,
    isMultipart = false,
  } = opts;

  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  const body = method !== "GET" ? buildBody(data, isMultipart) : undefined;

  // Refresh token proactively before sending (no-op if still valid)
  const token = isProtected ? await ensureFreshToken(30) : null;
  const headers = buildHeaders(isProtected, isMultipart, token);

  try {
    const res = await fetch(fullUrl, { method, headers, body });

    // On 401: force-refresh and retry once before giving up
    if (res.status === 401 && isProtected) {
      const { getKeycloakInstance } = require("./keycloak") as typeof import("./keycloak");
      const kc = getKeycloakInstance();
      try {
        await kc.updateToken(-1); // force immediate refresh
        const retryToken = kc.token ?? null;
        const retryHeaders = buildHeaders(isProtected, isMultipart, retryToken);
        const retryRes = await fetch(fullUrl, { method, headers: retryHeaders, body });
        // If still 401 after refresh, the session is truly gone → redirect
        if (retryRes.status === 401) {
          kc.login({ redirectUri: window.location.href });
          return { data: null, status: 401, ok: false };
        }
        return parseResponse<TData>(retryRes);
      } catch {
        kc.login({ redirectUri: window.location.href });
        return { data: null, status: 401, ok: false };
      }
    }

    return parseResponse<TData>(res);
  } catch (err) {
    return {
      data: null,
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/* ── Public API ──────────────────────────────────────────────────────── */

export function GetData<TData = unknown>(
  opts: ApiRequestOptions,
): Promise<ApiResponse<TData>> {
  return request<TData>("GET", opts);
}

export function PostData<TData = unknown, TBody = Record<string, unknown>>(
  opts: ApiRequestOptions<TBody>,
): Promise<ApiResponse<TData>> {
  return request<TData, TBody>("POST", opts);
}

export function PutData<TData = unknown, TBody = Record<string, unknown>>(
  opts: ApiRequestOptions<TBody>,
): Promise<ApiResponse<TData>> {
  return request<TData, TBody>("PUT", opts);
}

export function PatchData<TData = unknown, TBody = Record<string, unknown>>(
  opts: ApiRequestOptions<TBody>,
): Promise<ApiResponse<TData>> {
  return request<TData, TBody>("PATCH", opts);
}

export function DeleteData<TData = unknown>(
  opts: ApiRequestOptions,
): Promise<ApiResponse<TData>> {
  return request<TData>("DELETE", opts);
}
