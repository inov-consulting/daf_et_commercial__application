'use client';

import { CheckIcon, XIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { AgentActif } from '@/types/finance_type';
import type { DafProposedAction } from '@/types/daf_type';

const PRIORITY_CONFIG = {
  critical: { label: 'Critique', color: '#DC2626', bg: 'rgba(239,68,68,.12)' },
  high:     { label: 'Haute',    color: '#F97316', bg: 'rgba(249,115,22,.12)' },
  medium:   { label: 'Moyenne',  color: '#B45309', bg: 'rgba(245,158,11,.12)' },
  low:      { label: 'Faible',   color: '#6B7280', bg: 'rgba(107,114,128,.12)' },
} as const;

const ACTION_TYPE_LABEL: Record<string, string> = {
  send_reminder: 'Relance client',
  escalate:      'Escalade',
  flag_risk:     'Signal risque',
  payment_plan:  'Plan de paiement',
};

interface Props {
  label:           string;
  rule?:           string;
  agents:          AgentActif[];
  proposedActions: DafProposedAction[];
  decidingId:      string | null;
  onApprove:       (id: string) => void;
  onReject:        (id: string) => void;
  taskCount:       number;
  validCount:      number;
}

export function AgentSyntheseDaf({
  label, rule, agents, proposedActions, decidingId, onApprove, onReject, taskCount, validCount,
}: Props) {
  const pendingCount = proposedActions.filter(a => a.status === 'pending').length;

  return (
    <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] mb-4 sm:mb-6 overflow-hidden">
      <div className="h-[3px]" style={{ background: 'var(--grad)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--bd-def)] bg-[rgba(27,107,69,.04)]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad)' }}>
            <span className="text-white text-lg leading-none">✦</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[var(--tx-1)]">{label}</p>
            {rule && <p className="text-[11px] text-[var(--tx-3)] hidden sm:block">{rule}</p>}
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: 'var(--grad)' }}>
            <span className="text-[10px] leading-none">✦</span> {pendingCount} en attente
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] divide-y lg:divide-y-0 lg:divide-x divide-[var(--bd-def)]">

        {/* Actions proposées */}
        <div className="bg-[var(--bg-sink)]">
          <p className="px-4 sm:px-5 pt-3 pb-2 text-[9px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase">
            Actions proposées par l&apos;agent IA
          </p>
          <div className="divide-y divide-[var(--bd-def)] border-t border-[var(--bd-def)] bg-white">
            {proposedActions.map(action => {
              const p         = PRIORITY_CONFIG[action.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
              const loading   = decidingId === action.id;
              const isPending = action.status === 'pending';
              const td        = action.target_data as Record<string, unknown>;
              const partnerName = td?.partner_name ?? td?.client_name ?? td?.name ?? null;
              const amount      = td?.amount ?? td?.outstanding_amount ?? td?.montant ?? null;

              return (
                <div key={action.id} className="px-3 sm:px-5 py-3 sm:py-4">
                  {/* Type + priority + status */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--tx-3)]">
                      {ACTION_TYPE_LABEL[action.action_type] ?? action.action_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-px rounded-full" style={{ color: p.color, background: p.bg }}>
                      {p.label}
                    </span>
                    {!isPending && (
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-px rounded-full',
                        action.status === 'approved' ? 'bg-[rgba(16,185,129,.1)] text-[#1B6B45]' :
                        action.status === 'rejected' ? 'bg-[rgba(239,68,68,.1)] text-[#DC2626]'  :
                        action.status === 'executed' ? 'bg-[rgba(99,102,241,.1)] text-[#4338CA]' :
                        'bg-[var(--bg-sink)] text-[var(--tx-3)]',
                      )}>
                        {action.status}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-sm font-semibold text-[var(--tx-1)] mb-1 leading-snug">{action.title}</p>

                  {/* Description */}
                  <p className="text-[11px] text-[var(--tx-2)] leading-relaxed mb-1">{action.description}</p>

                  {/* Reasoning */}
                  {action.reasoning && (
                    <p className="text-[11px] text-[var(--tx-3)] italic leading-relaxed border-l-2 border-[var(--bd-def)] pl-2 mb-2">
                      {action.reasoning}
                    </p>
                  )}

                  {/* Target data */}
                  {(partnerName || amount !== null) && (
                    <div className="flex items-center gap-3 text-[11px] text-[var(--tx-3)] mb-2">
                      {partnerName && <span>👤 {String(partnerName)}</span>}
                      {amount !== null && <span>💰 {Number(amount).toLocaleString('fr-FR')} XAF</span>}
                    </div>
                  )}

                  {/* Meta */}
                  <p className="text-[9px] text-[var(--tx-3)] mb-2">
                    Proposé le {new Date(action.proposed_at).toLocaleDateString('fr-FR')}
                    {action.decided_at && (
                      <> · Décidé le {new Date(action.decided_at).toLocaleDateString('fr-FR')}</>
                    )}
                  </p>

                  {/* Approve / Reject */}
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApprove(action.id)}
                        disabled={!!decidingId}
                        className="flex items-center gap-1 h-7 px-3 rounded-lg bg-[rgba(16,185,129,.1)] text-[#1B6B45] text-[11px] font-semibold hover:bg-[rgba(16,185,129,.2)] transition-colors disabled:opacity-50"
                      >
                        {loading ? <SpinnerGapIcon size={11} className="animate-spin" /> : <CheckIcon size={11} weight="bold" />}
                        Approuver
                      </button>
                      <button
                        onClick={() => onReject(action.id)}
                        disabled={!!decidingId}
                        className="flex items-center gap-1 h-7 px-3 rounded-lg bg-[rgba(239,68,68,.1)] text-[#DC2626] text-[11px] font-semibold hover:bg-[rgba(239,68,68,.2)] transition-colors disabled:opacity-50"
                      >
                        {loading ? <SpinnerGapIcon size={11} className="animate-spin" /> : <XIcon size={11} />}
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {proposedActions.length === 0 && (
              <p className="px-5 py-4 text-[12px] text-[var(--tx-3)] italic">Aucune action proposée en cours.</p>
            )}
          </div>
        </div>

        {/* Agents actifs */}
        <div className="p-4 sm:p-5 bg-[var(--bg-sink)]">
          <p className="text-[9px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase mb-2 sm:mb-3">Agents actifs</p>
          <div className="flex flex-col gap-2 mb-3">
            {agents.map(agent => (
              <div key={agent.id} className="p-2.5 rounded-xl bg-white border border-[var(--bd-def)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', agent.running ? 'bg-[var(--p500)] animate-pulse' : 'bg-[var(--ok500)]')} />
                  <p className="text-xs font-semibold text-[var(--tx-1)] flex-1 truncate">{agent.name}</p>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 flex-shrink-0">{agent.model}</span>
                </div>
                <p className={cn('text-[11px] mb-1.5', agent.running ? 'text-[var(--tx-3)]' : 'text-success')}>
                  {agent.desc}
                </p>
                {agent.progress !== null && (
                  <div className="flex items-center gap-2">
                    <Progress value={agent.progress} size="sm" className="flex-1" />
                    <span className="text-[9px] text-[var(--tx-3)] whitespace-nowrap">{agent.timeLeft}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-white border border-[var(--bd-def)]">
              <p className="font-display font-bold text-xl text-primary-700">{taskCount}</p>
              <p className="text-[9px] text-[var(--tx-3)]">Tâches IA aujourd&apos;hui</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[var(--bd-def)]">
              <p className="font-display font-bold text-xl text-success">{validCount}</p>
              <p className="text-[9px] text-[var(--tx-3)]">Validées par équipe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
