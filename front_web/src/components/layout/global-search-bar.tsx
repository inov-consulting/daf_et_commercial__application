'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  CircleNotchIcon,
  UserFocusIcon,
  TruckIcon,
  TagIcon,
  FileTextIcon,
  ArrowRightIcon,
  XIcon,
} from '@phosphor-icons/react';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { SearchResponse, SearchResultItem, SearchResultType } from '@/types/search_type';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<SearchResultType, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  prospect: {
    label: 'Prospect',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
    Icon: UserFocusIcon,
  },
  transport: {
    label: 'Transport',
    color: '#1B6B45',
    bg: 'rgba(27,107,69,0.08)',
    Icon: TruckIcon,
  },
  offre: {
    label: 'Offre',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.08)',
    Icon: TagIcon,
  },
  compte_rendu: {
    label: 'Compte-rendu',
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.08)',
    Icon: FileTextIcon,
  },
};

function navToHref(item: SearchResultItem, locale: string): string {
  const { route, params } = item.nav;
  const id = params.id;
  switch (route) {
    case 'prospects.detail':         return `/${locale}/page/prospects/${id}`;
    case 'transport.mission.detail': return `/${locale}/page/transport/${id}`;
    case 'offre.detail':             return `/${locale}/page/offres/${id}`;
    case 'compte_rendu.detail':      return `/${locale}/page/comptes-rendus`;
    default:                         return '#';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface GlobalSearchBarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function GlobalSearchBar({ mobile = false, onClose }: GlobalSearchBarProps) {
  const [query, setQuery]           = useState('');
  const [response, setResponse]     = useState<SearchResponse | null>(null);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [dropPos, setDropPos]       = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted]       = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr';

  useEffect(() => { setMounted(true); }, []);

  // ⌘K / Ctrl+K focuses desktop search
  useEffect(() => {
    if (mobile) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobile]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResponse(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await GetData<SearchResponse>({
        url: `${ApiRoutes.SEARCH}?q=${encodeURIComponent(q.trim())}&limit=5`,
        protected: true,
      });
      if (res.ok && res.data) setResponse(res.data);
      else setResponse(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function updateDropPos() {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + 6, left: r.left, width: r.width });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setFocusedIdx(-1);
    if (!open) setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length === 0) { setResponse(null); setLoading(false); return; }
    debounceRef.current = setTimeout(() => search(q), 300);
  }

  function handleFocus() {
    updateDropPos();
    setOpen(true);
  }

  function handleNavigate(href: string) {
    setOpen(false);
    setQuery('');
    setResponse(null);
    router.push(href);
    onClose?.();
  }

  function clear() {
    setQuery('');
    setResponse(null);
    setOpen(false);
    setFocusedIdx(-1);
    inputRef.current?.focus();
  }

  // Keyboard navigation
  const results = response?.results ?? [];
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') { setOpen(false); onClose?.(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      handleNavigate(navToHref(results[focusedIdx], locale));
    } else if (e.key === 'Escape') {
      setOpen(false);
      onClose?.();
    }
  }

  const showDropdown = open && mounted && (query.trim().length >= 3 || loading);

  return (
    <div ref={containerRef} className={cn('relative w-full', mobile && 'px-0')}>
      {/* Input */}
      <div className="relative">
        {loading
          ? <CircleNotchIcon
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--p500)] animate-spin pointer-events-none"
            />
          : <MagnifyingGlassIcon
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
            />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={mobile ? 'Rechercher…' : 'Rechercher prospects, missions, documents…'}
          className={cn(
            'w-full h-9 pl-9 bg-[var(--bg-sink)] rounded-full text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] border border-transparent outline-none transition-all',
            query ? 'pr-8' : 'pr-11',
            'focus:border-[var(--bd-focus)] focus:bg-white',
          )}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
            aria-label="Effacer la recherche"
            tabIndex={-1}
          >
            <XIcon size={11} weight="bold" />
          </button>
        )}

        {/* ⌘K badge — desktop only, hidden when typing */}
        {!mobile && !query && (
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--tx-3)] bg-white border border-[var(--bd-def)] rounded px-1.5 py-0.5 font-mono hidden lg:block pointer-events-none">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown portal */}
      {showDropdown && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[299]"
            onClick={() => { setOpen(false); onClose?.(); }}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="fixed z-[300] bg-white rounded-2xl border border-[var(--bd-def)] shadow-[0_12px_48px_rgba(0,0,0,0.18)] overflow-hidden"
            style={{ top: dropPos.top, left: dropPos.left, width: Math.max(dropPos.width, 320) }}
          >
            {/* Loading */}
            {loading && !response && (
              <div className="flex items-center gap-2.5 px-4 py-4 text-[13px] text-[var(--tx-3)]">
                <CircleNotchIcon size={15} className="animate-spin text-[var(--p500)]" />
                Recherche en cours…
              </div>
            )}

            {/* No results */}
            {!loading && response && response.total === 0 && (
              <div className="px-4 py-5 text-center">
                <p className="text-[13px] font-medium text-[var(--tx-1)]">Aucun résultat</p>
                <p className="text-[11px] text-[var(--tx-3)] mt-0.5">pour « {response.query} »</p>
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <>
                <ul className="py-1.5 max-h-[360px] overflow-y-auto">
                  {results.map((item, idx) => {
                    const meta = TYPE_META[item.type] ?? TYPE_META.prospect;
                    const Icon = meta.Icon;
                    const href = navToHref(item, locale);
                    const isFocused = focusedIdx === idx;
                    return (
                      <li key={`${item.type}-${item.id}`}>
                        <button
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            isFocused ? 'bg-[var(--bg-sink)]' : 'hover:bg-[var(--bg-sink)]',
                          )}
                          onMouseEnter={() => setFocusedIdx(idx)}
                          onClick={() => handleNavigate(href)}
                        >
                          {/* Type icon badge */}
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: meta.bg }}
                          >
                            <Icon size={15} style={{ color: meta.color }} />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--tx-1)] truncate leading-tight">
                              {item.label}
                            </p>
                            {item.subtitle && (
                              <p className="text-[11px] text-[var(--tx-3)] truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>

                          {/* Type badge */}
                          <span
                            className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: meta.color, background: meta.bg }}
                          >
                            {meta.label}
                          </span>

                          {/* Arrow on focus */}
                          {isFocused && (
                            <ArrowRightIcon size={13} className="flex-shrink-0 text-[var(--tx-3)]" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-[var(--bd-def)] flex items-center justify-between">
                  <p className="text-[11px] text-[var(--tx-3)]">
                    {response?.total ?? 0} résultat{(response?.total ?? 0) > 1 ? 's' : ''} pour « {response?.query ?? query} »
                  </p>
                  <span className="text-[10px] text-[var(--tx-3)] font-mono">↑↓ Naviguer · ↵ Ouvrir</span>
                </div>
              </>
            )}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
