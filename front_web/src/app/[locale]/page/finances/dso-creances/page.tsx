'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchLatestSnapshot,
  fetchSnapshots,
  fetchProposedActions,
  approveAction,
  rejectAction,
  clearDecideError,
} from '@/redux/features/daf/dafSlice';
import { FinSectionHeader } from '@/components/finance/fin-section-header';
import { FinCard, FinCardHeader } from '@/components/finance/fin-card';
import { FR_MONTHS_SHORT } from '@/components/finance/fin-chart';
import { BalanceAgee } from '@/components/finance/balance-agee';
import { FinLineChart } from '@/components/finance/fin-chart';
import { FloatingToast } from '@/components/ui/toast';
import {
  DownloadSimpleIcon, ArrowRightIcon, CheckIcon, XIcon,
  SpinnerGapIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { DafActionPriority, DafActionStatus } from '@/types/daf_type';
import type { BalanceAgeeItem } from '@/types/finance_type';

/* ── Helpers ────────────────────────────────────────────────────────── */

function fmtM(v: number) {
  if (!v) return '0 FCFA';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}Md FCFA`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}k FCFA`;
  return `${v.toLocaleString('fr-FR')} FCFA`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Config priorité / statut ───────────────────────────────────────── */

const PRIORITY_STYLE: Record<DafActionPriority, { text: string; bg: string; border: string; bar: string; label: string }> = {
  critical: { text: '#DC2626', bg: 'rgba(239,68,68,.08)',  border: 'rgba(239,68,68,.25)',  bar: '#EF4444', label: 'Critique' },
  high:     { text: '#EA580C', bg: 'rgba(249,115,22,.08)', border: 'rgba(249,115,22,.25)', bar: '#F97316', label: 'Élevée'   },
  medium:   { text: '#B45309', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)', bar: '#F59E0B', label: 'Moyenne'  },
  low:      { text: '#1B6B45', bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.25)', bar: '#10B981', label: 'Faible'   },
};

const STATUS_STYLE: Record<DafActionStatus, { label: string; bg: string; text: string }> = {
  pending:  { label: 'En attente', bg: 'rgba(245,158,11,.1)', text: '#B45309' },
  approved: { label: 'Approuvée',  bg: 'rgba(16,185,129,.1)', text: '#1B6B45' },
  rejected: { label: 'Rejetée',    bg: 'rgba(239,68,68,.08)', text: '#DC2626' },
  executed: { label: 'Exécutée',   bg: 'rgba(99,102,241,.1)', text: '#4338CA' },
  failed:   { label: 'Échouée',    bg: 'rgba(239,68,68,.08)', text: '#DC2626' },
};

/* ── Balance âgée (mock — pas de route API disponible) ───────────────── */

const BALANCE_AGEE_MOCK: BalanceAgeeItem[] = [
  { tranche: '0 – 30 jours',  montant: 18_900, pct: 40 },
  { tranche: '31 – 45 jours', montant:  6_200, pct: 13 },
  { tranche: '46 – 60 jours', montant:  3_800, pct:  8 },
  { tranche: '61 – 90 jours', montant: 14_200, pct: 30 },
  { tranche: '> 90 jours',    montant:  4_100, pct:  9 },
];

/* ── Squelettes de chargement ───────────────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 sm:p-5 animate-pulse">
          <div className="h-3 w-24 bg-[#EEF2F7] rounded mb-3" />
          <div className="h-7 w-16 bg-[#EEF2F7] rounded mb-2" />
          <div className="h-2.5 w-32 bg-[#EEF2F7] rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function DsoCreancesPage() {
  const dispatch   = useAppDispatch();
  const router     = useRouter();
  const params     = useParams();
  const locale     = typeof params?.locale === 'string' ? params.locale : 'fr';

  const {
    latestSnapshot, latestSnapshotLoading, latestSnapshotError,
    snapshots,      snapshotsLoading,      snapshotsError,
    proposedActions, proposedActionsLoading, proposedActionsError,
    decidingId, decideError,
  } = useAppSelector(s => s.daf);

  /* Toast */
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  function showToast(msg: string, type: 'error' | 'success' | 'info' = 'error') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  /* Fetch on mount */
  useEffect(() => {
    dispatch(fetchLatestSnapshot());
    dispatch(fetchSnapshots(10));
    dispatch(fetchProposedActions({ status: 'pending', limit: 50 }));
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [dispatch]);

  /* Afficher les erreurs via toast */
  useEffect(() => {
    if (latestSnapshotError)  showToast(latestSnapshotError);
    if (snapshotsError)       showToast(snapshotsError);
    if (proposedActionsError) showToast(proposedActionsError);
  }, [latestSnapshotError, snapshotsError, proposedActionsError]);

  useEffect(() => {
    if (decideError) {
      showToast(decideError);
      dispatch(clearDecideError());
    }
  }, [decideError, dispatch]);

  /* Handlers */
  async function handleApprove(actionId: string) {
    const res = await dispatch(approveAction({ actionId }));
    if (approveAction.fulfilled.match(res)) showToast('Action approuvée avec succès', 'success');
  }

  async function handleReject(actionId: string) {
    const res = await dispatch(rejectAction({ actionId }));
    if (rejectAction.fulfilled.match(res)) showToast('Action rejetée', 'info');
  }

  /* Données dérivées */
  const snap = latestSnapshot;

  const dsoObjectif = 45;
  const dsoValue    = snap?.dso_days ?? 0;
  const dsoTrend    = dsoValue > dsoObjectif ? 'warning' : 'up';

  // Chart : snapshots triés du plus ancien au plus récent
  const chartData = [...snapshots]
    .sort((a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime())
    .map(s => ({ mois: FR_MONTHS_SHORT[new Date(s.snapshot_at).getMonth()], dso: s.dso_days, objectif: dsoObjectif }));

  // Actions de relance uniquement, par priorité décroissante
  const priorityRank: Record<DafActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const actions = [...proposedActions]
    .filter(a => a.action_type === 'send_reminder' || a.action_type === 'escalate' || a.action_type === 'flag_risk')
    .sort((a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9));

  const criticalCount = actions.filter(a => a.priority === 'critical').length;

  const isLoading = latestSnapshotLoading || snapshotsLoading || proposedActionsLoading;

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <FinSectionHeader
        title="DSO & Créances clients"
        secondaryAction={{ label: 'Exporter', icon: <DownloadSimpleIcon size={13} />, onClick: () => {} }}
        actionLabel="+ Relance auto"
        onAction={() => {}}
      />

      {/* KPI row */}
      {isLoading && !snap ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {[
            {
              label: 'DSO moyen global',
              value: snap ? `${snap.dso_days} jours` : '—',
              sub: `Objectif : ${dsoObjectif}j${snap && snap.dso_days > dsoObjectif ? ` — +${snap.dso_days - dsoObjectif}j` : ' — Respecté'}`,
              accent: dsoTrend === 'warning' ? '#F97316' : '#1B6B45',
            },
            {
              label: 'Créances totales',
              value: snap ? fmtM(snap.total_receivables) : '—',
              sub: `${snap?.overdue_receivables_count ?? 0} client(s) en retard`,
              accent: '#DC2626',
            },
            {
              label: 'Créances en retard',
              value: snap ? fmtM(snap.overdue_receivables) : '—',
              sub: `${snap?.overdue_receivables_count ?? 0} client(s) · relances prioritaires`,
              accent: '#DC2626',
            },
            {
              label: 'Position de trésorerie',
              value: snap ? fmtM(snap.cash_position) : '—',
              sub: snap ? `Mis à jour le ${fmtDate(snap.snapshot_at)}` : '—',
              accent: '#1B6B45',
            },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-4 sm:p-5">
              <p className="text-[11px] text-[var(--tx-3)] mb-1">{k.label}</p>
              <p className="font-display font-bold text-lg leading-tight" style={{ color: k.accent }}>{k.value}</p>
              <p className="text-[11px] text-[var(--tx-3)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Chart évolution DSO */}
          {chartData.length > 0 ? (
            <FinLineChart
              title="Évolution DSO moyen"
              subtitle="Historique des snapshots · Jours"
              data={chartData}
              series={[
                { yKey: 'dso',      yName: 'DSO réel',      stroke: '#F97316' },
                { yKey: 'objectif', yName: `Objectif ${dsoObjectif}j`, stroke: '#D1FAE5' },
              ]}
              height={200}
              yFormatter={v => `${v}j`}
            />
          ) : snapshotsLoading ? (
            <div className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 h-[240px] animate-pulse flex items-center justify-center">
              <SpinnerGapIcon size={24} className="animate-spin text-[var(--tx-3)]" />
            </div>
          ) : null}

          {/* Actions proposées */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader
                title="Actions proposées par l'agent DAF"
                badge={
                  criticalCount > 0
                    ? <span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(239,68,68,.1)] px-2 py-0.5 rounded-full">
                        {criticalCount} critique{criticalCount > 1 ? 's' : ''}
                      </span>
                    : <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">
                        {actions.length} action{actions.length !== 1 ? 's' : ''}
                      </span>
                }
                action={actions.length > 0 ? 'Vue complète' : undefined}
                onAction={() => router.push(`/${locale}/page/finances/alertes`)}
              />
            </div>

            {proposedActionsLoading && actions.length === 0 && (
              <div className="divide-y divide-[var(--bd-def)] border-t border-[var(--bd-def)]">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-4 animate-pulse">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-48 bg-[#EEF2F7] rounded" />
                      <div className="h-2.5 w-64 bg-[#EEF2F7] rounded" />
                    </div>
                    <div className="h-6 w-16 bg-[#EEF2F7] rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {!proposedActionsLoading && actions.length === 0 && (
              <div className="border-t border-[var(--bd-def)] py-10 text-center">
                <CheckIcon size={28} className="mx-auto mb-2 text-[var(--ok500)] opacity-60" />
                <p className="text-[12px] text-[var(--tx-3)]">Aucune action en attente</p>
              </div>
            )}

            {actions.length > 0 && (
              <div className="divide-y divide-[var(--bd-def)] border-t border-[var(--bd-def)]">
                {actions.map(action => {
                  const p = PRIORITY_STYLE[action.priority] ?? PRIORITY_STYLE.low;
                  const s = STATUS_STYLE[action.status]   ?? STATUS_STYLE.pending;
                  const isDeciding = decidingId === action.id;
                  return (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-[var(--bg-sink)] transition-colors"
                    >
                      <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" style={{ background: p.bar }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap mb-0.5">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: p.bg, color: p.text, border: `1px solid ${p.border}` }}
                          >
                            {p.label}
                          </span>
                          <p className="text-[13px] font-semibold text-[var(--tx-1)] leading-snug">{action.title}</p>
                        </div>
                        <p className="text-[12px] text-[var(--tx-2)] line-clamp-2 mb-1">{action.description}</p>
                        <p className="text-[11px] text-[var(--tx-3)]">
                          {fmtDate(action.proposed_at)} ·&nbsp;
                          <span className="font-semibold" style={{ color: s.text }}>{s.label}</span>
                        </p>
                      </div>
                      {action.status === 'pending' && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleApprove(action.id)}
                            disabled={isDeciding}
                            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 bg-[rgba(16,185,129,.1)] text-[var(--ok600)] hover:bg-[rgba(16,185,129,.2)] disabled:opacity-50 transition-colors"
                          >
                            {isDeciding
                              ? <SpinnerGapIcon size={12} className="animate-spin" />
                              : <CheckIcon size={12} weight="bold" />}
                            Valider
                          </button>
                          <button
                            onClick={() => handleReject(action.id)}
                            disabled={isDeciding}
                            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 bg-[rgba(239,68,68,.08)] text-[#DC2626] hover:bg-[rgba(239,68,68,.15)] disabled:opacity-50 transition-colors"
                          >
                            <XIcon size={12} weight="bold" />
                            Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </FinCard>
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Jauge DSO */}
          <FinCard>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] text-[var(--tx-3)] mb-0.5">DSO actuel</p>
                <p
                  className="font-display font-bold text-4xl"
                  style={{ color: dsoValue > dsoObjectif ? '#F97316' : '#1B6B45' }}
                >
                  {latestSnapshotLoading ? '…' : dsoValue}
                </p>
                <p className="text-[12px] text-[var(--tx-3)]">jours</p>
                {snap && (
                  <p className="text-[11px] text-[var(--tx-3)] mt-1">
                    Snapshot · {fmtDate(snap.snapshot_at)}
                  </p>
                )}
              </div>
              <button
                onClick={() => dispatch(fetchLatestSnapshot())}
                className="text-xs font-medium text-[var(--p500)] hover:underline flex items-center gap-1"
              >
                Actualiser <ArrowRightIcon size={12} />
              </button>
            </div>
            {/* Gauge bar */}
            <div className="h-[8px] bg-[var(--bg-sink)] rounded-full overflow-hidden mb-2 relative">
              <div className="absolute inset-0 flex">
                <div className="h-full" style={{ width: `${(dsoObjectif / 90) * 100}%`, background: '#10B981' }} />
                <div className="h-full" style={{ width: `${(15 / 90) * 100}%`, background: '#F59E0B' }} />
                <div className="h-full flex-1" style={{ background: '#EF4444' }} />
              </div>
              {dsoValue > 0 && (
                <div
                  className="absolute top-0 h-full w-[3px] bg-[var(--tx-1)] rounded"
                  style={{ left: `${Math.min((dsoValue / 90) * 100, 98)}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[9px] text-[var(--tx-3)] mb-3">
              <span>0j</span><span>{dsoObjectif}j</span><span>60j</span><span>90j</span>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-[var(--bd-def)]">
              <div className="flex justify-between text-[12px]">
                <span className="text-[var(--tx-3)]">Objectif</span>
                <span className="font-semibold text-[var(--tx-1)]">
                  {dsoObjectif} jours
                  {dsoValue > dsoObjectif && (
                    <span className="text-[#F97316] ml-1">+{dsoValue - dsoObjectif}j écart</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[var(--tx-3)]">Créances en retard</span>
                <span className="font-semibold text-[#DC2626]">
                  {snap ? fmtM(snap.overdue_receivables) : '—'}
                </span>
              </div>
            </div>
          </FinCard>

          {/* Balance âgée (mock — pas de route API) */}
          <BalanceAgee
            total={snap?.total_receivables ?? 47_200_000}
            lignes={BALANCE_AGEE_MOCK}
          />
        </div>
      </div>

      {/* Toast */}
      <FloatingToast message={toast?.msg ?? null} type={toast?.type ?? 'error'} />
    </div>
  );
}
