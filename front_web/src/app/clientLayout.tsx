'use client';

import { createContext, useEffect, useRef, useState } from 'react';
import { ReduxProvider } from '@/redux/features/provider';
import { getKeycloakInstance } from '@/lib/keycloak';
import type Keycloak from 'keycloak-js';

export const AuthContext = createContext<{
  keycloak: Keycloak;
  authenticated: boolean;
} | null>(null);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const kc = getKeycloakInstance();
    const redirectUri = `${window.location.origin}${window.location.pathname}`;

    kc.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      responseMode: 'query',
      checkLoginIframe: false,
      redirectUri,
    })
      .then(auth => {
        setAuthenticated(auth);
        if (auth) {
          kc.onTokenExpired = () => {
            kc.updateToken(60).catch(() => kc.login({ redirectUri }));
          };
        }
      })
      .catch(err => console.error('Keycloak init failed', err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-page,#f8fafc)]">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Vérification de la session…</p>
        </div>
      </div>
    );
  }

  const kc = getKeycloakInstance();

  return (
    <AuthContext.Provider value={{ keycloak: kc, authenticated }}>
      <ReduxProvider>{children}</ReduxProvider>
    </AuthContext.Provider>
  );
}
