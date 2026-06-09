const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const { getKeycloakInstance } = require("./keycloak") as typeof import("./keycloak");
  return getKeycloakInstance().token ?? null;
}

function buildHeaders(isProtected: boolean, isMultipart: boolean): HeadersInit {
  const headers: Record<string, string> = {};

  // For multipart, let the browser inject Content-Type + boundary automatically
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }

  if (isProtected) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

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
  const headers = buildHeaders(isProtected, isMultipart);
  const body = method !== "GET" ? buildBody(data, isMultipart) : undefined;

  try {
    const res = await fetch(fullUrl, { method, headers, body });

    let responseData: TData | null = null;
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      responseData = (await res.json()) as TData;
    } else if (res.status !== 204) {
      responseData = (await res.text()) as unknown as TData;
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

      // Erreur générique
      const errMsg =
        (payload?.message as string) ??
        (payload?.detail as string) ??
        (payload?.error_description as string) ??
        (payload?.error as string) ??
        `HTTP ${res.status}`;
      return { data: null, status: res.status, ok: false, error: errMsg };
    }

    return { data: responseData, status: res.status, ok: true };
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
