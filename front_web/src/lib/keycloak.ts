/**
 * Keycloak OAuth 2.0 utilities — PKCE / SSO redirect flow.
 *
 * Env vars (NEXT_PUBLIC_* → disponibles côté client ET serveur) :
 *   NEXT_PUBLIC_KEYCLOAK_URL         – ex. https://auth.portalis.io
 *   NEXT_PUBLIC_KEYCLOAK_REALM       – ex. portalis
 *   NEXT_PUBLIC_KEYCLOAK_CLIENT_ID   – ex. portalis-web
 */

import Keycloak from 'keycloak-js';

let _instance: Keycloak | null = null;

/** Singleton Keycloak — toujours la même instance côté client. */
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

/**
 * Synchronise le token Keycloak dans :
 *  - sessionStorage['portalis_at']  (disponible dans la session courante)
 *  - cookie 'portalis_at'           (lu par ApiService + middleware)
 */
export function syncTokenToCookie(token: string | undefined): void {
  if (!token) return;
  sessionStorage.setItem('portalis_at', token);
  document.cookie = `portalis_at=${token}; path=/; SameSite=Strict`;
}

/** Efface le token de sessionStorage et du cookie. */
export function clearTokens(): void {
  sessionStorage.removeItem('portalis_at');
  document.cookie = 'portalis_at=; path=/; max-age=0';
}

/**
 * Déconnexion complète : efface les tokens locaux et termine la session
 * SSO côté Keycloak (redirige vers Keycloak logout endpoint).
 */
export function logoutKeycloak(redirectUri?: string): void {
  clearTokens();
  const kc = getKeycloakInstance();
  // Sans redirectUri enregistré dans "Valid post logout redirect URIs",
  // Keycloak affiche sa propre page de confirmation post-déconnexion.
  kc.logout(redirectUri ? { redirectUri } : undefined);
}
