'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fontVariables } from '@/lib/fonts';
import '@/styles/globals.css';
import { ReduxProvider } from '@/redux/features/provider';
import { getKeycloakInstance, syncTokenToCookie, clearTokens } from '@/lib/keycloak';
import type Keycloak from 'keycloak-js';

// ── Auth Context ───────────────────────────────────────────────────────────

interface AuthContextValue {
  keycloak: Keycloak;
  authenticated: boolean;
  /** Raccourci vers keycloak.token (chaîne JWT courante). */
  token: string | undefined;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook pour consommer l'instance Keycloak n'importe où dans l'arbre.
 * Fournit : keycloak, authenticated, token.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans ClientLayout');
  return ctx;
}

// ── Layout ─────────────────────────────────────────────────────────────────

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // Evite la double-init en React StrictMode
    if (initialized.current) return;
    initialized.current = true;

    const kc = getKeycloakInstance();

    kc.init({
      onLoad: 'login-required',
      redirectUri: `${window.location.origin}`,
      pkceMethod: 'S256',
    })
      .then(auth => {
        if (!auth) {
          // Ne devrait pas arriver avec login-required, mais par sécurité
          kc.login();
          return;
        }

        syncTokenToCookie(kc.token);
        setToken(kc.token);
        setAuthenticated(true);

        // Rafraîchit le token 60s avant expiration
        kc.onTokenExpired = () => {
          kc.updateToken(60)
            .then(refreshed => {
              if (refreshed) {
                syncTokenToCookie(kc.token);
                setToken(kc.token);
              }
            })
            .catch(() => {
              // Refresh échoué (session expirée côté Keycloak)
              clearTokens();
              kc.login({ redirectUri: window.location.origin });
            });
        };

        // Synchronise le cookie à chaque renouvellement réussi
        kc.onAuthRefreshSuccess = () => {
          syncTokenToCookie(kc.token);
          setToken(kc.token);
        };
      })
      .catch(err => {
        console.error('Keycloak init failed', err);
        kc.login({ redirectUri: window.location.origin });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // ── Écran de chargement pendant l'init Keycloak ────────────────────────
  if (isLoading) {
    return (
      <html data-theme="light" className={fontVariables}>
        <body className="antialiased">
          <div className="flex items-center justify-center h-screen bg-[var(--bg-page,#f8fafc)]">
            <div className="text-center">
              <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Vérification de la session…</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  const kc = getKeycloakInstance();

  return (
    <html data-theme="light" className={fontVariables}>
      <body className="antialiased">
        <AuthContext.Provider value={{ keycloak: kc, authenticated, token }}>
          <ReduxProvider>
            {children}
          </ReduxProvider>
        </AuthContext.Provider>
      </body>
    </html>
  );
}
