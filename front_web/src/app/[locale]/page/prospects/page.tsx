'use client';

import { useMemo, useState } from 'react';
import {
  DownloadSimpleIcon, MagnifyingGlassIcon, FunnelIcon, PlusIcon, TableIcon, KanbanIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ProspectKanban } from '@/components/layout/prospect-kanban';
import { ProspectList } from '@/components/layout/prospect-list';
import {
  MOCK_PROSPECTS, PROSPECT_STATUSES, STATUS_CONFIG,
  type Prospect, type ProspectStatus,
} from '@/types/prospect_type';
import { cn } from '@/lib/utils';

type ViewMode = 'kanban' | 'list';
type TabFilter = ProspectStatus | 'tous';

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>(MOCK_PROSPECTS);
  const [view, setView] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<TabFilter>('tous');
  const [search, setSearch] = useState('');

  function moveProspect(id: string, newStatus: ProspectStatus) {
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
    );
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: prospects.length };
    PROSPECT_STATUSES.forEach((s) => {
      c[s] = prospects.filter((p) => p.status === s).length;
    });
    return c;
  }, [prospects]);

  const filtered = useMemo(() => {
    let result = prospects;
    if (activeTab !== 'tous') {
      result = result.filter((p) => p.status === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.company.toLowerCase().includes(q) ||
          p.contact.toLowerCase().includes(q) ||
          p.sector.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q),
      );
    }
    return result;
  }, [prospects, activeTab, search]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'tous', label: 'Tous', count: counts.tous },
    ...PROSPECT_STATUSES.map((s) => ({
      key: s as TabFilter,
      label: STATUS_CONFIG[s].label,
      count: counts[s],
    })),
  ];

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="p-4 sm:p-7 pb-16">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
            Prospects
          </h1>
          <p className="text-[var(--tx-3)] text-[12px] mt-0.5">
            Dashboard › Prospects{' '}
            <span className="mx-1 opacity-50">·</span>
            {dateStr}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="ghost" size="sm" className="flex-1 sm:flex-none gap-1.5">
            <DownloadSimpleIcon size={13} />
            <span className="hidden xs:inline">Exporter CSV</span>
            <span className="xs:hidden">CSV</span>
          </Button>
          <Button variant="gradient" size="sm" className="flex-1 sm:flex-none gap-1.5">
            <PlusIcon size={14} weight="bold" />
            <span className="hidden xs:inline">Nouveau prospect</span>
            <span className="xs:hidden">Nouveau</span>
          </Button>
        </div>
      </div>

      {/* ── Tab bar + search + view toggle ──────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        {/* Tab pills */}
        <div className="flex items-center gap-0.5 bg-[var(--bg-sink)] rounded-lg p-1 flex-wrap">
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-[5px] rounded-md text-[12px] font-medium transition-all duration-150 whitespace-nowrap',
                  active
                    ? 'bg-white text-[var(--tx-1)] shadow-xs font-semibold'
                    : 'text-[var(--tx-3)] hover:text-[var(--tx-2)]',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'text-[10px] font-bold min-w-[16px] text-center',
                    active ? 'text-primary-500' : 'text-[var(--tx-3)]',
                  )}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'h-8 pl-8 pr-3 rounded-lg border border-[var(--bd-def)] bg-white',
                'text-[13px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)]',
                'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
                'transition-colors w-44',
              )}
            />
          </div>

          {/* Filtres button */}
          <button className="h-8 px-3 rounded-lg border border-[var(--bd-def)] bg-white text-[12px] text-[var(--tx-2)] flex items-center gap-1.5 hover:bg-[var(--bg-sink)] transition-colors whitespace-nowrap">
            <FunnelIcon size={13} />
            Filtres
          </button>

          {/* View toggle */}
          <div className="flex items-center border border-[var(--bd-def)] rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setView('list')}
              title="Vue liste"
              className={cn(
                'h-8 w-8 flex items-center justify-center transition-colors',
                view === 'list'
                  ? 'bg-[var(--bg-sink)] text-primary-500'
                  : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-2)]',
              )}
            >
              <TableIcon size={15} />
            </button>
            <div className="w-px h-4 bg-[var(--bd-def)]" />
            <button
              onClick={() => setView('kanban')}
              title="Vue kanban"
              className={cn(
                'h-8 w-8 flex items-center justify-center transition-colors',
                view === 'kanban'
                  ? 'bg-[var(--bg-sink)] text-primary-500'
                  : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-2)]',
              )}
            >
              <KanbanIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Views ───────────────────────────────────────────── */}
      {view === 'kanban' ? (
        <ProspectKanban prospects={filtered} onMove={moveProspect} />
      ) : (
        <ProspectList prospects={filtered} />
      )}
    </div>
  );
}
