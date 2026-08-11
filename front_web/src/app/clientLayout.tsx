'use client';

import { createContext, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
  const [, setToken] = useState<string | undefined>(undefined);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;
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
          kc.onTokenExpired = async () => {
            console.log('Access token expiré, tentative de refresh...');
            try {
              const refreshed = await kc.updateToken(30);
              if (!mounted) return;
              setToken(kc.token);
              console.log(refreshed ? 'Token renouvelé' : 'Token encore valide');
            } catch (error) {
              console.error('Impossible de renouveler le token', error);
              if (mounted) {
                setAuthenticated(false);
              }
              await kc.login();
            }
          };
        }
      })
      .catch(err => console.error('Keycloak init failed', err))
      .finally(() => setIsLoading(false));

    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'var(--bg-surf, #f9fafb)' }}
      >
        {/* Blob de fond très subtil */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'var(--grad)', opacity: 0.06 }}
        />

        <div className="relative z-10 flex flex-col items-center select-none">
          <div className="relative mb-8">
            <Image
              src="/assets/images/logo_portalis.png"
              alt="PortaLis"
              width={150}
              height={150}
              className="relative drop-shadow-md"
              priority
            />
          </div>

          {/* Dots animés */}
          <div className="flex items-center gap-2">
            {([0, 150, 300] as const).map(delay => (
              <span
                key={delay}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  background: 'var(--p500, #1B6B45)',
                  animationDelay: `${delay}ms`,
                }}
              />
            ))}
          </div>
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
