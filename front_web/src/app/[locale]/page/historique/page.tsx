'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchApiLogs, setOffset } from '@/redux/features/api-logs/apiLogsSlice';
import { type ApiLog } from '@/types/api_log_type';
import { HistoriqueKpiRow } from '@/components/layout/historique-kpi-row';
import { HistoriqueFilterBar } from '@/components/layout/historique-filter-bar';
import { HistoriqueTable } from '@/components/layout/historique-table';
import { HistoriqueDrawer } from '@/components/layout/historique-drawer';

export default function HistoriquePage() {
  const dispatch = useAppDispatch();
  const { items, total, loading, filters } = useAppSelector(s => s.apiLogs);
  const [selected, setSelected] = useState<ApiLog | null>(null);

  /* Relance le fetch à chaque changement de filtre */
  useEffect(() => {
    dispatch(fetchApiLogs(filters));
  }, [dispatch, filters]);

  const totalPages  = Math.max(1, Math.ceil(total / filters.limit));
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const startIdx    = filters.offset + 1;
  const endIdx      = Math.min(filters.offset + filters.limit, total);

  return (
    <div className="flex flex-col gap-5 p-5 md:p-6 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold text-[var(--tx-1)] leading-tight">
            Historique des activités
          </h1>
          <p className="text-[13px] text-[var(--tx-3)] mt-0.5">
            Traçabilité complète des appels API effectuées sur la plateforme
          </p>
        </div>
        <span className="text-[11px] font-mono text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-lg px-2.5 py-1 flex-shrink-0">
          {loading ? '…' : `${total} entrée${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* KPI row */}
      <HistoriqueKpiRow />

      {/* Filter bar */}
      <HistoriqueFilterBar />

      {/* Table */}
      <HistoriqueTable logs={items} loading={loading} onSelect={setSelected} />

      {/* Pagination */}
      {total > filters.limit && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
          <p className="text-xs text-[var(--tx-3)]">
            Affichage{' '}
            <span className="font-medium text-[var(--tx-2)]">{total === 0 ? 0 : startIdx}–{endIdx}</span>
            {' '}sur{' '}
            <span className="font-medium text-[var(--tx-2)]">{total}</span> entrées
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={filters.offset === 0}
              onClick={() => dispatch(setOffset(Math.max(0, filters.offset - filters.limit)))}
              className="h-7 px-3 rounded-lg text-xs text-[var(--tx-2)] border border-[var(--bd-def)] bg-white disabled:opacity-40 hover:bg-[var(--bg-sink)] transition-colors"
            >
              ← Préc.
            </button>
            <span className="text-[11px] text-[var(--tx-3)] px-1">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={filters.offset + filters.limit >= total}
              onClick={() => dispatch(setOffset(filters.offset + filters.limit))}
              className="h-7 px-3 rounded-lg text-xs text-[var(--tx-2)] border border-[var(--bd-def)] bg-white disabled:opacity-40 hover:bg-[var(--bg-sink)] transition-colors"
            >
              Suiv. →
            </button>
          </div>
        </div>
      )}

      {/* Drawer détail */}
      <HistoriqueDrawer log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
