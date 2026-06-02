/**
 * Keycloak OAuth 2.0 utilities
 *
 * Required env vars:
 *   KEYCLOAK_URL      – e.g. https://auth.portalis.io
 *   KEYCLOAK_REALM    – e.g. portalis
 *   KEYCLOAK_CLIENT_ID – e.g. portalis-web
 */

import Keycloak from 'keycloak-js';

let _instance: Keycloak | null = null;

/** Singleton Keycloak instance (PKCE / redirect flow). Browser-only. */
export function getKeycloakInstance(): Keycloak {
  if (!_instance) {
    _instance = new Keycloak({
      url: process.env.KEYCLOAK_URL!,
      realm: process.env.KEYCLOAK_REALM!,
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
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
 * Direct Access Grant (Resource Owner Password flow).
 * Used for the custom login form; requires the realm to have
 * "Direct access grants" enabled for this client.
 */
export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const url =
    `${process.env.KEYCLOAK_URL}/realms/` +
    `${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: process.env.KEYCLOAK_CLIENT_ID!,
      username,
      password,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error_description ?? 'Invalid credentials');
  }

  return res.json() as Promise<TokenResponse>;
}

/** Persist tokens after a successful login. */
export function storeTokens(tokens: TokenResponse, rememberMe: boolean): void {
  sessionStorage.setItem('portalis_at', tokens.access_token);

  const maxAge = rememberMe ? tokens.refresh_expires_in : tokens.expires_in;
  document.cookie =
    `portalis_at=${tokens.access_token}; path=/; max-age=${maxAge}; SameSite=Strict`;

  if (rememberMe) {
    localStorage.setItem('portalis_rt', tokens.refresh_token);
  }
}

/** Clear all stored tokens (used on logout or session expiry). */
export function clearTokens(): void {
  sessionStorage.removeItem('portalis_at');
  localStorage.removeItem('portalis_rt');
  document.cookie = 'portalis_at=; path=/; max-age=0';
}
