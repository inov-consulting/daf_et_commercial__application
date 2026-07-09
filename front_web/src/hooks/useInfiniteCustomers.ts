'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchCustomers, resetCustomers } from '@/redux/features/customers/customersSlice';

const PAGE_SIZE = 20;

/**
 * Hook infinite scroll pour les clients transport.
 * L'API retourne un tableau filtré par `search`.
 * La pagination est gérée côté client : on révèle les items par tranches.
 */
export function useInfiniteCustomers(search = '') {
  const dispatch = useAppDispatch();
  const { items: allItems, loading, error } = useAppSelector(s => s.customers);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(resetCustomers());
      dispatch(fetchCustomers(search));
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadMore = useCallback(() => {
    if (loading || visibleCount >= allItems.length) return;
    setVisibleCount(c => c + PAGE_SIZE);
  }, [loading, visibleCount, allItems.length]);

  const items    = allItems.slice(0, visibleCount);
  const hasMore  = visibleCount < allItems.length;

  return { items, loading, hasMore, error, loadMore };
}
