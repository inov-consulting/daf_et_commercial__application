'use client';

import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, WarningCircleIcon, XCircleIcon } from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { setFilters, resetFilters } from '@/redux/features/api-logs/apiLogsSlice';
import { HTTP_METHODS } from '@/types/api_log_type';
import { cn } from '@/lib/utils';

const inp =
  'h-9 rounded-lg border border-[var(--bd-def)] bg-[var(--bg-surf)] text-[var(--tx-1)] text-[13px] px-3 outline-none transition-colors focus:border-[var(--p500)] focus:ring-2 focus:ring-[rgba(27,107,69,0.12)] placeholder:text-[var(--tx-3)]';

export function HistoriqueFilterBar() {
  const dispatch = useAppDispatch();
  const filters  = useAppSelector(s => s.apiLogs.filters);

  /* Debounce du champ chemin (path) */
  const [pathLocal, setPathLocal] = useState(filters.path);
  useEffect(() => {
    const t = setTimeout(() => {
      if (pathLocal !== filters.path) dispatch(setFilters({ path: pathLocal }));
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathLocal]);

  /* Sync si reset externe */
  useEffect(() => { setPathLocal(filters.path); }, [filters.path]);

  const hasActiveFilters =
    filters.method || filters.path || filters.status_code ||
    filters.is_error !== null || filters.date_from || filters.date_to;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-[var(--bd-def)] bg-[var(--bg-surf)]">
      <FunnelIcon size={15} className="text-[var(--tx-3)] flex-shrink-0" />

      {/* Recherche chemin */}
      <div className="relative flex-1 min-w-[180px]">
        <MagnifyingGlassIcon
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
        />
        <input
          value={pathLocal}
          onChange={e => setPathLocal(e.target.value)}
          placeholder="Filtrer par chemin…"
          className={`${inp} pl-7 w-full`}
        />
      </div>

      {/* Méthode HTTP */}
      <select
        value={filters.method}
        onChange={e => dispatch(setFilters({ method: e.target.value }))}
        className={`${inp} pr-7 cursor-pointer`}
        style={{ minWidth: 130 }}
      >
        <option value="">Toutes les méthodes</option>
        {HTTP_METHODS.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* Code statut */}
      <input
        type="number"
        min={100}
        max={599}
        value={filters.status_code}
        onChange={e => dispatch(setFilters({ status_code: e.target.value }))}
        placeholder="Code (ex: 500)"
        className={`${inp} w-36`}
      />

      {/* Erreurs uniquement */}
      <button
        type="button"
        onClick={() => dispatch(setFilters({ is_error: filters.is_error === true ? null : true }))}
        className={cn(
          'h-9 flex items-center gap-1.5 px-3 rounded-lg border text-[12px] font-medium transition-colors',
          filters.is_error === true
            ? 'border-red-300 bg-red-50 text-red-600'
            : 'border-[var(--bd-def)] bg-[var(--bg-surf)] text-[var(--tx-3)] hover:border-red-300 hover:text-red-500',
        )}
      >
        <WarningCircleIcon size={14} weight={filters.is_error === true ? 'fill' : 'regular'} />
        Erreurs uniquement
      </button>

      {/* Plage de dates */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[var(--tx-3)] font-medium whitespace-nowrap">Du</span>
        <input
          type="date"
          value={filters.date_from}
          onChange={e => dispatch(setFilters({ date_from: e.target.value }))}
          className={`${inp} w-36`}
        />
        <span className="text-[11px] text-[var(--tx-3)] font-medium whitespace-nowrap">Au</span>
        <input
          type="date"
          value={filters.date_to}
          onChange={e => dispatch(setFilters({ date_to: e.target.value }))}
          className={`${inp} w-36`}
        />
      </div>

      {/* Reset filtres */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => { dispatch(resetFilters()); setPathLocal(''); }}
          className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-[var(--bd-def)] text-[12px] text-[var(--tx-3)] hover:text-red-500 hover:border-red-300 transition-colors"
        >
          <XCircleIcon size={14} />
          Effacer
        </button>
      )}
    </div>
  );
}
