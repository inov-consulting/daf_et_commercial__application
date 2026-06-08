'use client';

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchCompanies, resetCompanies } from '@/redux/features/companies/companiesSlice';

/**
 * Hook infinite scroll pour la liste des entreprises.
 * - Réinitialise et recharge au changement de `search`
 * - `loadMore()` charge la page suivante (append)
 */
export function useInfiniteCompanies(search = '') {
  const dispatch = useAppDispatch();
  const { items, loading, hasMore, error } = useAppSelector(state => state.companies);

  useEffect(() => {
    dispatch(resetCompanies());
    dispatch(fetchCompanies({ offset: 0, search }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    dispatch(fetchCompanies({ offset: items.length, search }));
  }, [dispatch, loading, hasMore, items.length, search]);

  return { items, loading, hasMore, error, loadMore };
}
