'use client';

import { useEffect, useState } from 'react';
import { CaretUpDown, CaretUp, CaretDown, DotsThreeVertical } from '@phosphor-icons/react';
import {
  STATUS_CONFIG, SECTOR_STYLES,
  formatFcfa, pipelineAgeInfo,
  hashColor, toInitials, timeAgo,
  type ApiProspect,
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
}: ProspectListProps) {
  const [actionOpen, setActionOpen] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

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
        {!active && <CaretUpDown size={10} className="ml-0.5 opacity-60" />}
        {active && sortOrder === 'asc'  && <CaretUp   size={10} className="ml-0.5" />}
        {active && sortOrder === 'desc' && <CaretDown size={10} className="ml-0.5" />}
      </button>
    );
  }

  return (
    <div>
      {/* Table */}
      <div className="bg-white border border-[var(--bd-def)] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: 920 }}>
            <thead>
              <tr className="border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
                <th className="w-10 pl-4 py-3">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-neutral-300 cursor-pointer" />
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
                const statusCfg   = STATUS_CONFIG[p.status];
                const sectorStyle = SECTOR_STYLES[p.portalis_sector] ?? {
                  bg: 'rgba(118,145,168,0.10)', text: '#5A738A', border: 'rgba(118,145,168,0.22)',
                };
                const pipeline    = p.expected_revenue > 0 ? p.expected_revenue : null;
                const pipelineAge = p.pipeline_age_days > 0 ? p.pipeline_age_days : null;
                const age         = pipelineAgeInfo(pipelineAge);
                const isLast      = i === prospects.length - 1;

                return (
                  <tr
                    key={p.id}
                    className={cn(
                      'group transition-colors hover:bg-[var(--bg-sink)]',
                      !isLast && 'border-b border-[var(--bd-def)]',
                    )}
                  >
                    {/* Checkbox */}
                    <td className="pl-4 py-3.5">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-neutral-300 cursor-pointer" />
                    </td>

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
                      <p className="text-[var(--tx-3)] text-xs whitespace-nowrap">{p.email || ''}</p>
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
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-semibold border whitespace-nowrap"
                        style={{ background: statusCfg.tagBg, color: statusCfg.tagText, borderColor: statusCfg.tagBorder }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusCfg.dotColor }} />
                        {statusCfg.label}
                      </span>
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
                          'text-[var(--tx-3)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-1)]',
                          'opacity-0 group-hover:opacity-100',
                          actionOpen === p.id && 'opacity-100 bg-[var(--bg-sink)] text-[var(--tx-1)]',
                        )}
                      >
                        <DotsThreeVertical size={16} weight="bold" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination + legend */}
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

      {/* Dropdown portal — fixed pour échapper au overflow du tableau */}
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
        </div>
      )}
    </div>
  );
}
