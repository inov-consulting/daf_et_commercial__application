'use client';

import { useState, useMemo } from 'react';
import { MOCK_ACTIVITIES, type Activity } from '@/types/activity_type';
import { HistoriqueKpiRow } from '@/components/layout/historique-kpi-row';
import { HistoriqueFilterBar } from '@/components/layout/historique-filter-bar';
import { HistoriqueTable } from '@/components/layout/historique-table';
import { HistoriqueDrawer } from '@/components/layout/historique-drawer';

export default function HistoriquePage() {
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [user, setUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<Activity | null>(null);

  const filtered = useMemo(() => {
    return MOCK_ACTIVITIES.filter(a => {
      if (search && !a.action.toLowerCase().includes(search.toLowerCase()) && !a.data.toLowerCase().includes(search.toLowerCase())) return false;
      if (module && a.module !== module) return false;
      if (user && a.user !== user) return false;
      return true;
    });
  }, [search, module, user, dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-5 p-5 md:p-6 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold text-[var(--tx-1)] leading-tight">
            Historique des activités
          </h1>
          <p className="text-[13px] text-[var(--tx-3)] mt-0.5">
            Traçabilité complète des actions effectuées sur la plateforme
          </p>
        </div>
        <span className="text-[11px] font-mono text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-lg px-2.5 py-1 flex-shrink-0">
          {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* KPI row */}
      <HistoriqueKpiRow />

      {/* Filter bar */}
      <HistoriqueFilterBar
        search={search}
        module={module}
        user={user}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearch={setSearch}
        onModule={setModule}
        onUser={setUser}
        onDateFrom={setDateFrom}
        onDateTo={setDateTo}
      />

      {/* Table */}
      <HistoriqueTable activities={filtered} onSelect={setSelected} />

      {/* Detail drawer */}
      <HistoriqueDrawer activity={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
