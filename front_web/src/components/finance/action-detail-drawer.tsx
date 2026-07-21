'use client';

import { XIcon, CheckIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { DafProposedAction } from '@/types/daf_type';

const PRIORITY_CONFIG = {
  critical: { label: 'Critique', color: '#DC2626', bg: 'rgba(239,68,68,.12)' },
  high:     { label: 'Haute',    color: '#F97316', bg: 'rgba(249,115,22,.12)' },
  medium:   { label: 'Moyenne',  color: '#B45309', bg: 'rgba(245,158,11,.12)' },
  low:      { label: 'Faible',   color: '#6B7280', bg: 'rgba(107,114,128,.12)' },
} as const;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:  { label: 'En attente', className: 'bg-[rgba(245,158,11,.1)] text-[#B45309]'  },
  approved: { label: 'Approuvé',   className: 'bg-[rgba(16,185,129,.1)] text-primary' },
  rejected: { label: 'Rejeté',     className: 'bg-[rgba(239,68,68,.1)] text-[#DC2626]'  },
  executed: { label: 'Exécuté',    className: 'bg-[rgba(99,102,241,.1)] text-[#4338CA]' },
};

const ACTION_TYPE_LABEL: Record<string, string> = {
  send_reminder: 'Relance client',
  escalate:      'Escalade',
  flag_risk:     'Signal risque',
  payment_plan:  'Plan de paiement',
};

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('fr-FR').format(v) + ' XAF';
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  action:     DafProposedAction | null;
  onClose:    () => void;
  onApprove?: (id: string) => void;
  onReject?:  (id: string) => void;
  decidingId?: string | null;
}

