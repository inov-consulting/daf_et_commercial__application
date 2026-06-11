'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DownloadSimpleIcon, MagnifyingGlassIcon, FunnelIcon, PlusIcon,
  TableIcon, KanbanIcon, ArrowsClockwiseIcon, XIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ProspectKanban } from '@/components/layout/prospect-kanban';
import { ProspectList, type SortKey } from '@/components/layout/prospect-list';
import {
  PROSPECT_STATUSES, STATUS_CONFIG, STATUS_TO_ACTION, SECTOR_STYLES,
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

/* ── Create / Edit Modal ─────────────────────────────────────────────────── */

function ProspectFormModal({
  open, mode, initial, saving, serverError, onClose, onSave,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ApiProspect;
  saving: boolean;
  serverError?: string | null;
  onClose: () => void;
  onSave: (body: UpdateProspectBody) => void;
}) {
  const [form, setForm] = useState<UpdateProspectBody>({
    company_name: '', contact_name: '', email: '', phone: '',
    portalis_sector: '', expected_revenue: undefined, portalis_notes: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        company_name:     initial?.company_name    ?? '',
        contact_name:     initial?.contact_name    ?? '',
        email:            initial?.email           ?? '',
        phone:            initial?.phone           ?? '',
        portalis_sector:  initial?.portalis_sector ?? '',
        expected_revenue: initial?.expected_revenue || undefined,
        portalis_notes:   initial?.portalis_notes  ?? '',
      });
      setLocalError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  function set<K extends keyof UpdateProspectBody>(k: K, v: UpdateProspectBody[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name?.trim()) {
      setLocalError("Le nom de l'entreprise est requis.");
      return;
    }
    setLocalError(null);
    onSave(form);
  }

  const inp = [
    'w-full h-9 px-3 rounded-lg border border-[var(--bd-def)] text-sm text-[var(--tx-1)] bg-white',
    'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
    'transition-colors placeholder:text-[var(--tx-3)]',
  ].join(' ');
  const lbl = 'block text-[12px] font-semibold text-[var(--tx-2)] mb-1.5';
  const displayError = localError ?? serverError;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-[var(--bd-def)] z-10">
          <h2 className="font-display text-[16px] font-bold text-[var(--tx-1)]">
            {mode === 'create' ? 'Nouveau prospect' : 'Modifier le prospect'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors">
            <XIcon size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
              {displayError}
            </div>
          )}

          <div>
            <label className={lbl}>Entreprise <span className="text-red-500">*</span></label>
            <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Nom de l'entreprise" className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Contact</label>
              <input value={form.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} placeholder="Nom du contact" className={inp} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="email@exemple.com" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Téléphone</label>
              <input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+221 77 000 0000" className={inp} />
            </div>
            <div>
              <label className={lbl}>Secteur</label>
              <select value={form.portalis_sector ?? ''} onChange={e => set('portalis_sector', e.target.value)} className={inp}>
                <option value="">— Sélectionner —</option>
                {Object.keys(SECTOR_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Revenu attendu (FCFA)</label>
            <input
              type="number" min={0}
              value={form.expected_revenue ?? ''}
              onChange={e => set('expected_revenue', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0" className={inp}
            />
          </div>

          {mode === 'edit' && (
            <div>
              <label className={lbl}>Notes Portalis</label>
              <textarea
                value={form.portalis_notes ?? ''}
                onChange={e => set('portalis_notes', e.target.value)}
                placeholder="Notes internes, remarques..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--bd-def)] text-sm text-[var(--tx-1)] bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-colors resize-none placeholder:text-[var(--tx-3)]"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-sm text-[var(--tx-2)] border border-[var(--bd-def)] hover:bg-[var(--bg-sink)] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-5 rounded-lg text-sm text-white font-semibold disabled:opacity-60 transition-all" style={{ background: 'var(--grad)' }}>
              {saving ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function ProspectsPage() {
  const dispatch = useAppDispatch();

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
