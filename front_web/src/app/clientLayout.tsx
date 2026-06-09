'use client';

import { createContext, useEffect, useRef, useState } from 'react';
import { fontVariables } from '@/lib/fonts';
import '@/styles/globals.css';
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

    // On utilise le pathname complet pour éviter les redirections serveur en chaîne.
    // Les pages /auth/* redirigent vers le dashboard après connexion.
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const locale = pathParts[0] || 'fr';
    const isAuthPage = pathParts[1] === 'auth';
    const redirectUri = isAuthPage
      ? `${window.location.origin}/${locale}/page/dashboard`
      : `${window.location.origin}${window.location.pathname}`;

    kc.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      // query : le code arrive en ?code=… et survit aux redirects serveur
      // fragment : le code arrive en #code=… et se perd si Next.js redirige
      responseMode: 'query',
      redirectUri,
    })
      .then(auth => {
        setAuthenticated(auth);
        if (auth) {
          if (isAuthPage) {
            window.location.replace(`${window.location.origin}/${locale}/page/dashboard`);
            return;
          }
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
        <AuthContext.Provider value={{ keycloak: kc, authenticated }}>
          <ReduxProvider>
            {children}
          </ReduxProvider>
        </AuthContext.Provider>
      </body>
    </html>
  );
}
