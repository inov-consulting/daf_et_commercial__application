'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  DownloadSimpleIcon, MagnifyingGlassIcon, FunnelIcon, PlusIcon,
  TableIcon, KanbanIcon, ArrowsClockwiseIcon, XIcon
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
import { exportListToCsv, type ExportCsvColumn } from '@/lib/exportCsv';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchProspects, createProspect, updateProspect,
  executeProspectAction, syncProspects, deleteProspect,
} from '@/redux/features/prospects/prospectsSlice';

type ViewMode = 'kanban' | 'list';
type TabFilter = ProspectStatus | 'tous';

// Map SortKey (UI) → nom de champ API
const SORT_FIELD: Record<SortKey, string> = {
  company: 'company_name',
  pipeline: 'expected_revenue',
  age: 'pipeline_age_days',
};

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function ProspectsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  // ── Redux state ──
  const apiProspects = useAppSelector(s => s.prospects.list);
  const byStatus = useAppSelector(s => s.prospects.byStatus);
  const total = useAppSelector(s => s.prospects.total);
  const loading = useAppSelector(s => s.prospects.loading);
  const error = useAppSelector(s => s.prospects.error);
  const syncing = useAppSelector(s => s.prospects.syncing);
  const creating = useAppSelector(s => s.prospects.creating);
  const createError = useAppSelector(s => s.prospects.createError);
  const updating = useAppSelector(s => s.prospects.updating);
  const updateError = useAppSelector(s => s.prospects.updateError);

  // ── UI state ──
  const [view, setView] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<TabFilter>('tous');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [globalTotal, setGlobalTotal] = useState(total);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [modal, setModal] = useState<{
    open: boolean; mode: 'create' | 'edit'; prospect?: ApiProspect;
  }>({ open: false, mode: 'create' });
  const [exporting, setExporting] = useState(false);

  const PROSPECTS_COLUMNS: ExportCsvColumn<ApiProspect>[] = [
    { header: 'Entreprise',       value: r => r.company_name },
    { header: 'Contact',          value: r => r.contact_name },
    { header: 'Email',            value: r => r.email },
    { header: 'Téléphone',        value: r => r.phone },
    { header: 'Statut',           value: r => r.status_label },
    { header: 'Secteur',          value: r => r.portalis_sector },
    { header: 'Responsable',      value: r => r.assigned_to_name ?? '' },
    { header: 'Équipe',           value: r => r.team_name ?? '' },
    { header: 'CA prévisionnel',  value: r => r.expected_revenue },
    { header: 'Probabilité (%)',  value: r => r.probability ?? '' },
    { header: 'Âge pipeline (j)', value: r => r.pipeline_age_days },
    { header: 'Créé le',          value: r => r.created_at },
  ];

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await exportListToCsv<ApiProspect>({
        url: ApiRoutes.PROSPECTS_LIST,
        filters: {
          ...(activeTab !== 'tous' ? { status: activeTab } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(sortBy ? { sort_by: SORT_FIELD[sortBy], sort_order: sortOrder } : {}),
        },
        columns: PROSPECTS_COLUMNS,
        filename: `prospects-${today}.csv`,
      });
    } finally {
      setExporting(false);
    }
  };

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
      status: activeTab !== 'tous' ? activeTab : undefined,
      search: debouncedSearch || undefined,
      sort_by: sortBy ? SORT_FIELD[sortBy] : undefined,
      sort_order: sortBy ? sortOrder : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }));
  }, [dispatch, activeTab, debouncedSearch, page, pageSize, sortBy, sortOrder]);

  // Params courants (pour re-fetch après create/update)
  function currentParams() {
    return {
      status: activeTab !== 'tous' ? activeTab : undefined,
      search: debouncedSearch || undefined,
      sort_by: sortBy ? SORT_FIELD[sortBy] : undefined,
      sort_order: sortBy ? sortOrder : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
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

  // Mettre à jour globalTotal uniquement quand on est sur l'onglet "tous"
  useEffect(() => {
    if (activeTab === 'tous') {
      setGlobalTotal(total);
    }
  }, [activeTab, total]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: globalTotal };
    PROSPECT_STATUSES.forEach(s => { c[s] = byStatus[s] ?? 0; });
    return c;
  }, [globalTotal, byStatus]);

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
  const modalError = modal.mode === 'create' ? createError : updateError;

  return (
    <div className="p-3 sm:p-5 md:p-7 pb-16 w-full max-w-full overflow-auto">

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-5 gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl md:text-[26px] font-bold text-foreground tracking-tight leading-tight truncate">
            Prospections
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={triggerSync}
            disabled={syncing || loading}
            title="Synchroniser avec Odoo"
            className="h-8 px-2.5 sm:px-3 rounded-lg border border-[var(--bd-def)] bg-white text-[11px] sm:text-[12px] text-[var(--tx-2)] flex items-center gap-1 sm:gap-1.5 hover:bg-[var(--bg-sink)] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <ArrowsClockwiseIcon size={12} className={syncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{syncing ? 'Sync…' : 'Sync Odoo'}</span>
            <span className="sm:hidden">Sync</span>
          </button>
          <Button variant="ghost" size="sm" className="flex-1 sm:flex-none gap-1 sm:gap-1.5 h-8 text-[11px] sm:text-[12px]" onClick={handleExportCsv} disabled={exporting || loading}>
            <DownloadSimpleIcon size={13} className={exporting ? 'animate-pulse' : ''} />
            <span className="hidden xs:inline">{exporting ? 'Export…' : 'Exporter CSV'}</span>
            <span className="xs:hidden">CSV</span>
          </Button>
          <Button
            variant="gradient" size="sm"
            className="flex-1 sm:flex-none gap-1 sm:gap-1.5 h-8 text-[11px] sm:text-[12px]"
            onClick={() => setModal({ open: true, mode: 'create' })}
          >
            <PlusIcon size={14} weight="bold" />
            <span className="hidden xs:inline">Nouvelle prospection</span>
            <span className="xs:hidden">Nouveau</span>
          </Button>
        </div>
      </div>

      {/* ── Tab bar + search + view toggle ──────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 sm:mb-5">
        {/* Tabs — masqués en vue kanban (les colonnes représentent déjà chaque statut) */}
        {view === 'list' && (
          <div className="flex items-center gap-0.5 bg-[var(--bg-sink)] rounded-lg p-1 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={cn(
                    'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-[5px] rounded-md text-[11px] sm:text-[12px] font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0',
                    active ? 'bg-white text-[var(--tx-1)] shadow-xs font-semibold' : 'text-[var(--tx-3)] hover:text-[var(--tx-2)]',
                  )}
                >
                  {t.label}
                  <span className={cn(
                    'text-[10px] font-bold min-w-[16px] text-center px-0.5',
                    active ? 'text-primary-500' : 'text-[var(--tx-3)]'
                  )}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Actions group - wrap on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-auto flex-wrap sm:flex-nowrap">
          {/* Search - full width on mobile */}
          <div className="relative flex-1 sm:flex-none min-w-0">
            <MagnifyingGlassIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'h-8 pl-8 pr-8 rounded-lg border border-[var(--bd-def)] bg-white w-full',
                'text-[12px] sm:text-[13px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)]',
                'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
                'transition-colors sm:w-40 md:w-44',
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--tx-3)] hover:text-[var(--tx-2)] transition-colors z-10 p-0.5 rounded hover:bg-[var(--bg-sink)]"
                aria-label="Effacer la recherche"
              >
                <XIcon size={12} />
              </button>
            )}
          </div>

          {/* View toggle - compact on mobile */}
          <div className="flex items-center border border-[var(--bd-def)] rounded-lg overflow-hidden bg-white flex-shrink-0">
            <button
              onClick={() => setView('list')}
              title="Vue liste"
              className={cn(
                'h-8 w-7 sm:w-8 flex items-center justify-center transition-colors',
                view === 'list' ? 'bg-[var(--bg-sink)] text-primary-500' : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-2)]'
              )}
            >
              <TableIcon size={14} />
            </button>
            <div className="w-px h-4 bg-[var(--bd-def)]" />
            <button
              onClick={() => setView('kanban')}
              title="Vue kanban"
              className={cn(
                'h-8 w-7 sm:w-8 flex items-center justify-center transition-colors',
                view === 'kanban' ? 'bg-[var(--bg-sink)] text-primary-500' : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-2)]'
              )}
            >
              <KanbanIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {loading && prospects.length === 0 ? (
        <div className="flex items-center justify-center py-16 sm:py-24 gap-2 sm:gap-3 text-[var(--tx-3)]">
          <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-xs sm:text-sm">Chargement des prospects…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-2 sm:gap-3 px-4">
          <p className="text-xs sm:text-sm text-red-500 text-center">{error}</p>
          <button
            onClick={() => dispatch(fetchProspects(currentParams()))}
            className="h-8 px-4 rounded-lg border border-[var(--bd-def)] text-sm text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : view === 'kanban' ? (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <ProspectKanban
            prospects={kanbanProspects}
            onMove={moveProspect}
            canMoveToStatus={(_, __, toStatus) => toStatus !== 'nouveau'}
          />
        </div>
      ) : (
        <div className={cn(
          'transition-opacity duration-150 overflow-x-auto -mx-3 sm:mx-0',
          loading && 'opacity-60 pointer-events-none'
        )}>
          <ProspectList
            prospects={apiProspects}
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
            onDelete={async (id) => { await dispatch(deleteProspect(id)).unwrap(); }}
            onMove={moveProspect}
          />
        </div>
      )}
    </div>
  );
}
