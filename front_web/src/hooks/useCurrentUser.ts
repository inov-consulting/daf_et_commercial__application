'use client';

import { useAppSelector } from '@/redux/store';
import { mapApiUser } from '@/types/user_type';

/**
 * Retourne les informations de l'utilisateur connecté depuis le store Redux.
 * Le chargement est déclenché une fois dans DashboardShell au montage.
 */
export function useCurrentUser() {
  const { me, loading, error } = useAppSelector(state => state.me);

  return {
    user: me ? mapApiUser(me) : null,
    rawUser: me,
    loading,
    error,
    isLoaded: me !== null,
  };
}