export function ActionDetailDrawer({ action, onClose, onApprove, onReject, decidingId }: Props) {
  if (!action) return null;

  const p          = PRIORITY_CONFIG[action.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
  const statusCfg  = STATUS_CONFIG[action.status] ?? { label: action.status, className: 'bg-[var(--bg-sink)] text-[var(--tx-3)]' };
  const isPending  = action.status === 'pending';
  const loading    = decidingId === action.id;
  const td         = action.target_data as Record<string, unknown>;
  const invoices   = Array.isArray(td?.invoices) ? (td.invoices as Record<string, unknown>[]) : null;
  const partnerName  = td?.partner_name ? String(td.partner_name) : null;
  const partnerEmail = td?.partner_email ? String(td.partner_email) : null;
  const partnerPhone = td?.partner_phone ? String(td.partner_phone) : null;
  const totalAmount  = typeof td?.total_amount === 'number' ? (td.total_amount as number) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="h-[3px] flex-shrink-0" style={{ background: 'var(--grad)' }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--bd-def)] bg-[rgba(27,107,69,.03)] flex-shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--tx-3)]">
              {ACTION_TYPE_LABEL[action.action_type] ?? action.action_type.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-px rounded-full" style={{ color: p.color, background: p.bg }}>
              {p.label}
            </span>
            <span className={cn('text-[10px] font-bold px-1.5 py-px rounded-full', statusCfg.className)}>
              {statusCfg.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Titre */}
          <p className="text-[15px] font-semibold text-[var(--tx-1)] leading-snug">{action.title}</p>

          {/* Description */}
          <div>
            <p className="text-[9px] font-semibold tracking-widest text-[var(--tx-3)] uppercase mb-1.5">Description</p>
            <p className="text-[13px] text-[var(--tx-2)] leading-relaxed">{action.description}</p>
          </div>

          {/* Raisonnement IA */}
          {action.reasoning && (
            <div className="rounded-xl bg-[rgba(27,107,69,.04)] border border-[rgba(27,107,69,.12)] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: 'var(--grad)' }}>
                  IA
                </span>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-primary">
                  Raisonnement de l&apos;agent
                </p>
              </div>
              <p className="text-[12px] text-[var(--tx-2)] italic leading-relaxed">{action.reasoning}</p>
            </div>
          )}

          {/* Partenaire */}
          {(partnerName || partnerEmail || partnerPhone) && (
            <div>
              <p className="text-[9px] font-semibold tracking-widest text-[var(--tx-3)] uppercase mb-2">Partenaire</p>
              <div className="rounded-xl border border-[var(--bd-def)] bg-[var(--bg-sink)] divide-y divide-[var(--bd-def)]">
                {partnerName && (
                  <div className="flex justify-between items-center px-3 py-2 text-[12px]">
                    <span className="text-[var(--tx-3)]">Nom</span>
                    <span className="font-semibold text-[var(--tx-1)]">{partnerName}</span>
                  </div>
                )}
                {partnerEmail && (
                  <div className="flex justify-between items-center px-3 py-2 text-[12px]">
                    <span className="text-[var(--tx-3)]">Email</span>
                    <span className="text-[var(--tx-2)]">{partnerEmail}</span>
                  </div>
                )}
                {partnerPhone && (
                  <div className="flex justify-between items-center px-3 py-2 text-[12px]">
                    <span className="text-[var(--tx-3)]">Téléphone</span>
                    <span className="text-[var(--tx-2)]">{partnerPhone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Factures */}
          {invoices && invoices.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold tracking-widest text-[var(--tx-3)] uppercase mb-2">
                Factures concernées
              </p>
              <div className="rounded-xl border border-[var(--bd-def)] overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-[var(--bg-sink)] border-b border-[var(--bd-def)]">
                      <th className="text-left px-3 py-2 font-semibold text-[var(--tx-3)]">N° Facture</th>
                      <th className="text-right px-3 py-2 font-semibold text-[var(--tx-3)]">Montant</th>
                      <th className="text-right px-3 py-2 font-semibold text-[var(--tx-3)]">Échéance</th>
                      <th className="text-right px-3 py-2 font-semibold text-[var(--tx-3)]">Retard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bd-def)] bg-white">
                    {invoices.map((inv, i) => {
                      const overdue = typeof inv.days_overdue === 'number' ? (inv.days_overdue as number) : null;
                      return (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-[10px] text-[var(--tx-2)]">{String(inv.number ?? '—')}</td>
                          <td className="px-3 py-2 text-right font-semibold text-[var(--tx-1)]">
                            {typeof inv.amount === 'number' ? fmtCurrency(inv.amount as number) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-[var(--tx-2)]">{String(inv.due_date ?? '—')}</td>
                          <td className={cn('px-3 py-2 text-right font-semibold',
                            overdue !== null && overdue > 0 ? 'text-[#DC2626]' : 'text-[var(--tx-3)]',
                          )}>
                            {overdue !== null ? (overdue > 0 ? `+${overdue}j` : `${overdue}j`) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalAmount !== null && (
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[11px] font-semibold text-[var(--tx-3)]">Total</span>
                  <span className="text-[13px] font-bold text-[var(--tx-1)]">{fmtCurrency(totalAmount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Métadonnées */}
          <div className="rounded-xl border border-[var(--bd-def)] bg-[var(--bg-sink)] divide-y divide-[var(--bd-def)]">
            <div className="flex justify-between items-center px-3 py-2 text-[12px]">
              <span className="text-[var(--tx-3)]">Proposé le</span>
              <span className="text-[var(--tx-2)]">{fmtDateTime(action.proposed_at)}</span>
            </div>
            {action.decided_at && (
              <div className="flex justify-between items-center px-3 py-2 text-[12px]">
                <span className="text-[var(--tx-3)]">Décidé le</span>
                <span className="text-[var(--tx-2)]">{fmtDateTime(action.decided_at)}</span>
              </div>
            )}
            {action.decided_by && (
              <div className="flex justify-between items-center px-3 py-2 text-[12px]">
                <span className="text-[var(--tx-3)]">Décidé par</span>
                <span className="text-[var(--tx-2)]">{action.decided_by}</span>
              </div>
            )}
            <div className="flex justify-between items-center px-3 py-2 text-[12px]">
              <span className="text-[var(--tx-3)]">ID action</span>
              <span className="font-mono text-[10px] text-[var(--tx-3)]">{action.id.slice(0, 8)}…</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {isPending && onApprove && onReject && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--bd-def)] bg-white flex gap-3">
            <button
              onClick={() => { onApprove(action.id); onClose(); }}
              disabled={!!decidingId}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[rgba(16,185,129,.1)] text-primary text-[12px] font-semibold hover:bg-[rgba(16,185,129,.2)] transition-colors disabled:opacity-50"
            >
              {loading ? <SpinnerGapIcon size={13} className="animate-spin" /> : <CheckIcon size={13} weight="bold" />}
              Approuver
            </button>
            <button
              onClick={() => { onReject(action.id); onClose(); }}
              disabled={!!decidingId}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[rgba(239,68,68,.1)] text-[#DC2626] text-[12px] font-semibold hover:bg-[rgba(239,68,68,.2)] transition-colors disabled:opacity-50"
            >
              {loading ? <SpinnerGapIcon size={13} className="animate-spin" /> : <XIcon size={13} weight="bold" />}
              Rejeter
            </button>
          </div>
        )}
      </div>
    </>
  );
}
