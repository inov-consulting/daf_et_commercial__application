'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchProposedActions,
  fetchLatestSnapshot,
  approveAction,
  rejectAction,
} from '@/redux/features/daf/dafSlice';
import { FinCard } from '@/components/finance/fin-card';
import { ActionDetailDrawer } from '@/components/finance/action-detail-drawer';
import {
  WarningCircleIcon, ClockIcon, BellIcon, InfoIcon,
  CheckIcon, XIcon, FunnelIcon, SpinnerGapIcon, EyeIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { DafProposedAction } from '@/types/daf_type';
import type { AlerteLevel } from '@/types/finance_type';

/* ── Types ────────────────────────────────────────────────────────────── */

interface PageAlerte {
  id:        string;
  level:     AlerteLevel;
  tag:       string;
  categorie: 'dso' | 'fournisseurs' | 'tresorerie' | 'ia';
  title:     string;
  sub:       string;
  date:      string;
  actionId?: string;
  isSystem?: boolean;
}

/* ── Mapping action_type ──────────────────────────────────────────────── */

const ACTION_META: Record<string, { categorie: PageAlerte['categorie']; tag: string }> = {
  send_reminder:    { categorie: 'dso',          tag: 'Relance'           },
  escalate:         { categorie: 'dso',          tag: 'Escalade'          },
  flag_risk:        { categorie: 'dso',          tag: 'Risque'            },
  contact_supplier: { categorie: 'fournisseurs', tag: 'Fournisseur'       },
  payment_plan:     { categorie: 'fournisseurs', tag: 'Plan paiement'     },
  escalate_debt:    { categorie: 'fournisseurs', tag: 'Dette'             },
  credit_policy:    { categorie: 'ia',           tag: 'Politique crédit'  },
};

const PRIORITY_LEVEL: Record<string, AlerteLevel> = {
  critical: 'critique',
  high:     'urgent',
  medium:   'demain',
  low:      'info',
};

function fmtM(v: number) {
  if (!v) return '0 FCFA';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}Md FCFA`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}k FCFA`;
  return v.toLocaleString('fr-FR') + ' FCFA';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function mapAction(a: DafProposedAction): PageAlerte {
  const meta  = ACTION_META[a.action_type] ?? { categorie: 'ia' as const, tag: 'Autre' };
  const level = PRIORITY_LEVEL[a.priority] ?? 'info';
  const partner = a.target_data?.partner_name ? ` · ${String(a.target_data.partner_name)}` : '';
  const amount  = a.target_data?.amount ? ` · ${fmtM(Number(a.target_data.amount))}` : '';
  return {
    id:        a.id,
    level:     level as AlerteLevel,
    tag:       meta.tag,
    categorie: meta.categorie,
    title:     a.title,
    sub:       a.description + partner + amount,
    date:      fmtDate(a.proposed_at),
    actionId:  a.id,
  };
}

/* ── Config niveaux ──────────────────────────────────────────────────── */

const LEVEL_CONFIG: Record<AlerteLevel, {
  bg: string; text: string; border: string; barColor: string;
  Icon: React.ElementType; label: string; badgeBg: string;
}> = {
  critique: { bg: 'rgba(239,68,68,.05)',  text: '#DC2626', border: 'rgba(239,68,68,.2)',  barColor: '#EF4444', Icon: WarningCircleIcon, label: 'Critique', badgeBg: '#FEE2E2' },
  urgent:   { bg: 'rgba(249,115,22,.05)', text: '#EA580C', border: 'rgba(249,115,22,.2)', barColor: '#F97316', Icon: ClockIcon,         label: 'Urgent',   badgeBg: '#FFEDD5' },
  demain:   { bg: 'rgba(245,158,11,.05)', text: '#B45309', border: 'rgba(245,158,11,.2)', barColor: '#F59E0B', Icon: BellIcon,          label: 'Demain',   badgeBg: '#FEF3C7' },
  info:     { bg: 'rgba(16,185,129,.05)', text: '#1B6B45', border: 'rgba(16,185,129,.2)', barColor: '#10B981', Icon: InfoIcon,          label: 'Info',     badgeBg: '#D1FAE5' },
};

const CATEGORIES = [
  { key: 'all',          label: 'Toutes'          },
  { key: 'dso',          label: 'DSO & Créances'  },
  { key: 'fournisseurs', label: 'Fournisseurs'     },
  { key: 'tresorerie',   label: 'Trésorerie'       },
  { key: 'ia',           label: 'IA & Politique'  },
];

const LEVELS: AlerteLevel[] = ['critique', 'urgent', 'demain', 'info'];

/* ── Page ────────────────────────────────────────────────────────────── */

export default function AlertesPage() {
  const dispatch = useAppDispatch();

  const {
    proposedActions,
    proposedActionsLoading,
    decidingId,
    latestSnapshot,
  } = useAppSelector(s => s.daf);

  const [filterCat,    setFilterCat]    = useState<string>('all');
  const [filterLevel,  setFilterLevel]  = useState<AlerteLevel | 'all'>('all');
  const [dismissed,    setDismissed]    = useState<Set<string>>(new Set());
  const [detailAction, setDetailAction] = useState<DafProposedAction | null>(null);

  useEffect(() => {
    dispatch(fetchProposedActions({ status: 'pending', limit: 50 }));
    dispatch(fetchLatestSnapshot());
  }, [dispatch]);

  /* ── Alertes dérivées ─────────────────────────────────────────────── */

  const snap = latestSnapshot;

  const actionAlertes: PageAlerte[] = proposedActions
    .filter(a => a.status === 'pending')
    .map(mapAction);

  const systemAlertes: PageAlerte[] = [];
  if (snap) {
    if (snap.dso_days > 45) {
      systemAlertes.push({
        id:        'sys-dso',
        level:     snap.dso_days > 60 ? 'critique' : 'urgent',
        tag:       'DSO',
        categorie: 'dso',
        title:     `DSO ${snap.dso_days}j · Seuil dépassé`,
        sub:       `Objectif 45j — ${snap.overdue_receivables_count} client${snap.overdue_receivables_count > 1 ? 's' : ''} > 60j — ${fmtM(snap.overdue_receivables)} exposés`,
        date:      snap.period_label,
        isSystem:  true,
      });
    }
    if (snap.cash_position <= 0) {
      systemAlertes.push({
        id:        'sys-tresorerie',
        level:     'urgent',
        tag:       'Trésorerie',
        categorie: 'tresorerie',
        title:     'Trésorerie nette nulle ou négative',
        sub:       `Position : ${fmtM(snap.cash_position)} · Période ${snap.period_label}`,
        date:      fmtDate(snap.snapshot_at),
        isSystem:  true,
      });
    }
    if (snap.overdue_payables > 0) {
      systemAlertes.push({
        id:        'sys-payables',
        level:     snap.overdue_payables_count > 1 ? 'urgent' : 'demain',
        tag:       'Fournisseurs',
        categorie: 'fournisseurs',
        title:     `${snap.overdue_payables_count} fournisseur${snap.overdue_payables_count > 1 ? 's' : ''} en retard · ${fmtM(snap.overdue_payables)}`,
        sub:       `Dettes fournisseurs en souffrance · Période ${snap.period_label}`,
        date:      fmtDate(snap.snapshot_at),
        isSystem:  true,
      });
    }
  }

  const allAlertes = [...systemAlertes, ...actionAlertes].filter(a => !dismissed.has(a.id));

  const filtered = allAlertes.filter(a =>
    (filterCat   === 'all' || a.categorie === filterCat) &&
    (filterLevel === 'all' || a.level     === filterLevel)
  );

  const counts: Record<AlerteLevel, number> = {
    critique: allAlertes.filter(a => a.level === 'critique').length,
    urgent:   allAlertes.filter(a => a.level === 'urgent').length,
    demain:   allAlertes.filter(a => a.level === 'demain').length,
    info:     allAlertes.filter(a => a.level === 'info').length,
  };

  const isLoading  = proposedActionsLoading && proposedActions.length === 0;
  const hasFilters = filterCat !== 'all' || filterLevel !== 'all';

  function resetFilters() { setFilterCat('all'); setFilterLevel('all'); }

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">

      {/* Header */}
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-[var(--tx-1)]">
            Alertes financières
          </h1>
          <p className="text-xs text-[var(--tx-3)] mt-0.5">
            {isLoading ? 'Chargement…' : (
              <>
                <span className="font-semibold text-[var(--tx-2)]">{allAlertes.length}</span> alerte{allAlertes.length !== 1 ? 's' : ''} active{allAlertes.length !== 1 ? 's' : ''}
                {actionAlertes.length > 0 && (
                  <> · <span className="font-semibold text-[#EA580C]">{actionAlertes.length}</span> action{actionAlertes.length !== 1 ? 's' : ''} en attente</>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Tuiles niveaux — filtre cliquable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {LEVELS.map(l => {
          const c = LEVEL_CONFIG[l];
          const { Icon } = c;
          const active = filterLevel === l;
          return (
            <button
              key={l}
              onClick={() => setFilterLevel(active ? 'all' : l)}
              className="p-3 sm:p-4 rounded-xl text-left transition-all hover:scale-[1.01] select-none"
              style={{
                background:   c.bg,
                border:       `${active ? 2 : 1}px solid ${active ? c.barColor : c.border}`,
                boxShadow:    active ? `0 0 0 3px ${c.barColor}22` : undefined,
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <Icon size={18} style={{ color: c.text }} />
                <span className="text-2xl font-bold font-display leading-none" style={{ color: c.text }}>
                  {isLoading ? '…' : counts[l]}
                </span>
              </div>
              <p className="text-[12px] font-semibold" style={{ color: c.text }}>{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Barre de filtres */}
      <FinCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <FunnelIcon size={13} className="text-[var(--tx-3)]" />
            <span className="text-[11px] text-[var(--tx-3)] font-semibold uppercase tracking-wide">Catégorie</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setFilterCat(cat.key)}
                className={cn(
                  'h-6 px-2 rounded-md text-[11px] font-medium transition-colors border',
                  filterCat === cat.key
                    ? 'bg-[var(--p500)] text-white border-[var(--p500)]'
                    : 'text-[var(--tx-2)] border-[var(--bd-def)] hover:bg-[var(--bg-sink)]',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <>
              <div className="w-px h-4 bg-[var(--bd-def)]" />
              <button
                onClick={resetFilters}
                className="h-6 px-2 rounded-md text-[11px] font-medium text-[var(--tx-3)] border border-[var(--bd-def)] hover:bg-[var(--bg-sink)] flex items-center gap-1"
              >
                <XIcon size={11} weight="bold" /> Réinitialiser
              </button>
            </>
          )}
        </div>
      </FinCard>

      {/* Chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-[var(--tx-3)] gap-2">
          <SpinnerGapIcon size={20} className="animate-spin" />
          <span className="text-[13px]">Chargement des alertes…</span>
        </div>
      )}

      {/* Liste groupée par niveau */}
      {!isLoading && (
        <div className="space-y-5">
          {LEVELS.map(level => {
            const group = filtered.filter(a => a.level === level);
            if (!group.length) return null;
            const c = LEVEL_CONFIG[level];
            const { Icon } = c;
            return (
              <div key={level}>
                {/* En-tête de groupe */}
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: c.text }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.text }}>
                    {c.label}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: c.badgeBg, color: c.text }}
                  >
                    {group.length}
                  </span>
                </div>

                {/* Cartes alerte */}
                <div className="space-y-2">
                  {group.map(a => {
                    const isDeciding = decidingId === a.actionId;
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl border flex items-start gap-3 p-3.5 sm:p-4 transition-all hover:shadow-sm"
                        style={{ background: c.bg, borderColor: c.border }}
                      >
                        {/* Barre latérale colorée */}
                        <div
                          className="w-1 self-stretch rounded-full flex-shrink-0"
                          style={{ background: c.barColor }}
                        />

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1 flex-wrap">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ background: c.badgeBg, color: c.text }}
                            >
                              {a.tag}
                            </span>
                            {a.isSystem && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-sink)] text-[var(--tx-3)] border border-[var(--bd-def)] flex-shrink-0">
                                Système
                              </span>
                            )}
                            <p className="text-[13px] font-semibold text-[var(--tx-1)] leading-snug">{a.title}</p>
                          </div>
                          <p className="text-[12px] text-[var(--tx-2)] line-clamp-2">{a.sub}</p>
                          {a.date && (
                            <p className="text-[11px] text-[var(--tx-3)] mt-1">{a.date}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!a.isSystem && a.actionId ? (
                            <>
                              <button
                                onClick={() => {
                                  const found = proposedActions.find(p => p.id === a.actionId);
                                  if (found) setDetailAction(found);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-white/60 transition-colors"
                                title="Voir détails"
                              >
                                <EyeIcon size={14} />
                              </button>
                              <button
                                onClick={() => dispatch(approveAction({ actionId: a.actionId! }))}
                                disabled={!!decidingId}
                                className="h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 bg-[rgba(16,185,129,.1)] text-[var(--ok600)] hover:bg-[rgba(16,185,129,.2)] disabled:opacity-50 transition-colors whitespace-nowrap"
                              >
                                {isDeciding
                                  ? <SpinnerGapIcon size={11} className="animate-spin" />
                                  : <CheckIcon size={11} weight="bold" />}
                                Valider
                              </button>
                              <button
                                onClick={() => dispatch(rejectAction({ actionId: a.actionId! }))}
                                disabled={!!decidingId}
                                className="h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 bg-[rgba(239,68,68,.08)] text-[#DC2626] hover:bg-[rgba(239,68,68,.15)] disabled:opacity-50 transition-colors whitespace-nowrap"
                              >
                                <XIcon size={11} weight="bold" />
                                Rejeter
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDismissed(prev => new Set(Array.from(prev).concat(a.id)))}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-white/60 transition-colors"
                              title="Ignorer"
                            >
                              <XIcon size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* État vide */}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[var(--tx-3)]">
              <CheckIcon size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-[14px] text-[var(--tx-2)]">Aucune alerte active</p>
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-3 text-[12px] text-[var(--p500)] hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <ActionDetailDrawer
        action={detailAction}
        onClose={() => setDetailAction(null)}
        onApprove={(id) => dispatch(approveAction({ actionId: id }))}
        onReject={(id)  => dispatch(rejectAction({ actionId: id }))}
        decidingId={decidingId}
      />
    </div>
  );
}
