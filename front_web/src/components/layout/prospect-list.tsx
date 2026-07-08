'use client';

import { useEffect, useState } from 'react';
import {
  CaretUpDownIcon, CaretUpIcon, CaretDownIcon, DotsThreeVerticalIcon,
  TrashIcon, WarningCircleIcon, CircleNotchIcon, XIcon,
} from '@phosphor-icons/react';
import {
  STATUS_CONFIG, SECTOR_STYLES, PROSPECT_STATUSES,
  formatFcfa, pipelineAgeInfo,
  hashColor, toInitials, timeAgo,
  type ApiProspect, type ProspectStatus,
} from '@/types/prospect_type';
import { cn } from '@/lib/utils';

export type SortKey = 'company' | 'pipeline' | 'age';

interface ProspectListProps {
  prospects: ApiProspect[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: SortKey | null;
  sortOrder: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (col: SortKey) => void;
  onEdit?: (id: string) => void;
  onDetail?: (id: string) => void;
  onMove?: (id: string, newStatus: ProspectStatus) => void;
  onDelete?: (id: string) => Promise<void>;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function ProspectList({
  prospects,
  total,
  page,
  pageSize,
  sortBy,
  sortOrder,
  onPageChange,
  onPageSizeChange,
  onSort,
  onEdit,
  onDetail,
  onMove,
  onDelete,
  onSelectionChange,
}: ProspectListProps) {
  const [actionOpen, setActionOpen] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const [statusOpen, setStatusOpen]   = useState<string | null>(null);
  const [statusPos,  setStatusPos]    = useState<{ top: number; left: number } | null>(null);
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, ProspectStatus>>({});

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [deleteError, setDeleteError]         = useState<string | null>(null);

  // État pour les sélections
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* Vide les overrides dès que Redux livre l'état final (succès ou rollback) */
  useEffect(() => {
    if (Object.keys(pendingStatuses).length === 0) return;
    setPendingStatuses({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospects]);

  // Notifier le parent des changements de sélection
  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  // Réinitialiser la sélection quand la page change ou les données changent
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, prospects]);

  useEffect(() => {
    if (!actionOpen) return;
    function close() { setActionOpen(null); setDropdownPos(null); }
    document.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [actionOpen]);

  useEffect(() => {
    if (!statusOpen) return;
    function close() { setStatusOpen(null); setStatusPos(null); }
    document.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [statusOpen]);

  // Gestionnaires de sélection
  const isAllSelected = prospects.length > 0 && prospects.every(p => selectedIds.has(p.id));
  const isSomeSelected = prospects.some(p => selectedIds.has(p.id));

  function handleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map(p => p.id)));
    }
  }

  function handleSelectOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const confirmProspect = confirmDeleteId
    ? prospects.find(p => p.id === confirmDeleteId)
    : null;

