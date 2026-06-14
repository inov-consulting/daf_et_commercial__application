'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  DownloadSimpleIcon, MagnifyingGlassIcon, FunnelIcon, PlusIcon,
  TableIcon, KanbanIcon, ArrowsClockwiseIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ProspectKanban } from '@/components/layout/prospect-kanban';
import { ProspectList, type SortKey } from '@/components/layout/prospect-list';
import { ProspectFormModal } from '@/components/layout/prospect-form-modal';
import {
  PROSPECT_STATUSES, STATUS_CONFIG, STATUS_TO_ACTION,
  apiProspectToUi,
  type ProspectStatus, type ApiProspect, type UpdateProspectBody,
} from '@/types/prospect_type';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchProspects, createProspect, updateProspect,
  executeProspectAction, syncProspects,
} from '@/redux/features/prospects/prospectsSlice';

type ViewMode  = 'kanban' | 'list';
type TabFilter = ProspectStatus | 'tous';

// Map SortKey (UI) → nom de champ API
const SORT_FIELD: Record<SortKey, string> = {
  company:  'company_name',
  pipeline: 'expected_revenue',
  age:      'pipeline_age_days',
};

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function ProspectsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  // ── Redux state ──
  const apiProspects = useAppSelector(s => s.prospects.list);
  const byStatus     = useAppSelector(s => s.prospects.byStatus);
  const total        = useAppSelector(s => s.prospects.total);
  const loading      = useAppSelector(s => s.prospects.loading);
  const error        = useAppSelector(s => s.prospects.error);
  const syncing      = useAppSelector(s => s.prospects.syncing);
  const creating     = useAppSelector(s => s.prospects.creating);
  const createError  = useAppSelector(s => s.prospects.createError);
  const updating     = useAppSelector(s => s.prospects.updating);
  const updateError  = useAppSelector(s => s.prospects.updateError);

  // ── UI state ──
  const [view, setView]           = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<TabFilter>('tous');
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(20);
  const [sortBy, setSortBy]       = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [modal, setModal]         = useState<{
    open: boolean; mode: 'create' | 'edit'; prospect?: ApiProspect;
  }>({ open: false, mode: 'create' });

  // ── Debounce search → reset page ──
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch serveur sur chaque changement de filtre / pagination / tri ──
  useEffect(() => {
    dispatch(fetchProspects({
      status:     activeTab !== 'tous' ? activeTab : undefined,
      search:     debouncedSearch || undefined,
      sort_by:    sortBy ? SORT_FIELD[sortBy] : undefined,
      sort_order: sortBy ? sortOrder : undefined,
      limit:      pageSize,
      offset:     (page - 1) * pageSize,
    }));
  }, [dispatch, activeTab, debouncedSearch, page, pageSize, sortBy, sortOrder]);

  // Params courants (pour re-fetch après create/update)
  function currentParams() {
    return {
      status:     activeTab !== 'tous' ? activeTab : undefined,
      search:     debouncedSearch || undefined,
      sort_by:    sortBy ? SORT_FIELD[sortBy] : undefined,
      sort_order: sortBy ? sortOrder : undefined,
      limit:      pageSize,
      offset:     (page - 1) * pageSize,
    };
  }

  // ── Handlers ──
  function handleTabChange(tab: TabFilter) {
    setActiveTab(tab);
    setPage(1);
  }

  function handleSort(col: SortKey) {
    const newOrder = sortBy === col ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortBy(col);
    setSortOrder(newOrder);
    setPage(1);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  // ── Sync Odoo ──
  async function triggerSync() {
    await dispatch(syncProspects()).unwrap().catch(() => null);
    dispatch(fetchProspects(currentParams()));
  }

  // ── Kanban drag → Execute Action ──
  function moveProspect(id: string, newStatus: ProspectStatus) {
    const action = STATUS_TO_ACTION[newStatus];
    if (!action) return;
    dispatch(executeProspectAction({ id, action }));
  }

  // ── Create ou Update ──
  async function saveProspect(body: UpdateProspectBody) {
    if (modal.mode === 'create') {
      const result = await dispatch(createProspect(body));
      if (createProspect.fulfilled.match(result)) {
        setModal(m => ({ ...m, open: false }));
        dispatch(fetchProspects(currentParams()));
      }
    } else {
      const id = modal.prospect!.id;
      const result = await dispatch(updateProspect({ id, body }));
      if (updateProspect.fulfilled.match(result)) {
        setModal(m => ({ ...m, open: false }));
        dispatch(fetchProspects(currentParams()));
      }
    }
  }

  // ── Derived ──
  const prospects = useMemo(() => apiProspects.map(apiProspectToUi), [apiProspects]);

  // Pour le kanban, filtrage client par search (la liste est déjà filtrée par status côté serveur)
  const kanbanProspects = useMemo(() => {
    if (!debouncedSearch) return prospects;
    const q = debouncedSearch.toLowerCase();
    return prospects.filter(p =>
      p.company.toLowerCase().includes(q) ||
      p.contact.toLowerCase().includes(q) ||
      p.sector.toLowerCase().includes(q),
    );
  }, [prospects, debouncedSearch]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: total };
    PROSPECT_STATUSES.forEach(s => { c[s] = byStatus[s] ?? 0; });
    return c;
  }, [total, byStatus]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'tous', label: 'Tous', count: counts.tous },
    ...PROSPECT_STATUSES.map(s => ({
      key: s as TabFilter,
      label: STATUS_CONFIG[s].label,
      count: counts[s],
    })),
  ];

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const modalSaving = modal.mode === 'create' ? creating : updating;
  const modalError  = modal.mode === 'create' ? createError : updateError;

  return (
    <div className="p-4 sm:p-7 pb-16">

      <ProspectFormModal
        open={modal.open}
        mode={modal.mode}
        initial={modal.prospect}
        saving={modalSaving}
        serverError={modalError}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        onSave={saveProspect}
      />

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
            Prospects
          </h1>
          <p className="text-[var(--tx-3)] text-[12px] mt-0.5">
            Dashboard › Prospects <span className="mx-1 opacity-50">·</span>{dateStr}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={triggerSync}
            disabled={syncing || loading}
            title="Synchroniser avec Odoo"
            className="h-8 px-3 rounded-lg border border-[var(--bd-def)] bg-white text-[12px] text-[var(--tx-2)] flex items-center gap-1.5 hover:bg-[var(--bg-sink)] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <ArrowsClockwiseIcon size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync…' : 'Sync Odoo'}
          </button>
          <Button variant="ghost" size="sm" className="flex-1 sm:flex-none gap-1.5">
            <DownloadSimpleIcon size={13} />
            <span className="hidden xs:inline">Exporter CSV</span>
            <span className="xs:hidden">CSV</span>
          </Button>
          <Button
            variant="gradient" size="sm" className="flex-1 sm:flex-none gap-1.5"
            onClick={() => setModal({ open: true, mode: 'create', prospect: undefined })}
          >
            <PlusIcon size={14} weight="bold" />
            <span className="hidden xs:inline">Nouveau prospect</span>
            <span className="xs:hidden">Nouveau</span>
          </Button>
        </div>
      </div>

      {/* ── Tab bar + search + view toggle ──────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        {/* Tabs */}
        <div className="flex items-center gap-0.5 bg-[var(--bg-sink)] rounded-lg p-1 flex-wrap">
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-[5px] rounded-md text-[12px] font-medium transition-all duration-150 whitespace-nowrap',
                  active ? 'bg-white text-[var(--tx-1)] shadow-xs font-semibold' : 'text-[var(--tx-3)] hover:text-[var(--tx-2)]',
                )}
              >
                {t.label}
                <span className={cn('text-[10px] font-bold min-w-[16px] text-center', active ? 'text-primary-500' : 'text-[var(--tx-3)]')}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none" />
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

          <button className="h-8 px-3 rounded-lg border border-[var(--bd-def)] bg-white text-[12px] text-[var(--tx-2)] flex items-center gap-1.5 hover:bg-[var(--bg-sink)] transition-colors whitespace-nowrap">
            <FunnelIcon size={13} />
            Filtres
          </button>

          {/* View toggle */}
          <div className="flex items-center border border-[var(--bd-def)] rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setView('list')} title="Vue liste"
              className={cn('h-8 w-8 flex items-center justify-center transition-colors', view === 'list' ? 'bg-[var(--bg-sink)] text-primary-500' : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-2)]')}
            >
              <TableIcon size={15} />
            </button>
            <div className="w-px h-4 bg-[var(--bd-def)]" />
            <button
              onClick={() => setView('kanban')} title="Vue kanban"
              className={cn('h-8 w-8 flex items-center justify-center transition-colors', view === 'kanban' ? 'bg-[var(--bg-sink)] text-primary-500' : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-2)]')}
            >
              <KanbanIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {loading && prospects.length === 0 ? (
        <div className="flex items-center justify-center py-24 gap-3 text-[var(--tx-3)]">
          <span className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-sm">Chargement des prospects…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => dispatch(fetchProspects(currentParams()))}
            className="h-8 px-4 rounded-lg border border-[var(--bd-def)] text-sm text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : view === 'kanban' ? (
        <ProspectKanban
          prospects={kanbanProspects}
          onMove={moveProspect}
          canMoveToStatus={(_, __, toStatus) => toStatus !== 'nouveau'}
        />
      ) : (
        <div className={cn('transition-opacity duration-150', loading && 'opacity-60 pointer-events-none')}>
          <ProspectList
            prospects={prospects}
            total={total}
            page={page}
            pageSize={pageSize}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            onSort={handleSort}
            onDetail={(id) => router.push(`/${locale}/page/prospects/${id}`)}
            onEdit={(id) => {
              const p = apiProspects.find(a => a.id === id);
              if (p) setModal({ open: true, mode: 'edit', prospect: p });
            }}
          />
        </div>
      )}
    </div>
  );
}
