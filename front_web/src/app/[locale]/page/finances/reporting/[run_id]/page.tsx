'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchRun, approveAction, rejectAction } from '@/redux/features/daf/dafSlice';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { FinCard, FinCardHeader, SectionLabel } from '@/components/finance/fin-card';
import {
  ArrowLeftIcon, PlayIcon, MagnifyingGlassIcon, InfoIcon,
  LightningIcon, CheckCircleIcon, WarningIcon, ClockIcon,
  SpinnerGapIcon, CheckIcon, XIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { DafRunEvent, DafSnapshot, DafProposedAction } from '@/types/daf_type';

/* ── Helpers ─────────────────────────────────────────────────────── */

function fmtPeriodLabel(label: string) {
  // "2026-07" → "Juillet 2026"
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split('-');
    return new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase());
  }
  return label;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDuration(start: string, end: string | null) {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s  = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

function fmtM(v: number | null | undefined): string {
  if (v == null || v === undefined) return '_';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}Md`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString('fr-FR');
}

/* ── Event icon & color ──────────────────────────────────────────── */

const EVENT_CONFIG: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  agent_start:     { Icon: PlayIcon,            color: '#1B6B45', bg: 'rgba(16,185,129,.12)' },
  analysis:        { Icon: MagnifyingGlassIcon, color: '#4338CA', bg: 'rgba(99,102,241,.12)'  },
  info:            { Icon: InfoIcon,            color: '#6B7280', bg: 'rgba(107,114,128,.12)' },
  action_proposed: { Icon: LightningIcon,       color: '#B45309', bg: 'rgba(245,158,11,.12)'  },
  action_executed: { Icon: CheckCircleIcon,     color: '#1B6B45', bg: 'rgba(16,185,129,.12)'  },
};

function eventConfig(type: string) {
  return EVENT_CONFIG[type] ?? { Icon: InfoIcon, color: '#6B7280', bg: 'rgba(107,114,128,.12)' };
}

/* ── Payload renderers ───────────────────────────────────────────── */

interface Invoice { id: number; name: string; partner_name: string; amount_residual: number; days_overdue: number; }
interface Bucket  { label: string; count: number; amount: number; }
interface Debtor  { partner_name: string; total_overdue: number; max_days_overdue: number; }
interface Account { name: string; type: string; balance: number; }

function PayloadPanel({ payload }: { payload: Record<string, unknown> }) {
  const invoices    = (payload.invoices   as Invoice[]  | undefined) ?? [];
  const buckets     = (payload.buckets    as Bucket[]   | undefined) ?? [];
  const top_debtors = (payload.top_debtors as Debtor[]  | undefined) ?? [];
  const accounts    = (payload.accounts   as Account[]  | undefined) ?? [];

  if (invoices.length > 0) return (
    <div className="mt-2 rounded-lg overflow-hidden border border-[var(--bd-def)]">
      <table className="w-full text-[11px]">
        <thead><tr className="bg-[var(--bg-sink)]">
          {['Facture', 'Client', 'Montant', 'Retard'].map(h => (
            <th key={h} className="px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)]">{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-[var(--bd-def)]">
          {invoices.map(inv => (
            <tr key={inv.id}>
              <td className="px-3 py-1.5 font-mono text-[var(--p500)]">{inv.name}</td>
              <td className="px-3 py-1.5 text-[var(--tx-1)]">{inv.partner_name}</td>
              <td className="px-3 py-1.5 font-mono font-semibold text-[var(--tx-1)]">{fmtM(inv.amount_residual)} XAF</td>
              <td className="px-3 py-1.5 font-semibold text-[#F97316]">{inv.days_overdue}j</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (buckets.length > 0) {
    const total = buckets.reduce((s, b) => s + b.amount, 0) || 1;
    return (
      <div className="mt-2 space-y-1.5">
        {buckets.map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--tx-3)] w-14 flex-shrink-0">{b.label}</span>
            <div className="flex-1 h-[5px] bg-[var(--bg-sink)] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#4338CA]" style={{ width: `${Math.round((b.amount / total) * 100)}%` }} />
            </div>
            <span className="text-[11px] font-mono text-[var(--tx-2)] w-20 text-right flex-shrink-0">{fmtM(b.amount)} XAF</span>
            <span className="text-[10px] text-[var(--tx-3)] w-8 text-right flex-shrink-0">{b.count} fact.</span>
          </div>
        ))}
      </div>
    );
  }

  if (top_debtors.length > 0) return (
    <div className="mt-2 space-y-1">
      {top_debtors.map((d, i) => (
        <div key={i} className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--tx-2)]">{d.partner_name}</span>
          <span className="font-mono font-semibold text-[#DC2626]">{fmtM(d.total_overdue)} XAF · {d.max_days_overdue}j</span>
        </div>
      ))}
    </div>
  );

  if (accounts.length > 0) return (
    <div className="mt-2 space-y-1">
      {accounts.map((a, i) => (
        <div key={i} className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--tx-2)]">{a.name}</span>
          <span className={cn('font-mono font-semibold', a.balance === 0 ? 'text-[#EF4444]' : 'text-[var(--tx-1)]')}>{fmtM(a.balance)} XAF</span>
        </div>
      ))}
    </div>
  );

  return null;
}

/* ── Snapshot KPIs ───────────────────────────────────────────────── */

function SnapshotKpis({ snap }: { snap: DafSnapshot }) {
  const kpis = [
    { label: 'Créances totales',   value: `${fmtM(snap.total_receivables)} XAF`,   sub: `${snap.overdue_receivables_count === null ? 0 : snap.overdue_receivables_count} en retard`, accent: '#4338CA' },
    { label: 'DSO',                value: `${snap.dso_days === null ? 0 : snap.dso_days} jours`,                sub: snap.dso_days > 45 ? 'Au-dessus de l\'objectif' : 'Dans l\'objectif', accent: snap.dso_days > 45 ? '#F97316' : '#1B6B45' },
    { label: 'Dettes fournisseurs',value: `${fmtM(snap.total_payables)} XAF`,      sub: `${snap.overdue_payables_count === null ? 0 : snap.overdue_payables_count} en retard`,    accent: '#6B7280'  },
    { label: 'Position trésorerie',value: `${fmtM(snap.cash_position)} XAF`,       sub: snap.cash_position === 0 ? 'Trésorerie critique' : 'Solde disponible', accent: snap.cash_position === 0 ? '#DC2626' : '#1B6B45' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="bg-[var(--bg-sink)] rounded-xl p-3">
          <p className="text-[10px] text-[var(--tx-3)] mb-1">{k.label}</p>
          <p className="font-display font-bold text-base leading-tight" style={{ color: k.accent }}>{k.value}</p>
          <p className="text-[10px] text-[var(--tx-3)] mt-0.5">{k.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Action card ─────────────────────────────────────────────────── */

const PRIORITY_CONFIG = {
  critical: { label: 'Critique', color: '#DC2626', bg: 'rgba(239,68,68,.1)' },
  high:     { label: 'Haute',    color: '#F97316', bg: 'rgba(249,115,22,.1)' },
  medium:   { label: 'Moyenne',  color: '#B45309', bg: 'rgba(245,158,11,.1)' },
  low:      { label: 'Faible',   color: '#6B7280', bg: 'rgba(107,114,128,.1)' },
} as const;

function ActionCard({
  action, decidingId, onApprove, onReject,
}: {
  action:    DafProposedAction;
  decidingId: string | null;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
}) {
  const p       = PRIORITY_CONFIG[action.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
  const loading = decidingId === action.id;
  const isPending = action.status === 'pending';

  return (
    <div className="rounded-xl border border-[var(--bd-def)] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold text-[var(--tx-1)] leading-snug">{action.title}</p>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color: p.color, background: p.bg }}>
          {p.label}
        </span>
      </div>
      <p className="text-[11px] text-[var(--tx-2)] leading-relaxed">{action.description}</p>
      {action.reasoning && (
        <p className="text-[11px] text-[var(--tx-3)] italic leading-relaxed border-l-2 border-[var(--bd-def)] pl-2">{action.reasoning}</p>
      )}
      {isPending ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onApprove(action.id)}
            disabled={loading}
            className="flex-1 h-7 rounded-lg bg-[rgba(16,185,129,.1)] text-[#1B6B45] text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-[rgba(16,185,129,.2)] transition-colors disabled:opacity-50"
          >
            {loading ? <SpinnerGapIcon size={12} className="animate-spin" /> : <CheckIcon size={12} />}
            Approuver
          </button>
          <button
            onClick={() => onReject(action.id)}
            disabled={loading}
            className="flex-1 h-7 rounded-lg bg-[rgba(239,68,68,.1)] text-[#DC2626] text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-[rgba(239,68,68,.2)] transition-colors disabled:opacity-50"
          >
            {loading ? <SpinnerGapIcon size={12} className="animate-spin" /> : <XIcon size={12} />}
            Rejeter
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 pt-1">
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            action.status === 'approved'  ? 'bg-[rgba(16,185,129,.1)] text-[#1B6B45]' :
            action.status === 'rejected'  ? 'bg-[rgba(239,68,68,.1)] text-[#DC2626]'  :
            action.status === 'executed'  ? 'bg-[rgba(99,102,241,.1)] text-[#4338CA]' :
            'bg-[var(--bg-sink)] text-[var(--tx-3)]',
          )}>
            {action.status}
          </span>
          {action.decided_at && (
            <span className="text-[10px] text-[var(--tx-3)]">· {fmtDate(action.decided_at)}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Status badge ────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    completed: { label: 'Complété',  bg: 'rgba(16,185,129,.1)',  text: '#1B6B45' },
    running:   { label: 'En cours',  bg: 'rgba(99,102,241,.1)',  text: '#4338CA' },
    failed:    { label: 'Échec',     bg: 'rgba(239,68,68,.1)',   text: '#DC2626' },
    pending:   { label: 'En attente',bg: 'rgba(245,158,11,.1)', text: '#B45309' },
  }[status] ?? { label: status, bg: 'var(--bg-sink)', text: 'var(--tx-3)' };
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function RunDetailPage() {
  const router   = useRouter();
  const params   = useParams();
  const locale   = typeof params?.locale  === 'string' ? params.locale  : 'fr';
  const runId    = typeof params?.run_id  === 'string' ? params.run_id  : '';

  const dispatch    = useAppDispatch();
  const { currentRun, currentRunLoading, currentRunError, decidingId } = useAppSelector(s => s.daf);

  useEffect(() => {
    if (runId) dispatch(fetchRun(runId));
  }, [dispatch, runId]);

  const run = currentRun?.id === runId ? currentRun : null;

  /* Loading */
  if (currentRunLoading && !run) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <SpinnerGapIcon size={32} className="animate-spin text-[var(--p500)]" />
      </div>
    );
  }

  /* Error */
  if (currentRunError && !run) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-3">
        <WarningIcon size={32} className="text-[#EF4444]" />
        <p className="text-sm text-[var(--tx-2)]">{currentRunError}</p>
      </div>
    );
  }

  if (!run) return null;

  const snap = run.snapshots[0] ?? null;

  return (
    <div className="p-3 sm:p-4 md:p-6">

      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <button
          onClick={() => router.push(`/${locale}/page/finances/reporting`)}
          className="w-8 h-8 rounded-lg border border-[var(--bd-def)] flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0 mt-0.5"
        >
          <ArrowLeftIcon size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-lg text-[var(--tx-1)]">Cycle Agent DAF</h1>
            <StatusBadge status={run.status} />
            <span className="text-[11px] text-[var(--tx-3)] bg-[var(--bg-sink)] px-2 py-0.5 rounded-full font-mono">{run.trigger}</span>
          </div>
          <p className="text-[12px] text-[var(--tx-3)] mt-0.5">
            {fmtDate(run.started_at)}
            {run.ended_at && (
              <> · Durée : {fmtDuration(run.started_at, run.ended_at)}</>
            )}
            {run.proposed_actions_count > 0 && (
              <> · <span className="font-semibold text-[var(--p500)]">{run.proposed_actions_count} actions proposées</span></>
            )}
          </p>
          <p className="text-[10px] text-[var(--tx-3)] font-mono mt-0.5 truncate">{run.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">

        {/* Colonne gauche : timeline + snapshot */}
        <div className="flex flex-col gap-4">

          {/* Timeline des événements */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader
                title="Journal d'exécution"
                badge={
                  <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] px-2 py-0.5 rounded-full">
                    {run.events.length} événements
                  </span>
                }
              />
            </div>
            <div className="px-4 sm:px-5 pb-4 relative">
              {/* Ligne verticale */}
              <div className="absolute left-[28px] sm:left-[32px] top-0 bottom-4 w-px bg-[var(--bd-def)]" />

              <div className="space-y-3">
                {run.events.map((ev: DafRunEvent, i: number) => {
                  const cfg = eventConfig(ev.event_type);
                  return (
                    <div key={ev.id ?? i} className="flex gap-3 relative">
                      {/* Dot */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ background: cfg.bg }}
                      >
                        <cfg.Icon size={13} weight="fill" style={{ color: cfg.color }} />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] text-[var(--tx-1)] leading-snug">{ev.message}</p>
                          <span className="text-[10px] text-[var(--tx-3)] flex-shrink-0 font-mono">
                            {new Date(ev.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        {ev.payload && <PayloadPanel payload={ev.payload} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </FinCard>

          {/* Snapshot financier */}
          {snap && (
            <FinCard>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Snapshot financier · {fmtPeriodLabel(snap.period_label)}</SectionLabel>
                <span className="text-[10px] text-[var(--tx-3)] font-mono">{fmtDate(snap.snapshot_at)}</span>
              </div>
              <SnapshotKpis snap={snap} />
            </FinCard>
          )}
        </div>

        {/* Colonne droite : synthèse + actions */}
        <div className="flex flex-col gap-4">

          {/* Synthèse IA */}
          {run.summary && (
            <FinCard className="border-[rgba(16,185,129,.3)] bg-[rgba(16,185,129,.03)]">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ background: 'var(--grad)' }}
                >
                  IA
                </span>
                <p className="text-[12px] font-semibold text-[var(--tx-1)]">Synthèse IA</p>
              </div>
              <div className="prose-sm max-h-80 overflow-y-auto pr-1">
                {renderMarkdown(run.summary)}
              </div>
            </FinCard>
          )}

          {/* Actions proposées */}
          <FinCard padding={false}>
            <div className="px-4 pt-4 pb-2">
              <FinCardHeader
                title="Actions proposées"
                badge={
                  run.proposed_actions.length > 0 ? (
                    <span className="text-[10px] font-semibold text-[var(--p600)] bg-[rgba(99,102,241,.08)] px-2 py-0.5 rounded-full">
                      {run.proposed_actions.filter(a => a.status === 'pending').length} en attente
                    </span>
                  ) : undefined
                }
              />
            </div>
            <div className="px-4 pb-4 space-y-3">
              {run.proposed_actions.length === 0 ? (
                <p className="text-[12px] text-[var(--tx-3)] italic">Aucune action proposée lors de ce cycle.</p>
              ) : (
                run.proposed_actions.map(a => (
                  <ActionCard
                    key={a.id}
                    action={a}
                    decidingId={decidingId}
                    onApprove={id => dispatch(approveAction({ actionId: id }))}
                    onReject={id  => dispatch(rejectAction({ actionId: id }))}
                  />
                ))
              )}
            </div>
          </FinCard>

          {/* Méta run */}
          <FinCard>
            <SectionLabel className="mb-3">Métadonnées</SectionLabel>
            <div className="space-y-1.5 text-[12px]">
              {[
                { label: 'ID', value: run.id.slice(0, 8) + '…', mono: true },
                { label: 'Déclencheur', value: run.trigger },
                { label: 'Démarré',    value: fmtDate(run.started_at) },
                { label: 'Terminé',    value: run.ended_at ? fmtDate(run.ended_at) : '—' },
                { label: 'Durée',      value: fmtDuration(run.started_at, run.ended_at) },
                { label: 'Snapshots',  value: `${run.snapshots.length}` },
                { label: 'Événements', value: `${run.events.length}` },
              ].map(m => (
                <div key={m.label} className="flex justify-between gap-2">
                  <span className="text-[var(--tx-3)]">{m.label}</span>
                  <span className={cn('text-[var(--tx-1)]', m.mono && 'font-mono text-[11px]')}>{m.value}</span>
                </div>
              ))}
            </div>
            {run.error && (
              <div className="mt-3 pt-3 border-t border-[var(--bd-def)]">
                <p className="text-[10px] font-bold uppercase text-[#DC2626] mb-1">Erreur</p>
                <p className="text-[11px] text-[#DC2626] font-mono break-words">{run.error}</p>
              </div>
            )}
          </FinCard>
        </div>
      </div>
    </div>
  );
}
