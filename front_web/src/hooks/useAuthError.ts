'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { clearTokens } from '@/lib/keycloak';

const AUTH_ERROR_PATTERNS = ['not authenticated', 'not_authenticated', 'unauthorized', '401'];

function isAuthError(error: string | null): boolean {
  if (!error) return false;
  return AUTH_ERROR_PATTERNS.some(p => error.toLowerCase().includes(p));
}

/**
 * Surveille une ou plusieurs erreurs API. Si l'une d'elles indique une session
 * expirée / non authentifiée, efface les tokens et redirige vers le login.
 */
export function useAuthError(...errors: (string | null)[]) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'fr';

  useEffect(() => {
    const triggered = errors.find(isAuthError);
    if (!triggered) return;
    clearTokens();
    router.replace(`/${locale}/auth/login?reason=session_expired`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors.join('|'), locale, router]);
}
