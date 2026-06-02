/**
 * Keycloak OAuth 2.0 utilities
 *
 * Public env vars (browser + server):
 *   NEXT_PUBLIC_KEYCLOAK_URL         – e.g. https://auth.portalis.io
 *   NEXT_PUBLIC_KEYCLOAK_REALM       – e.g. portalis
 *   NEXT_PUBLIC_KEYCLOAK_CLIENT_ID   – e.g. portalis-web
 *
 * Server-only (never exposed au navigateur) :
 *   KEYCLOAK_CLIENT_SECRET           – géré dans /api/auth/token
 */

import Keycloak from "keycloak-js";

let _instance: Keycloak | null = null;

/** Singleton Keycloak instance (PKCE / redirect flow). Browser-only. */
export function getKeycloakInstance(): Keycloak {
  if (!_instance) {
    _instance = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL!,
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM!,
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
    });
  }
  return _instance;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  session_state?: string;
}

/**
 * Direct Access Grant via le proxy server-side /api/auth/token.
 * Le client_secret n'est jamais transmis au navigateur.
 */
export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const res = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Invalid credentials");
  }

  return res.json() as Promise<TokenResponse>;
}

/** Persist tokens after a successful login. */
export function storeTokens(tokens: TokenResponse, rememberMe: boolean): void {
  sessionStorage.setItem("portalis_at", tokens.access_token);

  const maxAge = rememberMe ? tokens.refresh_expires_in : tokens.expires_in;
  document.cookie = `portalis_at=${tokens.access_token}; path=/; max-age=${maxAge}; SameSite=Strict`;

  if (rememberMe) {
    localStorage.setItem("portalis_rt", tokens.refresh_token);
  }
}

/** Clear all stored tokens (used on logout or session expiry). */
export function clearTokens(): void {
  sessionStorage.removeItem("portalis_at");
  localStorage.removeItem("portalis_rt");
  document.cookie = "portalis_at=; path=/; max-age=0";
}
