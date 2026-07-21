'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BuildingsIcon, MagnifyingGlassIcon, CircleNotchIcon, XIcon } from '@phosphor-icons/react';
import { useInfiniteCustomers } from '@/hooks/useInfiniteCustomers';
import type { CustomerItem } from '@/redux/features/customers/customersSlice';

interface CustomerSelectProps {
  value: string;
  partnerId: number | null;
  onChange: (name: string, partnerId: number | null) => void;
  placeholder?: string;
}

export function CustomerSelect({
  value,
  partnerId,
  onChange,
  placeholder = 'Rechercher une entreprise…',
}: CustomerSelectProps) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const containerRef        = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);
  const sentinelRef         = useRef<HTMLDivElement>(null);

  const { items, loading, hasMore, loadMore } = useInfiniteCustomers(search);

  /* IntersectionObserver pour infinite scroll */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  /* Fermer au clic extérieur */
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  /* Fermer à Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setSearch(''); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSelect = useCallback((item: CustomerItem) => {
    onChange(item.name, item.id);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
  }, [onChange]);

  const hasValue = !!value && !!partnerId;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full h-10 border rounded-lg pl-8 pr-8 text-[13px] text-left outline-none transition-colors flex items-center ${
          hasValue
            ? 'border-primary-300 bg-primary-50 text-gray-900'
            : 'border-gray-200 bg-white text-gray-400'
        }`}
      >
        <BuildingsIcon
          size={15}
          weight="fill"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <span className={`truncate ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>
          {value || placeholder}
        </span>
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon size={13} />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <MagnifyingGlassIcon
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full h-8 border border-gray-200 rounded-lg pl-7 pr-3 text-[12px] text-gray-900 outline-none focus:border-primary-300"
              />
            </div>
          </div>

          {/* Liste */}
          <div className="overflow-y-auto max-h-52">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-gray-400">
                <CircleNotchIcon size={14} className="animate-spin" />
                Chargement…
              </div>
            ) : items.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-gray-400">
                {search ? 'Aucun résultat' : 'Tapez pour rechercher'}
              </div>
            ) : (
              <>
                {items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full px-3 py-2.5 text-left hover:bg-primary-50 transition-colors border-b border-gray-50 last:border-0 flex flex-col gap-0.5"
                  >
                    <span className="text-[13px] font-medium text-gray-900 truncate">{item.name}</span>
                    {item.email && (
                      <span className="text-[11px] text-gray-400 truncate">{item.email}</span>
                    )}
                  </button>
                ))}

                {/* Sentinel pour infinite scroll */}
                <div ref={sentinelRef} className="h-1" />

                {loading && hasMore && (
                  <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-gray-400">
                    <CircleNotchIcon size={12} className="animate-spin" />
                    Chargement…
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