  async function handleConfirmDelete() {
    if (!confirmDeleteId || !onDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx   = (page - 1) * pageSize;

  const pageNumbers: (number | '…')[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) {
      pageNumbers.push(n);
    } else if (pageNumbers[pageNumbers.length - 1] !== '…') {
      pageNumbers.push('…');
    }
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortBy === col;
    return (
      <button
        onClick={() => onSort(col)}
        className={cn(
          'flex items-center gap-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors whitespace-nowrap',
          active ? 'text-primary-500' : 'text-[var(--tx-3)] hover:text-[var(--tx-1)]',
        )}
      >
        {label}
        {!active && <CaretUpDownIcon size={10} className="ml-0.5 opacity-60" />}
        {active && sortOrder === 'asc'  && <CaretUpIcon   size={10} className="ml-0.5" />}
        {active && sortOrder === 'desc' && <CaretDownIcon size={10} className="ml-0.5" />}
      </button>
    );
  }

  return (
    <div>
      {/* Barre d'actions de sélection */}
      {isSomeSelected && (
        <div className="mb-3 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg flex items-center gap-3 text-sm">
          <span className="text-primary-700 font-medium">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            Désélectionner
          </button>
          {/* Ajoutez ici d'autres actions groupées si nécessaire */}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[var(--bd-def)] rounded-xl overflow-hidden shadow-xs">
        <div style={{ overflowX: 'auto', overflowY: 'clip' }}>
          <table className="w-full text-left border-collapse" style={{ minWidth: 920 }}>
            <thead className="sticky top-0 z-10 bg-[var(--bg-sink)]">
              <tr className="border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
                <th className="w-10 pl-4 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeSelected && !isAllSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-neutral-300 cursor-pointer accent-primary-500"
                  />
                </th>
                <th className="py-3 pl-1 pr-4">
                  <SortBtn col="company" label="Entreprise" />
                </th>
                <th className="py-3 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase whitespace-nowrap">
                  Contact
                </th>
                <th className="py-3 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase whitespace-nowrap">
                  Secteur
                </th>
                <th className="py-3 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase whitespace-nowrap">
                  Statut
                </th>
                <th className="py-3 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase whitespace-nowrap">
                  Équipe
                </th>
                <th className="py-3 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase whitespace-nowrap">
                  Dossiers
                </th>
                <th className="py-3 pr-4 whitespace-nowrap">
                  <SortBtn col="pipeline" label="Pipeline FCFA" />
                </th>
                <th className="py-3 pr-4 whitespace-nowrap">
                  <SortBtn col="age" label="Âge pipeline" />
                </th>
                <th className="py-3 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase whitespace-nowrap">
                  Activité
                </th>
                <th className="py-3 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {prospects.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-sm text-[var(--tx-3)]">
                    Aucun prospect trouvé
                  </td>
                </tr>
              )}
              {prospects.map((p, i) => {
                const displayStatus = (pendingStatuses[p.id] ?? p.status) as ProspectStatus;
                const statusCfg   = STATUS_CONFIG[displayStatus];
                const sectorStyle = SECTOR_STYLES[p.portalis_sector] ?? {
                  bg: 'rgba(118,145,168,0.10)', text: '#5A738A', border: 'rgba(118,145,168,0.22)',
                };
                const pipeline    = p.expected_revenue > 0 ? p.expected_revenue : null;
                const pipelineAge = p.pipeline_age_days > 0 ? p.pipeline_age_days : null;
                const age         = pipelineAgeInfo(pipelineAge);
                const isLast      = i === prospects.length - 1;
                const isSelected  = selectedIds.has(p.id);

                return (
                  <tr
                    key={p.id}
                    onClick={() => onDetail?.(p.id)}
                    className={cn(
                      'group transition-colors',
                      isSelected ? 'bg-primary-50/50 hover:bg-primary-50' : 'hover:bg-[var(--bg-sink)]',
                      !isLast && 'border-b border-[var(--bd-def)]',
                      onDetail && 'cursor-pointer',
                    )}
                  >
                    {/* Checkbox */}
                    <td className="pl-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={e => e.stopPropagation()}
                        onChange={() => handleSelectOne(p.id)}
                        className="w-3.5 h-3.5 rounded border-neutral-300 cursor-pointer accent-primary-500"
                      />
                    </td>

                    {/* Reste du code inchangé... */}
                    {/* Entreprise */}
                    <td className="py-3.5 pl-1 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: hashColor(p.id) }}
                        >
                          {toInitials(p.company_name)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[var(--tx-1)] text-[13px] font-semibold font-display whitespace-nowrap">
                            {p.company_name || p.lead_name}
                          </span>
                          {p.lead_name && p.lead_name !== p.company_name && (
                            <p className="text-[11px] text-[var(--tx-3)] truncate">{p.lead_name}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 pr-4">
                      <p className="text-[var(--tx-1)] text-[13px] font-medium whitespace-nowrap">
                        {p.contact_name || '–'}
                      </p>
                      <p className="text-[var(--tx-3)] text-xs whitespace-nowrap truncate">{p.email || ''}</p>
                    </td>

                    {/* Secteur */}
                    <td className="py-3.5 pr-4">
                      {p.portalis_sector ? (
                        <span
                          className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold border whitespace-nowrap"
                          style={{ background: sectorStyle.bg, color: sectorStyle.text, borderColor: sectorStyle.border }}
                        >
                          {p.portalis_sector}
                        </span>
                      ) : (
                        <span className="text-[var(--tx-3)] text-sm">–</span>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="py-3.5 pr-4">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (!onMove) return;
                          if (statusOpen === p.id) { setStatusOpen(null); setStatusPos(null); return; }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const top = spaceBelow < 220 ? rect.top - 220 : rect.bottom + 4;
                          setStatusPos({ top, left: rect.left });
                          setStatusOpen(p.id);
                        }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-semibold border whitespace-nowrap transition-opacity',
                          onMove ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                        )}
                        style={{ background: statusCfg.tagBg, color: statusCfg.tagText, borderColor: statusCfg.tagBorder }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusCfg.dotColor }} />
                        {statusCfg.label}
                        {onMove && <span className="ml-0.5 opacity-50">▾</span>}
                      </button>
                    </td>

                    {/* Équipe */}
                    <td className="py-3.5 pr-4 text-[var(--tx-2)] text-[13px] whitespace-nowrap">
                      {p.team_name ?? '–'}
                    </td>

                    {/* Dossiers */}
                    <td className="py-3.5 pr-4">
                      <span className="text-[var(--tx-3)] text-sm">—</span>
                    </td>

                    {/* Pipeline FCFA */}
                    <td className="py-3.5 pr-4 text-[var(--tx-1)] text-[13px] font-semibold font-display tabular-nums whitespace-nowrap">
                      {formatFcfa(pipeline, true)}
                    </td>

                    {/* Âge pipeline */}
                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      {pipelineAge !== null ? (
                        <span className="text-[13px] font-semibold tabular-nums" style={{ color: age.color }}>
                          {age.prefix && <span className="mr-0.5">{age.prefix}</span>}
                          {age.label}
                        </span>
                      ) : (
                        <span className="text-[var(--tx-3)] text-sm">—</span>
                      )}
                    </td>

                    {/* Activité */}
                    <td className="py-3.5 pr-4 text-[var(--tx-3)] text-[13px] whitespace-nowrap">
                      {timeAgo(p.updated_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (actionOpen === p.id) {
                            setActionOpen(null);
                            setDropdownPos(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setActionOpen(p.id);
                          }
                        }}
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                          'opacity-100 bg-[var(--bg-sink)] text-[var(--tx-1)]',
                        )}
                      >
                        <DotsThreeVerticalIcon size={16} weight="bold" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination + legend - inchangé */}
      <div className="mt-3 px-1 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-[var(--tx-3)]">
            Affichage{' '}
            <span className="text-[var(--tx-2)] font-medium">
              {total === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, total)}
            </span>{' '}
            sur{' '}
            <span className="text-[var(--tx-2)] font-medium">{total}</span>{' '}
            prospect{total !== 1 ? 's' : ''}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                className="h-7 px-2.5 rounded-lg text-xs text-[var(--tx-2)] border border-[var(--bd-def)] bg-white disabled:opacity-40 hover:bg-[var(--bg-sink)] transition-colors"
              >
                ← Préc.
              </button>
              {pageNumbers.map((n, i) =>
                n === '…' ? (
                  <span key={`dots-${i}`} className="h-7 w-7 flex items-center justify-center text-xs text-[var(--tx-3)]">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => onPageChange(n)}
                    className={cn(
                      'h-7 w-7 rounded-lg text-xs font-medium transition-colors',
                      page === n
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-[var(--tx-2)] border border-[var(--bd-def)] bg-white hover:bg-[var(--bg-sink)]',
                    )}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                disabled={page === totalPages}
                onClick={() => onPageChange(page + 1)}
                className="h-7 px-2.5 rounded-lg text-xs text-[var(--tx-2)] border border-[var(--bd-def)] bg-white disabled:opacity-40 hover:bg-[var(--bg-sink)] transition-colors"
              >
                Suiv. →
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-[var(--tx-3)]">
            <span>Afficher</span>
            <select
              value={pageSize}
              onChange={(e) => { onPageSizeChange(Number(e.target.value)); }}
              className="h-7 px-2 pr-6 rounded-lg border border-[var(--bd-def)] text-xs text-[var(--tx-1)] bg-white cursor-pointer focus:outline-none focus:border-primary-500"
            >
              {[10, 20, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span>par page</span>
          </div>
        </div>

        {/* Pipeline age legend */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase mr-1">
            Âge pipeline :
          </span>
          <span className="text-[11px] text-[var(--tx-3)]">
            J+1 à J+29 · <span className="font-medium text-[var(--tx-2)]">Normal</span>
          </span>
          <span className="text-[var(--tx-3)] text-[11px] mx-1">·</span>
          <span className="text-[11px]" style={{ color: '#F59E0B' }}>
            ▲ J+30 à J+59 · <span className="font-semibold">À relancer</span>
          </span>
          <span className="text-[var(--tx-3)] text-[11px] mx-1">·</span>
          <span className="text-[11px]" style={{ color: '#EF4444' }}>
            ● J+60 et + · <span className="font-semibold">Urgent</span>
          </span>
        </div>
      </div>

      {/* Status dropdown portal - inchangé */}
      {statusOpen && statusPos && onMove && (
        <div
          className="fixed z-[200] bg-white border border-[var(--bd-def)] rounded-xl shadow-lg py-1 min-w-[160px]"
          style={{ top: statusPos.top, left: statusPos.left }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] px-3 pt-1.5 pb-1">
            Changer le statut
          </p>
          {PROSPECT_STATUSES.filter(s => s !== 'nouveau').map(s => {
            const cfg = STATUS_CONFIG[s];
            const isCurrent = (pendingStatuses[statusOpen] ?? prospects.find(p => p.id === statusOpen)?.status) === s;
            return (
              <button
                key={s}
                onClick={() => {
                  setPendingStatuses(prev => ({ ...prev, [statusOpen]: s }));
                  onMove(statusOpen, s);
                  setStatusOpen(null);
                  setStatusPos(null);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors',
                  isCurrent ? 'bg-[var(--bg-sink)]' : 'hover:bg-[var(--bg-sink)]',
                )}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dotColor }} />
                <span className={cn('flex-1', isCurrent && 'font-semibold')} style={{ color: cfg.tagText }}>
                  {cfg.label}
                </span>
                {isCurrent && <span className="text-[10px] text-[var(--tx-3)]">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Dropdown portal */}
      {actionOpen && dropdownPos && (
        <div
          className="fixed z-[200] bg-white border border-[var(--bd-def)] rounded-xl shadow-lg py-1 min-w-[152px]"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setActionOpen(null); setDropdownPos(null); onDetail?.(actionOpen); }}
            className="w-full px-3.5 py-2 text-left text-[13px] text-[var(--tx-2)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-1)] transition-colors"
          >
            Voir le détail
          </button>
          <button
            onClick={() => { setActionOpen(null); setDropdownPos(null); onEdit?.(actionOpen); }}
            className="w-full px-3.5 py-2 text-left text-[13px] text-[var(--tx-2)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-1)] transition-colors"
          >
            Modifier
          </button>
          {onDelete && (
            <>
              <div className="my-1 border-t border-[var(--bd-def)]" />
              <button
                onClick={() => {
                  const id = actionOpen;
                  setActionOpen(null);
                  setDropdownPos(null);
                  setDeleteError(null);
                  setConfirmDeleteId(id);
                }}
                className="w-full px-3.5 py-2 text-left text-[13px] text-[#DC2626] hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <TrashIcon size={13} />
                Supprimer
              </button>
            </>
          )}
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {confirmDeleteId && (
        <>
          <div
            className="fixed inset-0 z-[210] bg-black/50"
            onClick={() => { if (!deleting) setConfirmDeleteId(null); }}
          />
          <div className="fixed inset-0 z-[211] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[var(--bd-def)] overflow-hidden pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-[3px] w-full bg-[#EF4444]" />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                    <TrashIcon size={16} className="text-[#DC2626]" weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--tx-1)]">Supprimer ce prospect</h3>
                    <p className="text-[12px] text-[var(--tx-3)] mt-0.5">
                      <span className="font-semibold text-[var(--tx-2)]">
                        {confirmProspect?.company_name ?? confirmProspect?.lead_name ?? '–'}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => { if (!deleting) setConfirmDeleteId(null); }}
                    className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
                  >
                    <XIcon size={14} />
                  </button>
                </div>

                <p className="text-[12px] text-[var(--tx-3)] leading-relaxed mb-4">
                  Cette action est <span className="font-semibold text-[var(--tx-2)]">irréversible</span>. Le prospect et toutes ses données associées seront définitivement supprimés.
                </p>

                {deleteError && (
                  <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <WarningCircleIcon size={14} className="flex-shrink-0 mt-0.5" />
                    <span className="text-[12px]">{deleteError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={deleting}
                    className="flex-1 h-9 rounded-xl text-[13px] font-semibold text-[var(--tx-2)] bg-[var(--bg-sink)] border border-[var(--bd-def)] hover:bg-[var(--bd-def)] disabled:opacity-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="flex-1 h-9 rounded-xl text-[13px] font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                  >
                    {deleting
                      ? <><CircleNotchIcon size={13} className="animate-spin" /> Suppression…</>
                      : <><TrashIcon size={13} weight="bold" /> Supprimer</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}