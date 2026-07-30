'use client';

import { useState, useEffect, useCallback } from 'react';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { ApiProspect, ProspectsListResponse } from '@/types/prospect_type';

export interface ProspectFilters {
  search?: string;
  status?: string;
  sector?: string;
}

export interface UseInfiniteProspectsResult {
  items: ApiProspect[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

const PAGE_SIZE = 20;

export function useInfiniteProspects(filters: ProspectFilters = {}): UseInfiniteProspectsResult {
  const [items, setItems]     = useState<ApiProspect[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const search = filters.search ?? '';
  const status = filters.status ?? '';
  const sector = filters.sector ?? '';

  /* Reset list when filters change */
  useEffect(() => {
    setItems([]);
    setPage(0);
    setTotal(0);
    setError(null);
  }, [search, status, sector]);

  /* Fetch the current page */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const qs = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (search) qs.set('search', search);
      if (status) qs.set('status', status);
      if (sector) qs.set('portalis_sector', sector);

      const res = await GetData<ProspectsListResponse>({
        url: `${ApiRoutes.PROSPECTS_LIST}?${qs}`,
        protected: true,
      });

      if (cancelled) return;
      setLoading(false);

      if (!res.ok || !res.data) {
        setError(res.error ?? 'Erreur de chargement');
        return;
      }

      const { items: newItems, total: t } = res.data;
      setTotal(t);
      setItems(prev => page === 0 ? newItems : [...prev, ...newItems]);
    })();

    return () => { cancelled = true; };
  }, [page, search, status, sector]);

  const loadMore = useCallback(() => {
    if (!loading && items.length < total) setPage(p => p + 1);
  }, [loading, items.length, total]);

  return { items, total, loading, error, hasMore: items.length < total, loadMore };
}
