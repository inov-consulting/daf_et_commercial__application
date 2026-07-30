'use client';

import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/redux/store';
import { setCompanyContext } from '@/lib/ApiService';
import { setActiveCompany } from '@/redux/features/activeCompany/activeCompanySlice';

/**
 * Headless component — synchronise la compagnie active entre Redux et ApiService.
 * - Initialise `activeCompany.selectedId` sur la 1re compagnie du user dès que `me` est chargé.
 * - Propage chaque changement de `selectedId` vers `setCompanyContext` pour que toutes les
 *   requêtes API suivantes portent le bon header X-Company-Id.
 */
export function ApiContextSync() {
  const dispatch = useAppDispatch();
  const me = useAppSelector(s => s.me.me);
  const selectedId = useAppSelector(s => s.activeCompany.selectedId);

  // Initialise sur la 1re compagnie quand me est chargé et qu'aucune n'est encore sélectionnée
  useEffect(() => {
    const firstId = me?.companies?.[0]?.id ?? '';
    if (firstId && !selectedId) {
      dispatch(setActiveCompany(firstId));
    }
  }, [me, selectedId, dispatch]);

  // Propagation vers ApiService (header X-Company-Id)
  useEffect(() => {
    setCompanyContext(selectedId);
  }, [selectedId]);

  return null;
}
