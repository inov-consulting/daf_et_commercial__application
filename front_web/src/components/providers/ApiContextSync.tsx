'use client';

import { useEffect } from 'react';
import { useAppSelector } from '@/redux/store';
import { setCompanyContext } from '@/lib/ApiService';

/**
 * Synchronise les compagnies de l'utilisateur connecté vers ApiService.
 * Doit être monté à l'intérieur du ReduxProvider.
 * Ne rend rien — effet de bord uniquement.
 */
export function ApiContextSync() {
  const me = useAppSelector(s => s.me.me);

  useEffect(() => {
    setCompanyContext(me?.companies?.[0]?.id ?? '');
  }, [me]);

  return null;
}
