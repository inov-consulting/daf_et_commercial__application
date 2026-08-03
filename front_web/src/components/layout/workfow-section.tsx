import { cn } from '@/lib/utils';
import { ShipmentWorkflow } from '@/types/transport_type';
import { CheckIcon, FolderOpenIcon, XCircleIcon } from '@phosphor-icons/react';
import React from 'react';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const fmtDatetime = (iso?: string) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

function fmtDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  if (d === 0) return `${hours.toFixed(1)}h`;
  return h > 0 ? `${d}j ${h}h` : `${d}j`;
}

/* ── Horizontal stepper ──────────────────────────────────────────────────── */

type StepState = 'done' | 'current' | 'pending' | 'cancelled-past';

function WorkflowStepper({
  steps, isCancelled,
}: {
  steps: Array<{ name: string; code: string; sequence: number; is_current: boolean }>;
  isCancelled: boolean;
}) {
  const mainSteps = steps.filter(s => s.code !== 'CANCELLED' && s.sequence < 999);
  const currentIdx = mainSteps.findIndex(s => s.is_current);

  function getState(i: number): StepState {
    if (isCancelled) return i <= currentIdx ? 'cancelled-past' : 'pending';
    if (i < currentIdx) return 'done';
    if (i === currentIdx) return 'current';
    return 'pending';
  }

  const STEP_W = 56;

  return (
    <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--bd-def) transparent' }}>
      <div
        className="flex items-start pb-1"
        style={{ minWidth: `${mainSteps.length * STEP_W + (mainSteps.length - 1) * 20}px` }}
      >
        {mainSteps.map((step, i) => {
          const state = getState(i);
          const isLast = i === mainSteps.length - 1;
          const lineGreen = !isCancelled && i < currentIdx;
          const lineGrey = isCancelled && i < currentIdx;

          return (
            <React.Fragment key={step.code}>
              {/* Step node */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: STEP_W }}>

                {/* Circle */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all',
                    state === 'done'          && 'bg-[#10B981] border-[#10B981]',
                    state === 'current'       && 'bg-[#0E86E8] border-[#0E86E8]',
                    state === 'pending'       && 'bg-white border-[#D1D5DB]',
                    state === 'cancelled-past' && 'bg-[#9CA3AF] border-[#9CA3AF]',
                  )}
                  style={state === 'current' ? { boxShadow: '0 0 0 4px rgba(14,134,232,.14)' } : undefined}
                >
                  {state === 'done' && (
                    <CheckIcon size={12} weight="bold" className="text-white" />
                  )}
                  {state === 'current' && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                  {state === 'pending' && (
                    <span className="text-[10px] font-bold text-[#C3CDD9]">{i + 1}</span>
                  )}
                  {state === 'cancelled-past' && (
                    <CheckIcon size={12} weight="bold" className="text-white" />
                  )}
                </div>

                {/* Label */}
                <div className={cn(
                  'text-[9px] text-center mt-1.5 leading-tight px-0.5',
                  state === 'done'           && 'text-[#059669] font-medium',
                  state === 'current'        && 'text-[#085499] font-bold',
                  state === 'pending'        && 'text-[#9CA3AF]',
                  state === 'cancelled-past' && 'text-[#9CA3AF] line-through',
                )}>
                  {step.name}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className="flex-shrink-0 mt-[13px]"
                  style={{
                    width: 20,
                    height: 2,
                    background: lineGreen ? '#10B981' : lineGrey ? '#C3CDD9' : '#E5E7EB',
                    transition: 'background 0.3s',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

const WorkflowSection = ({ workflow }: { workflow?: ShipmentWorkflow }) => {
  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--tx-3)] gap-2">
        <FolderOpenIcon size={24} className="opacity-40" />
        <span className="text-[13px]">Aucun workflow associé</span>
      </div>
    );
  }

  const history   = workflow.history ?? [];
  const steps     = workflow.steps   ?? [];
  const cancelled = steps.find(s => s.code === 'CANCELLED')?.is_current ?? false;

  return (
    <div className="space-y-4">

      {/* Cancelled banner */}
      {cancelled && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-[12px] font-semibold"
          style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
        >
          <XCircleIcon size={16} weight="fill" />
          Voyage annulé — workflow interrompu
        </div>
      )}

      {/* Visual stepper card */}
      {steps.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--bd-def)', background: 'var(--bg-surf)' }}
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--bd-def)', background: 'var(--bg-sink)' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)]">
              Schéma du voyage
            </span>
            <div className="flex items-center gap-2">
              {workflow.state && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={cancelled
                    ? { background: '#FEE2E2', color: '#DC2626' }
                    : { background: '#DBEAFE', color: '#1D4ED8' }
                  }
                >
                  {cancelled ? 'Annulé' : workflow.state === 'running' ? '● En cours' : workflow.state}
                </span>
              )}
              {workflow.current_step && !cancelled && (
                <span className="text-[11px] font-semibold text-[#085499] bg-[#EBF5FD] px-2 py-0.5 rounded-md">
                  {workflow.current_step}
                </span>
              )}
            </div>
          </div>

          {/* Stepper */}
          <div className="px-4 pt-5 pb-4">
            <WorkflowStepper steps={steps} isCancelled={cancelled} />
          </div>
        </div>
      )}

      {/* Workflow meta */}
      {workflow.template && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
          style={{ border: '1px solid var(--bd-def)', background: 'var(--bg-sink)' }}
        >
          <div>
            <div className="text-[10px] text-[var(--tx-3)] mb-0.5">Modèle de workflow</div>
            <div className="text-[12px] font-semibold text-[var(--tx-1)]">{workflow.template}</div>
          </div>
          {workflow.state && (
            <span
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
              style={cancelled
                ? { background: '#FEE2E2', color: '#DC2626' }
                : { background: '#DBEAFE', color: '#1D4ED8' }
              }
            >
              {cancelled ? 'Annulé' : workflow.state === 'running' ? 'En cours' : workflow.state}
            </span>
          )}
        </div>
      )}

      {/* History timeline */}
      {history.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] mb-3">
            Historique · {history.length} étape{history.length > 1 ? 's' : ''} parcourue{history.length > 1 ? 's' : ''}
          </p>

          <div className="relative" style={{ paddingLeft: 14 }}>
            {/* Vertical connecting line */}
            <div
              className="absolute top-3 bottom-3"
              style={{ left: 12, width: 2, background: 'var(--bd-def)', borderRadius: 2 }}
            />

            <div className="space-y-2.5">
              {history.map((entry, i) => {
                const isCurrent = !entry.date_exited;
                return (
                  <div key={entry.id ?? i} className="flex items-start gap-3">

                    {/* Dot on the timeline */}
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2',
                        isCurrent
                          ? 'bg-[#0E86E8] border-[#0E86E8]'
                          : 'bg-white border-[#10B981]',
                      )}
                      style={{ marginLeft: -12 }}
                    >
                      {isCurrent
                        ? <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        : <CheckIcon size={10} weight="bold" className="text-[#10B981]" />
                      }
                    </div>

                    {/* Entry card */}
                    <div
                      className="flex-1 min-w-0 rounded-xl p-3 border"
                      style={isCurrent
                        ? { background: '#EBF5FD', border: '1px solid rgba(14,134,232,.2)' }
                        : { background: 'var(--bg-sink)', border: '1px solid var(--bd-def)' }
                      }
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className={cn(
                          'text-[12px] font-semibold leading-tight',
                          isCurrent ? 'text-[#085499]' : 'text-[var(--tx-1)]',
                        )}>
                          {entry.step}
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={isCurrent
                            ? { background: '#DBEAFE', color: '#1D4ED8' }
                            : { background: '#DCFCE7', color: '#059669' }
                          }
                        >
                          {isCurrent ? 'En cours' : 'Terminé'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--tx-3)]">
                        {entry.user && <span>par {entry.user}</span>}
                        {entry.date_entered && (
                          <span>entrée {fmtDatetime(entry.date_entered)}</span>
                        )}
                        {entry.date_exited && (
                          <span>sortie {fmtDatetime(entry.date_exited)}</span>
                        )}
                        {entry.duration_hours != null && entry.duration_hours > 0 && (
                          <span className="font-medium text-[var(--tx-2)]">
                            {fmtDuration(entry.duration_hours)}
                          </span>
                        )}
                      </div>

                      {entry.note && (
                        <div
                          className="mt-1.5 pt-1.5 text-[11px] text-[var(--tx-2)] italic"
                          style={{ borderTop: '1px solid var(--bd-def)' }}
                        >
                          {entry.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowSection;
