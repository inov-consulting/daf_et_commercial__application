'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  ArrowsClockwiseIcon, CrosshairIcon, CheckCircleIcon, XCircleIcon,
  EyeIcon, BuildingsIcon, CalendarIcon, CaretDownIcon, CaretRightIcon,
  ClockIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchPredictions,
  validatePrediction,
  rejectPrediction,
  clearActionError,
  type ApiPrediction,
} from '@/redux/features/predictions/predictionsSlice';
import { PredictionDetailDrawer } from '@/components/predictions/prediction-detail-drawer';

// ── Constants ─────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'validated' | 'rejected';

const SCHEDULER_HISTORY = [
  { label: "Aujourd'hui à 08:15", status: 'ok',  count: 4 },
  { label: 'Hier à 08:12',        status: 'ok',  count: 3 },
  { label: '25 juil. à 08:19',   status: 'ok',  count: 5 },
  { label: '24 juil. à 08:08',   status: 'warn', count: 2 },
];

const TYPE_PALETTE: Record<string, { dot: string; bg: string; text: string }> = {
  renouvellement: { dot: '#22C55E', bg: '#F0FDF4', text: '#15803D' },
  upsell:         { dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  'nouveau besoin': { dot: '#6C4CE0', bg: '#EFEAFD', text: '#6C4CE0' },
  opportunité:    { dot: '#6B7280', bg: '#F9FAFB', text: '#4B5563' },
};

const TYPE_LABELS = Object.keys(TYPE_PALETTE) as string[];

function normalizeType(s: string): string {
  return s.toLowerCase().replace(/_/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const OPPORTUNITY_TYPE_DISPLAY: Record<string, string> = {
  upsell: 'Vente incitative',
};

function fmtOpportunityType(type: string): string {
  const lower = type.toLowerCase();
  if (OPPORTUNITY_TYPE_DISPLAY[lower]) return OPPORTUNITY_TYPE_DISPLAY[lower];
  const s = type.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getTypeColors(type: string) {
  const norm = normalizeType(type);
  for (const k of Object.keys(TYPE_PALETTE)) {
    if (norm.includes(normalizeType(k))) return TYPE_PALETTE[k];
  }
  return TYPE_PALETTE['opportunité'];
}

function confidenceTier(score: number): 'high' | 'mid' | 'low' {
  const pct = score > 1 ? score : score * 100;
  if (pct >= 70) return 'high';
  if (pct >= 40) return 'mid';
  return 'low';
}

const CONF_COLORS = {
  high: { bg: '#F0FDF4', text: '#15803D', label: 'Élevée' },
  mid:  { bg: '#FFFBEB', text: '#B45309', label: 'Modérée' },
  low:  { bg: '#F9FAFB', text: '#4B5563', label: 'Faible' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRevenue(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace('.', ',')} Mds FCFA`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)} M FCFA`;
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function fmtConfidence(score: number): number {
  return Math.round(score > 1 ? score : score * 100);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-[var(--bg-sink)]', className)} />;
}

// ── Action Card ───────────────────────────────────────────────────────────────

interface ActionCardProps {
  prediction: ApiPrediction;
  actionLoading: boolean;
  actionError: string | null;
  onOpenDetail: (prediction: ApiPrediction) => void;
  onValidate: (id: string, expected_revenue: number, notes: string) => void;
  onReject: (id: string, reason: string) => void;
  onClearError: (id: string) => void;
}

function ActionCard({
  prediction,
  actionLoading,
  actionError,
  onOpenDetail,
  onValidate,
  onReject,
  onClearError,
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);
  const [approveRevenue, setApproveRevenue] = useState(String(prediction.predicted_revenue ?? ''));
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [formError, setFormError] = useState('');

  const typeColors = getTypeColors(prediction.opportunity_type);
  const tier = confidenceTier(prediction.confidence_score);
  const confColors = CONF_COLORS[tier];
  const pct = fmtConfidence(prediction.confidence_score);
  const status = prediction.status;
  const isResolved = status === 'validated' || status === 'rejected';

  function handleConfirmApprove() {
    const rev = parseFloat(approveRevenue);
    if (isNaN(rev) || rev < 0) { setFormError('Veuillez saisir un CA valide (≥ 0).'); return; }
    setFormError('');
    onValidate(prediction.id, rev, approveNotes.trim());
    setConfirming(null);
  }

  function handleConfirmReject() {
    if (!rejectReason.trim()) { setFormError('La raison du rejet est requise.'); return; }
    setFormError('');
    onReject(prediction.id, rejectReason.trim());
    setConfirming(null);
  }

  function handleCancel() {
    setConfirming(null);
    setFormError('');
    onClearError(prediction.id);
  }

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isResolved && status === 'rejected' && 'opacity-50',
      )}
      style={{
        borderColor: 'var(--bd-def)',
        background: isResolved && status === 'validated' ? '#F0FDF4' : 'var(--bg-surf)',
      }}
    >
      <div className="p-4">
        {/* Top row: type + confidence + revenue */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: typeColors.bg, color: typeColors.text }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: typeColors.dot }} />
            {fmtOpportunityType(prediction.opportunity_type)}
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: confColors.bg, color: confColors.text }}
          >
            {pct}% - {confColors.label}
          </span>
          {prediction.predicted_revenue > 0 && (
            <span className="ml-auto text-[12px] font-semibold" style={{ color: 'var(--p500)' }}>
              {fmtRevenue(prediction.predicted_revenue)}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--tx-1)' }}>
          {prediction.partner_name}
        </div>

        {/* Summary */}
        <div className="text-[12px] leading-relaxed mb-3 prose-sm">
          {renderMarkdown(prediction.prediction_summary)}
        </div>

        {/* Suggested action - expandable */}
        {prediction.suggested_action && (
          <>
            <button
              className="flex items-center gap-1 text-[11px] font-medium mb-2 transition-colors hover:underline"
              style={{ color: 'var(--p500)' }}
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? <CaretDownIcon size={13} weight="bold" /> : <CaretRightIcon size={13} weight="bold" />}
              {expanded ? 'Masquer' : 'Action suggérée'}
            </button>
            {expanded && (
              <div
                className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed mb-3 prose-sm"
                style={{ background: 'var(--bg-sink)', color: 'var(--tx-2)', border: '1px solid var(--bd-def)' }}
              >
                {renderMarkdown(prediction.suggested_action)}
              </div>
            )}
          </>
        )}

        {/* Entity + date row */}
        <div className="flex items-center gap-3 text-[11px] mb-4" style={{ color: 'var(--tx-3)' }}>
          <span className="flex items-center gap-1">
            <BuildingsIcon size={12} />
            {prediction.partner_name}
          </span>
          <span className="flex items-center gap-1">
            <CalendarIcon size={12} />
            {fmtDate(prediction.created_at)}
          </span>
        </div>

        {/* Action error */}
        {actionError && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] mb-3"
            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
          >
            <WarningCircleIcon size={14} />
            {actionError}
          </div>
        )}

        {/* Status / confirmation / buttons */}
        {isResolved ? (
          <div className="flex items-center gap-3 flex-wrap">
            {status === 'validated' ? (
              <>
                <span
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: '#DCFCE7', color: '#15803D' }}
                >
                  <CheckCircleIcon size={14} weight="fill" />
                  Validée
                </span>
                {prediction.prospect_id && (
                  <span className="text-[11px] italic" style={{ color: 'var(--tx-3)' }}>
                    Prospect et lead Odoo créés automatiquement.
                  </span>
                )}
              </>
            ) : (
              <span
                className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: '#FEE2E2', color: '#DC2626' }}
              >
                <XCircleIcon size={14} weight="fill" />
                Rejetée
                {prediction.rejection_reason && (
                  <span className="font-normal ml-1">- {prediction.rejection_reason}</span>
                )}
              </span>
            )}
          </div>
        ) : confirming === 'approve' ? (
          <div
            className="rounded-lg p-3 space-y-3"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
          >
            <div className="text-[12px] font-semibold" style={{ color: '#15803D' }}>
              Valider la prédiction
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--tx-2)' }}>
                CA attendu (FCFA) *
              </label>
              <input
                type="number"
                min="0"
                value={approveRevenue}
                onChange={e => { setApproveRevenue(e.target.value); setFormError(''); }}
                className="w-full px-2.5 py-1.5 rounded-lg text-[12px] outline-none"
                style={{ border: '1px solid var(--bd-def)', background: 'white', color: 'var(--tx-1)' }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--tx-2)' }}>
                Notes (optionnel)
              </label>
              <textarea
                rows={2}
                value={approveNotes}
                onChange={e => setApproveNotes(e.target.value)}
                placeholder="Observations, contexte…"
                className="w-full px-2.5 py-1.5 rounded-lg text-[12px] outline-none resize-none"
                style={{ border: '1px solid var(--bd-def)', background: 'white', color: 'var(--tx-1)' }}
              />
            </div>
            {formError && (
              <p className="text-[11px]" style={{ color: '#DC2626' }}>{formError}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-white"
                style={{ color: 'var(--tx-2)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: '#22C55E' }}
              >
                <CheckCircleIcon size={13} weight="fill" />
                {actionLoading ? 'En cours…' : 'Confirmer'}
              </button>
            </div>
          </div>
        ) : confirming === 'reject' ? (
          <div
            className="rounded-lg p-3 space-y-3"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <div className="text-[12px] font-semibold" style={{ color: '#DC2626' }}>
              Rejeter la prédiction
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--tx-2)' }}>
                Raison du rejet *
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={e => { setRejectReason(e.target.value); setFormError(''); }}
                placeholder="Ex : client déjà contacté, non prioritaire…"
                maxLength={200}
                className="w-full px-2.5 py-1.5 rounded-lg text-[12px] outline-none"
                style={{ border: '1px solid var(--bd-def)', background: 'white', color: 'var(--tx-1)' }}
              />
            </div>
            {formError && (
              <p className="text-[11px]" style={{ color: '#DC2626' }}>{formError}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-white"
                style={{ color: 'var(--tx-2)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: '#EF4444' }}
              >
                <XCircleIcon size={13} weight="fill" />
                {actionLoading ? 'En cours…' : 'Confirmer'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-[var(--bg-sink)]"
              style={{ border: '1px solid var(--bd-def)', color: 'var(--tx-2)' }}
              onClick={() => onOpenDetail(prediction)}
            >
              <EyeIcon size={13} />
              Détails
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
              style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
              onClick={() => { setConfirming('approve'); setFormError(''); onClearError(prediction.id); }}
            >
              <CheckCircleIcon size={13} weight="fill" />
              Approuver
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              onClick={() => { setConfirming('reject'); setFormError(''); onClearError(prediction.id); }}
            >
              <XCircleIcon size={13} weight="fill" />
              Rejeter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PredictionsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error, actionLoading, actionError } = useAppSelector(s => s.predictions);

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<ApiPrediction | null>(null);

  const load = useCallback(
    (status: StatusFilter) => {
      dispatch(fetchPredictions(status === 'all' ? {} : { status }));
    },
    [dispatch],
  );

  useEffect(() => { load(filter); }, [filter, load]);

  async function handleRefresh() {
    setRefreshing(true);
    await dispatch(fetchPredictions(filter === 'all' ? {} : { status: filter }));
    setRefreshing(false);
  }

  function handleValidate(id: string, expected_revenue: number, notes: string) {
    dispatch(validatePrediction({ id, expected_revenue, notes }));
  }

  function handleReject(id: string, reason: string) {
    dispatch(rejectPrediction({ id, reason }));
  }

  function handleClearError(id: string) {
    dispatch(clearActionError(id));
  }

  const pendingCount = items.filter(p => p.status === 'pending').length;
  const totalRevenue = items.reduce((acc, p) => acc + (p.predicted_revenue ?? 0), 0);
  const avgConfidence = items.length
    ? Math.round(items.reduce((acc, p) => acc + fmtConfidence(p.confidence_score), 0) / items.length)
    : 0;
  const uniquePartners = new Set(items.map(p => p.partner_id)).size;

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'Toutes' },
    { key: 'pending',   label: 'En attente' },
    { key: 'validated', label: 'Validées' },
    { key: 'rejected',  label: 'Rejetées' },
  ];

  return (
    <>
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                Prédiction Agent Commercial
              </h1>
            </div>
            <p className="text-[13px]" style={{ color: 'var(--tx-2)' }}>
              Agent prédictif DCom - anticipe les besoins clients et propose des actions
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Status filter */}
            <div
              className="flex items-center p-0.5 rounded-lg"
              style={{ background: 'var(--bg-sink)', border: '1px solid var(--bd-def)' }}
            >
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
                    filter === f.key
                      ? 'bg-white shadow-sm text-[var(--tx-1)]'
                      : 'text-[var(--tx-3)] hover:text-[var(--tx-2)]',
                  )}
                  style={filter === f.key ? { border: '1px solid var(--bd-def)' } : {}}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Actualiser */}
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-70"
              style={{ background: 'var(--grad)' }}
            >
              <ArrowsClockwiseIcon
                size={15}
                weight="bold"
                className={(loading || refreshing) ? 'animate-spin' : ''}
              />
              Actualiser
            </button>
          </div>
        </div>

        {/* ── Global error ───────────────────────────────────────────── */}
        {error && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-[13px]"
            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
          >
            <WarningCircleIcon size={16} />
            {error}
          </div>
        )}

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-surf)', border: '1px solid var(--bd-def)' }}>
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-7 w-32 mb-1.5" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          ) : (
            [
              { label: 'Clients analysés',       value: String(uniquePartners || items.length), sub: 'partenaires distincts',     color: 'var(--p500)' },
              { label: 'CA potentiel identifié', value: fmtRevenue(totalRevenue),              sub: 'toutes prédictions',         color: '#6C4CE0'     },
              { label: 'Confiance moyenne',       value: `${avgConfidence} %`,                  sub: `sur ${items.length} entrée${items.length !== 1 ? 's' : ''}`, color: '#F59E0B' },
            ].map(card => (
              <div
                key={card.label}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-surf)', border: '1px solid var(--bd-def)' }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx-3)' }}>
                  {card.label}
                </div>
                <div className="text-[22px] font-bold mb-0.5" style={{ color: card.color }}>
                  {card.value}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                  {card.sub}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Main: agent card + side panel ──────────────────────────── */}
        <div className="flex gap-5 items-start">

          {/* Left: agent card */}
          <div
            className="flex-1 min-w-0 rounded-xl"
            style={{ background: 'var(--bg-surf)', border: '1px solid var(--bd-def)' }}
          >
            {/* Card header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--bd-def)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--grad)' }}
                >
                  <CrosshairIcon size={16} weight="fill" className="text-white" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--tx-1)' }}>
                    Agent Prédictif DCom
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                    Propositions générées automatiquement
                  </div>
                </div>
              </div>
              {pendingCount > 0 && (
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: '#EFEAFD', color: '#6C4CE0' }}
                >
                  +{pendingCount} en attente
                </span>
              )}
            </div>

            {/* Action cards */}
            <div className="p-4 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 space-y-2.5"
                    style={{ border: '1px solid var(--bd-def)' }}
                  >
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-28 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-[13px]" style={{ color: 'var(--tx-3)' }}>
                  Aucune prédiction{filter !== 'all' ? ' pour ce filtre' : ''}.
                </div>
              ) : (
                items.map(p => (
                  <ActionCard
                    key={p.id}
                    prediction={p}
                    actionLoading={!!actionLoading[p.id]}
                    actionError={actionError[p.id] ?? null}
                    onOpenDetail={setSelectedPrediction}
                    onValidate={handleValidate}
                    onReject={handleReject}
                    onClearError={handleClearError}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: side panel */}
          <div className="w-[260px] flex-shrink-0 space-y-4 sticky top-6">

            {/* Scheduler IA */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-surf)', border: '1px solid var(--bd-def)' }}
            >
              <div
                className="flex items-center gap-2 mb-3 pb-3"
                style={{ borderBottom: '1px solid var(--bd-def)' }}
              >
                <ClockIcon size={15} style={{ color: 'var(--p500)' }} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--tx-1)' }}>
                  Scheduler IA
                </span>
              </div>

              <div className="text-[11px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: 'var(--tx-3)' }}>
                Dernier passage
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-[12px] font-medium" style={{ color: 'var(--tx-1)' }}>
                  Aujourd&apos;hui à 08:15
                </span>
              </div>

              <div className="text-[11px] uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--tx-3)' }}>
                Historique
              </div>
              <div className="space-y-2">
                {SCHEDULER_HISTORY.map((h, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: 'var(--tx-2)' }}>{h.label}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: h.status === 'ok' ? '#F0FDF4' : '#FFFBEB',
                        color:      h.status === 'ok' ? '#15803D' : '#B45309',
                      }}
                    >
                      {h.count} prop.
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Types de propositions */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-surf)', border: '1px solid var(--bd-def)' }}
            >
              <div
                className="text-[13px] font-semibold mb-3 pb-3"
                style={{ color: 'var(--tx-1)', borderBottom: '1px solid var(--bd-def)' }}
              >
                Types de propositions
              </div>
              <div className="space-y-2.5">
                {TYPE_LABELS.map(key => {
                  const c = TYPE_PALETTE[key];
                  const count = items.filter(p => normalizeType(p.opportunity_type).includes(normalizeType(key))).length;
                  const label = fmtOpportunityType(key);
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                        <span className="text-[12px]" style={{ color: 'var(--tx-2)' }}>{label}</span>
                      </div>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: c.bg, color: c.text }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>

    {/* Drawer détail */}
    <PredictionDetailDrawer
      prediction={selectedPrediction}
      actionLoading={selectedPrediction ? !!actionLoading[selectedPrediction.id] : false}
      actionError={selectedPrediction ? (actionError[selectedPrediction.id] ?? null) : null}
      onClose={() => setSelectedPrediction(null)}
      onValidate={handleValidate}
      onReject={handleReject}
      onClearError={handleClearError}
    />
    </>
  );
}
