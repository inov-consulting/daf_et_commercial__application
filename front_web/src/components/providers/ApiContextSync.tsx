'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/redux/store';
import { setCompanyContext } from '@/lib/ApiService';
import { setActiveCompany } from '@/redux/features/activeCompany/activeCompanySlice';
import { resetProspects } from '@/redux/features/prospects/prospectsSlice';
import { resetDaf } from '@/redux/features/daf/dafSlice';
import { resetWhatsapp } from '@/redux/features/whatsapp/whatsappSlice';
import { resetKpi } from '@/redux/features/kpi/kpiSlice';
import { resetOffers } from '@/redux/features/offers/offersSlice';

/**
 * Headless component — synchronise la compagnie active entre Redux et ApiService.
 * - Initialise `activeCompany.selectedId` sur la 1re compagnie du user dès que `me` est chargé.
 * - Propage chaque changement de `selectedId` vers `setCompanyContext`.
 * - Vide tous les slices company-specific quand l'utilisateur change d'entreprise,
 *   ce qui force le re-fetch des données au prochain mount de chaque page.
 */
export function ApiContextSync() {
  const dispatch = useAppDispatch();
  const me = useAppSelector(s => s.me.me);
  const selectedId = useAppSelector(s => s.activeCompany.selectedId);
  const prevSelectedId = useRef<string>('');

  useEffect(() => {
    const firstId = me?.companies?.[0]?.id ?? '';
    if (firstId && !selectedId) {
      dispatch(setActiveCompany(firstId));
    }
  }, [me, selectedId, dispatch]);

  useEffect(() => {
    setCompanyContext(selectedId);

    // Reset all company-specific slices on company switch (skip initial '' → firstId transition)
    if (prevSelectedId.current && prevSelectedId.current !== selectedId && selectedId) {
      dispatch(resetProspects());
      dispatch(resetDaf());
      dispatch(resetWhatsapp());
      dispatch(resetKpi());
      dispatch(resetOffers());
    }
    prevSelectedId.current = selectedId;
  }, [selectedId, dispatch]);

  return null;
}
