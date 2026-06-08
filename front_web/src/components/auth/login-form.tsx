'use client';

import { useEffect, useState } from 'react';
import { getKeycloakInstance } from '@/lib/keycloak';
import { Button } from '@/components/ui/button';

interface LoginFormProps {
  locale: string;
}

export default function LoginForm({ locale }: LoginFormProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // clientLayout.tsx gère l'init Keycloak et la redirection automatique.
    // Cette page n'est visible que si l'utilisateur y navigue manuellement
    // ou si l'init Keycloak n'a pas encore tourné.
    setReady(true);

    const kc = getKeycloakInstance();
    if (!kc.authenticated) {
      kc.login({
        redirectUri: window.location.origin + window.location.pathname,
      });
    }
  }, [locale]);

  if (!ready) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <p className="text-sm text-neutral-500 mb-6">
        Vous allez être redirigé vers la page de connexion sécurisée.
      </p>

      <Button
        variant="login"
        size="lg"
        className="w-full"
        onClick={() =>
          getKeycloakInstance().login({
            redirectUri: window.location.origin + window.location.pathname,
          })
        }
      >
        Se connecter avec Keycloak
      </Button>

      <p className="text-center text-xs text-neutral-400 mt-4">
        Authentification sécurisée via SSO · PKCE
      </p>
    </div>
  );
}