'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Identique à useState<T> mais persiste la valeur dans localStorage.
 * La valeur est restaurée au montage et effacée quand elle repasse à null/undefined.
 * Compatible SSR/Next.js : l'accès à localStorage est différé au premier useEffect.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue);

  // Restauration au montage (côté client uniquement)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) setState(JSON.parse(saved) as T);
    } catch {
      // valeur corrompue → ignorer
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setPersisted = useCallback(
    (value: T) => {
      setState(value);
      try {
        if (value === null || value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } catch {
        // quota dépassé ou mode privé → continuer sans persistance
      }
    },
    [key],
  );

  return [state, setPersisted];
}
