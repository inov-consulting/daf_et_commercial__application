'use client';

import { MagnifyingGlassIcon, FunnelIcon } from '@phosphor-icons/react';
import { ACTIVITY_MODULES, type ActivityModule } from '@/types/activity_type';

const USERS = ['Tous les utilisateurs', 'Saurel Ndiaye', 'Aminata Sow', 'Fatou Diallo', 'Kofi Mensah', 'Système'];

interface HistoriqueFilterBarProps {
  search: string;
  module: string;
  user: string;
  dateFrom: string;
  dateTo: string;
  onSearch: (v: string) => void;
  onModule: (v: string) => void;
  onUser: (v: string) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
}

const inp =
  'h-9 rounded-lg border border-[var(--bd-def)] bg-[var(--bg-surf)] text-[var(--tx-1)] text-[13px] px-3 outline-none transition-colors focus:border-[var(--p500)] focus:ring-2 focus:ring-[rgba(27,107,69,0.12)] placeholder:text-[var(--tx-3)]';

export function HistoriqueFilterBar({
  search, module, user, dateFrom, dateTo,
  onSearch, onModule, onUser, onDateFrom, onDateTo,
}: HistoriqueFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-[var(--bd-def)] bg-[var(--bg-surf)]">
      <FunnelIcon size={15} className="text-[var(--tx-3)] flex-shrink-0" />

      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <MagnifyingGlassIcon
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
        />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Rechercher une action…"
          className={`${inp} pl-7 w-full`}
        />
      </div>

      {/* Module */}
      <select
        value={module}
        onChange={e => onModule(e.target.value)}
        className={`${inp} pr-7 cursor-pointer`}
        style={{ minWidth: 150 }}
      >
        <option value="">Tous les modules</option>
        {ACTIVITY_MODULES.map((m: ActivityModule) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* User */}
      <select
        value={user}
        onChange={e => onUser(e.target.value)}
        className={`${inp} pr-7 cursor-pointer`}
        style={{ minWidth: 160 }}
      >
        {USERS.map(u => (
          <option key={u} value={u === 'Tous les utilisateurs' ? '' : u}>{u}</option>
        ))}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[var(--tx-3)] font-medium">Du</span>
        <input
          type="date"
          value={dateFrom}
          onChange={e => onDateFrom(e.target.value)}
          className={`${inp} w-36`}
        />
        <span className="text-[11px] text-[var(--tx-3)] font-medium">Au</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => onDateTo(e.target.value)}
          className={`${inp} w-36`}
        />
      </div>
    </div>
  );
}
