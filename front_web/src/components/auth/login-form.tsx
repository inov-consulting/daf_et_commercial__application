'use client';

import { useEffect, useState } from 'react';
import { getKeycloakInstance } from '@/lib/keycloak';
import { Button } from '@/components/ui/button';
<<<<<<< Updated upstream
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

/* ── Minimal icons (no icon library dependency) ──────────────────────── */

function IconEnvelope() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────────────── */
=======
>>>>>>> Stashed changes

interface LoginFormProps {
  locale: string;
}

export default function LoginForm({ locale }: LoginFormProps) {
  const [ready, setReady] = useState(false);

<<<<<<< Updated upstream
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const tokens = await loginWithCredentials(email, password);
      storeTokens(tokens, rememberMe);
      router.push(`/${locale}`);
    } catch {
      setError('Adresse email ou mot de passe incorrect.');
    } finally {
      setIsLoading(false);
=======
  useEffect(() => {
    // clientLayout.tsx gère l'init Keycloak et la redirection automatique.
    // Cette page n'est visible que si l'utilisateur y navigue manuellement
    // ou si l'init Keycloak n'a pas encore tourné.
    setReady(true);

    const kc = getKeycloakInstance();
    if (!kc.authenticated) {
      kc.login({
        redirectUri: window.location.origin,
      });
>>>>>>> Stashed changes
    }
  }, [locale]);

  const inputState = error ? 'error' as const : 'default' as const;

  return (
    <div className="text-center">
      {!ready ? (
        <>
          <div className="w-8 h-8 border-[2.5px] border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Chargement…</p>
        </>
      ) : (
        <>
          <div className="mb-7 text-left">
            <h1 className="font-display font-bold text-[1.875rem] leading-tight text-neutral-900">
              Connexion
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Tableau de bord PortaLis</p>
          </div>

<<<<<<< Updated upstream
      {/* Email */}
      <div className="mb-4">
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          label="Adresse email"
          placeholder="vous@exemple.com"
          state={inputState}
          iconLeft={<IconEnvelope />}
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* Password */}
      <div className="mb-2">
        <Input
          id="login-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          label="Mot de passe"
          state={inputState}
          errorMessage={error ?? undefined}
          iconRight={showPassword ? <IconEyeOff /> : <IconEye />}
          iconRightAction={() => setShowPassword(v => !v)}
          iconRightAriaLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* Remember me + Forgot password */}
      <div className="flex items-center justify-between mt-4 mb-6">
        <Checkbox
          label="Rester connecté 7 jours"
          checked={rememberMe}
          onChange={e => setRememberMe(e.target.checked)}
          disabled={isLoading}
        />
        <a
          href="#"
          className="text-sm font-medium text-primary-500 hover:underline whitespace-nowrap ml-4"
        >
          Mot de passe oublié ?
        </a>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="login"
        size="lg"
        loading={isLoading}
        disabled={!email || !password}
        className="w-full"
      >
        {isLoading ? '' : 'Se connecter'}
      </Button>

      {/* Session footnote */}
      <p className="text-center text-xs text-neutral-400 mt-4">
        Session expire après 30 min d&apos;inactivité
      </p>
    </form>
=======
          <p className="text-sm text-neutral-500 mb-6">
            Vous allez être redirigé vers la page de connexion sécurisée.
          </p>

          <Button
            variant="login"
            size="lg"
            className="w-full"
            onClick={() =>
              getKeycloakInstance().login({
                redirectUri: window.location.origin,
              })
            }
          >
            Se connecter avec Keycloak
          </Button>

          <p className="text-center text-xs text-neutral-400 mt-4">
            Authentification sécurisée via SSO · PKCE
          </p>
        </>
      )}
    </div>
>>>>>>> Stashed changes
  );
}
