'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  XIcon, CrosshairIcon, CheckCircleIcon, XCircleIcon,
  BuildingsIcon, CalendarIcon, WarningCircleIcon, LinkSimpleIcon, ArrowSquareOutIcon,
} from '@phosphor-icons/react';
import { renderMarkdown } from '@/lib/renderMarkdown';
import type { ApiPrediction } from '@/redux/features/predictions/predictionsSlice';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_PALETTE: Record<string, { dot: string; bg: string; text: string }> = {
  renouvellement:   { dot: '#22C55E', bg: '#F0FDF4', text: '#15803D' },
  upsell:           { dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  'nouveau besoin': { dot: '#6C4CE0', bg: '#EFEAFD', text: '#6C4CE0' },
  opportunité:      { dot: '#6B7280', bg: '#F9FAFB', text: '#4B5563' },
};

function normalizeType(s: string): string {
  return s.toLowerCase().replace(/_/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function fmtOpportunityType(type: string): string {
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

function fmtRevenue(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace('.', ',')} Mds FCFA`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)} M FCFA`;
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function fmtConfidence(score: number): number {
  return Math.round(score > 1 ? score : score * 100);
}

const DATA_SOURCE_LABELS: Record<string, string> = {
  has_shipments:          'Dossiers d\'envoi',
  has_web_enrichment:     'Enrichissement web',
  has_transport_history:  'Historique transport',
  generated_at:           'Généré le',
};

function fmtSnakeLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDatetime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const CONF_COLORS = {
  high: { bg: '#F0FDF4', text: '#15803D', label: 'Élevée' },
  mid:  { bg: '#FFFBEB', text: '#B45309', label: 'Modérée' },
  low:  { bg: '#F9FAFB', text: '#4B5563', label: 'Faible' },
};

function confidenceTier(score: number): 'high' | 'mid' | 'low' {
  const pct = score > 1 ? score : score * 100;
  if (pct >= 70) return 'high';
  if (pct >= 40) return 'mid';
  return 'low';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  prediction: ApiPrediction | null;
  actionLoading: boolean;
  actionError: string | null;
  onClose: () => void;
  onValidate: (id: string, expected_revenue: number, notes: string) => void;
  onReject: (id: string, reason: string) => void;
  onClearError: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PredictionDetailDrawer({
  prediction,
  actionLoading,
  actionError,
  onClose,
  onValidate,
  onReject,
  onClearError,
}: Props) {
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);
  const [approveRevenue, setApproveRevenue] = useState('');
  const [approveNotes, setApproveNotes]     = useState('');
  const [rejectReason, setRejectReason]     = useState('');
  const [formError, setFormError]           = useState('');

  if (!prediction) return null;

  const typeColors  = getTypeColors(prediction.opportunity_type);
  const tier        = confidenceTier(prediction.confidence_score);
  const confColors  = CONF_COLORS[tier];
  const pct         = fmtConfidence(prediction.confidence_score);
  const isPending   = prediction.status === 'pending';
  const isValidated = prediction.status === 'validated';
  const isRejected  = prediction.status === 'rejected';

  const hasDataSources = prediction.data_sources &&
    Object.keys(prediction.data_sources).length > 0;

  function handleOpenApprove() {
    setApproveRevenue(String(prediction!.predicted_revenue ?? ''));
    setApproveNotes('');
    setFormError('');
    onClearError(prediction!.id);
    setConfirming('approve');
  }

  function handleOpenReject() {
    setRejectReason('');
    setFormError('');
    onClearError(prediction!.id);
    setConfirming('reject');
  }

  function handleConfirmApprove() {
    const rev = parseFloat(approveRevenue);
    if (isNaN(rev) || rev < 0) { setFormError('Veuillez saisir un CA valide (≥ 0).'); return; }
    setFormError('');
    onValidate(prediction!.id, rev, approveNotes.trim());
    setConfirming(null);
  }

  function handleConfirmReject() {
    if (!rejectReason.trim()) { setFormError('La raison du rejet est requise.'); return; }
    setFormError('');
    onReject(prediction!.id, rejectReason.trim());
    setConfirming(null);
  }

  function handleCancel() {
    setConfirming(null);
    setFormError('');
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surf)' }}
      >
        {/* Gradient top bar */}
        <div className="h-[3px] w-full flex-shrink-0" style={{ background: 'var(--grad)' }} />

        {/* Header */}
        <div
          className="flex items-start gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--bd-def)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'var(--grad)' }}
          >
            <CrosshairIcon size={18} weight="fill" className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold truncate mb-1" style={{ color: 'var(--tx-1)' }}>
              {prediction.partner_name}
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: typeColors.bg, color: typeColors.text }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: typeColors.dot }} />
              {fmtOpportunityType(prediction.opportunity_type)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[var(--bg-sink)]"
            style={{ color: 'var(--tx-2)' }}
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Status */}
          <div className="flex items-center gap-2">
            {isPending && (
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#EFEAFD', color: '#6C4CE0' }}
              >
                En attente
              </span>
            )}
            {isValidated && (
              <span
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#DCFCE7', color: '#15803D' }}
              >
                <CheckCircleIcon size={12} weight="fill" />
                Validée
              </span>
            )}
            {isRejected && (
              <span
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#FEE2E2', color: '#DC2626' }}
              >
                <XCircleIcon size={12} weight="fill" />
                Rejetée
              </span>
            )}
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-sink)', border: '1px solid var(--bd-def)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--tx-3)' }}>
                Confiance
              </div>
              <span
                className="text-[14px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: confColors.bg, color: confColors.text }}
              >
                {pct}% - {confColors.label}
              </span>
            </div>
            {prediction.predicted_revenue > 0 && (
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-sink)', border: '1px solid var(--bd-def)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--tx-3)' }}>
                  CA prédit
                </div>
                <div className="text-[14px] font-bold" style={{ color: 'var(--p500)' }}>
                  {fmtRevenue(prediction.predicted_revenue)}
                </div>
              </div>
            )}
          </div>

          {/* Résumé de prédiction */}
          {prediction.prediction_summary && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx-3)' }}>
                Résumé de prédiction
              </h3>
              <div className="text-[13px] leading-relaxed" style={{ color: 'var(--tx-1)' }}>
                {renderMarkdown(prediction.prediction_summary)}
              </div>
            </section>
          )}

          {/* Action suggérée */}
          {prediction.suggested_action && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx-3)' }}>
                Action suggérée
              </h3>
              <div
                className="rounded-xl px-4 py-3 text-[13px] leading-relaxed"
                style={{
                  borderLeft: '3px solid var(--p500)',
                  background: 'var(--bg-sink)',
                  color: 'var(--tx-1)',
                }}
              >
                {renderMarkdown(prediction.suggested_action)}
              </div>
            </section>
          )}

          {/* Sources de données */}
          {hasDataSources && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx-3)' }}>
                Sources de données
              </h3>
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--bd-def)' }}
              >
                {Object.entries(prediction.data_sources).map(([key, value], idx, arr) => {
                  const label = DATA_SOURCE_LABELS[key] ?? fmtSnakeLabel(key);
                  const isLast = idx === arr.length - 1;
                  const isBool = typeof value === 'boolean';
                  const isDate = key === 'generated_at' && typeof value === 'string';

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between px-3 py-2.5"
                      style={{
                        borderBottom: isLast ? 'none' : '1px solid var(--bd-def)',
                        background: 'var(--bg-surf)',
                      }}
                    >
                      <span className="text-[12px]" style={{ color: 'var(--tx-2)' }}>
                        {label}
                      </span>

                      {isBool ? (
                        <span
                          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={
                            value
                              ? { background: '#F0FDF4', color: '#15803D' }
                              : { background: '#F9FAFB', color: '#9CA3AF' }
                          }
                        >
                          {value ? (
                            <CheckCircleIcon size={12} weight="fill" />
                          ) : (
                            <XCircleIcon size={12} weight="fill" />
                          )}
                          {value ? 'Oui' : 'Non'}
                        </span>
                      ) : isDate ? (
                        <span className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                          {fmtDatetime(value as string)}
                        </span>
                      ) : (
                        <span className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                          {String(value)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Résultat (si validée ou rejetée) */}
          {(isValidated || isRejected) && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx-3)' }}>
                Résultat
              </h3>
              <div className="space-y-2 text-[12px]">
                {isValidated && prediction.prospect_id && (
                  <Link
                    href={`/${locale}/page/prospects/${prediction.prospect_id}`}
                    onClick={onClose}
                    className="flex items-center gap-2 group w-fit rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[var(--bg-sink)]"
                    style={{ color: 'var(--tx-2)' }}
                  >
                    <LinkSimpleIcon size={13} style={{ color: 'var(--p500)' }} />
                    <span className="text-[12px]">Prospect créé</span>
                    <span
                      className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--bg-sink)' }}
                    >
                      {prediction.prospect_id.slice(0, 8).toUpperCase()}
                    </span>
                    <ArrowSquareOutIcon
                      size={12}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--p500)' }}
                    />
                  </Link>
                )}
                {isValidated && prediction.odoo_lead_id != null && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--tx-2)' }}>
                    <LinkSimpleIcon size={13} style={{ color: 'var(--p500)' }} />
                    Lead Odoo - #{prediction.odoo_lead_id}
                  </div>
                )}
                {isRejected && prediction.rejection_reason && (
                  <div
                    className="rounded-lg px-3 py-2"
                    style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                  >
                    <span className="font-semibold">Raison : </span>
                    {prediction.rejection_reason}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Métadonnées */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx-3)' }}>
              Informations
            </h3>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center gap-2" style={{ color: 'var(--tx-2)' }}>
                <BuildingsIcon size={13} style={{ color: 'var(--tx-3)' }} />
                Partenaire ID : {prediction.partner_id}
              </div>
              <div className="flex items-center gap-2" style={{ color: 'var(--tx-2)' }}>
                <CalendarIcon size={13} style={{ color: 'var(--tx-3)' }} />
                Créée le {fmtDatetime(prediction.created_at)}
              </div>
              {isValidated && prediction.validated_at && (
                <div className="flex items-center gap-2" style={{ color: '#15803D' }}>
                  <CheckCircleIcon size={13} weight="fill" />
                  Validée le {fmtDatetime(prediction.validated_at)}
                </div>
              )}
              {isRejected && prediction.rejected_at && (
                <div className="flex items-center gap-2" style={{ color: '#DC2626' }}>
                  <XCircleIcon size={13} weight="fill" />
                  Rejetée le {fmtDatetime(prediction.rejected_at)}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Footer - actions si en attente */}
        {isPending && (
          <div
            className="flex-shrink-0 px-5 py-4 space-y-3"
            style={{ borderTop: '1px solid var(--bd-def)', background: 'var(--bg-surf)' }}
          >
            {/* Action error */}
            {actionError && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                <WarningCircleIcon size={14} />
                {actionError}
              </div>
            )}

            {/* Confirm approve form */}
            {confirming === 'approve' && (
              <div
                className="rounded-xl p-3 space-y-3"
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
                {formError && <p className="text-[11px]" style={{ color: '#DC2626' }}>{formError}</p>}
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
            )}

            {/* Confirm reject form */}
            {confirming === 'reject' && (
              <div
                className="rounded-xl p-3 space-y-3"
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
                {formError && <p className="text-[11px]" style={{ color: '#DC2626' }}>{formError}</p>}
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
            )}

            {/* Quick action buttons */}
            {!confirming && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenReject}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                  style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                >
                  <XCircleIcon size={15} weight="fill" />
                  Rejeter
                </button>
                <button
                  onClick={handleOpenApprove}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors"
                  style={{ background: 'var(--grad)' }}
                >
                  <CheckCircleIcon size={15} weight="fill" />
                  Approuver
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
