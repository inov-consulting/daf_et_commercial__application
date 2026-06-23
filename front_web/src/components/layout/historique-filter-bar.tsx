'use client';

import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, WarningCircleIcon, XCircleIcon, XIcon } from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { setFilters, resetFilters } from '@/redux/features/api-logs/apiLogsSlice';
import { HTTP_METHODS } from '@/types/api_log_type';
import { cn } from '@/lib/utils';

const HTTP_STATUS_CODES = [
  {
    group: 'Succès (2xx)', codes: [
      { value: '200', label: '200 - OK' },
      { value: '201', label: '201 - Created' },
      { value: '204', label: '204 - No Content' },
    ]
  },
  {
    group: 'Erreur client (4xx)', codes: [
      { value: '400', label: '400 - Bad Request' },
      { value: '401', label: '401 - Unauthorized' },
      { value: '403', label: '403 - Forbidden' },
      { value: '404', label: '404 - Not Found' },
      { value: '409', label: '409 - Conflict' },
      { value: '422', label: '422 - Unprocessable Entity' },
      { value: '429', label: '429 - Too Many Requests' },
    ]
  },
  {
    group: 'Erreur serveur (5xx)', codes: [
      { value: '500', label: '500 - Internal Server Error' },
      { value: '502', label: '502 - Bad Gateway' },
      { value: '503', label: '503 - Service Unavailable' },
      { value: '504', label: '504 - Gateway Timeout' },
    ]
  },
];

const inp =
  'h-9 rounded-lg border border-[var(--bd-def)] bg-[var(--bg-surf)] text-[var(--tx-1)] text-[13px] px-3 outline-none transition-colors focus:border-[var(--p500)] focus:ring-2 focus:ring-[rgba(27,107,69,0.12)] placeholder:text-[var(--tx-3)]';

export function HistoriqueFilterBar() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(s => s.apiLogs.filters);

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
          className={`${inp} pl-7 pr-8 w-full`}
        />
        {pathLocal && (
          <button
            onClick={() => setPathLocal('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--tx-3)] hover:text-[var(--tx-2)] transition-colors z-10 p-0.5 rounded hover:bg-[var(--bg-sink)]"
            aria-label="Effacer la recherche"
          >
            <XIcon size={12} />
          </button>
        )}
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
      <select
        value={filters.status_code}
        onChange={e => dispatch(setFilters({ status_code: e.target.value }))}
        className={`${inp} pr-7 cursor-pointer`}
        style={{ minWidth: 150 }}
      >
        <option value="">Tous les statuts</option>
        {HTTP_STATUS_CODES.map(group => (
          <optgroup key={group.group} label={group.group}>
            {group.codes.map(code => (
              <option key={code.value} value={code.value}>
                {code.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

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