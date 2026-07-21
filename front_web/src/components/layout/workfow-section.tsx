import { cn } from '@/lib/utils';
import { ShipmentWorkflow } from '@/types/transport_type';
import { CheckIcon, FolderOpenIcon } from '@phosphor-icons/react';
import React from 'react'

const fmtDate = (iso?: string) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const WorkflowSection = ({ workflow }: { workflow?: ShipmentWorkflow }) => {
  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--tx-3)] gap-2">
        <FolderOpenIcon size={24} className="opacity-40" />
        <span className="text-[13px]">Aucun workflow associé</span>
      </div>
    );
  }

  const history = workflow.history ?? [];

  return (
    <div className="space-y-4">
      {/* Workflow header card */}
      <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] text-[var(--tx-3)] mb-0.5">Modèle de workflow</div>
            <div className="text-[13px] font-semibold text-[var(--tx-1)]">{workflow.template ?? '–'}</div>
          </div>
          {workflow.state && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#EBF5FD] text-[#085499] flex-shrink-0">
              {workflow.state === 'running' ? 'En cours' : workflow.state}
            </span>
          )}
        </div>
        {workflow.current_step && (
          <div className="mt-3 pt-3 border-t border-[var(--bd-def)] flex items-center gap-2">
            <span className="text-[11px] text-[var(--tx-3)]">Étape actuelle :</span>
            <span className="text-[12px] font-semibold text-[#085499] bg-[#EBF5FD] px-2 py-0.5 rounded-md">
              {workflow.current_step}
            </span>
          </div>
        )}
      </div>

      {/* History timeline */}
      {history.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] mb-3">
            Historique ({history.length} étape{history.length > 1 ? 's' : ''})
          </p>
          <div className="space-y-2">
            {history.map((entry, i) => {
              const isLast = i === history.length - 1;
              const isCurrent = !entry.date_exited;
              return (
                <div
                  key={entry.id ?? i}
                  className={cn(
                    'flex gap-3 p-3 rounded-xl border',
                    isCurrent
                      ? 'bg-[#EBF5FD] border-[rgba(14,134,232,.2)]'
                      : 'bg-[var(--bg-sink)] border-[var(--bd-def)]',
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    isCurrent ? 'bg-primary' : 'bg-[#10B981]',
                  )}>
                    {isCurrent
                      ? <span className="text-[10px] font-bold text-white">{i + 1}</span>
                      : <CheckIcon size={12} weight="bold" className="text-white" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-semibold ${isCurrent ? 'text-[#085499]' : 'text-[var(--tx-1)]'}`}>
                      {entry.step}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--tx-3)] flex-wrap">
                      {entry.user && <span>Par {entry.user}</span>}
                      {entry.date_entered && <span>{fmtDate(entry.date_entered)}</span>}
                      {entry.duration_hours != null && entry.duration_hours > 0 && (
                        <span>{entry.duration_hours}h</span>
                      )}
                    </div>
                    {entry.note && (
                      <div className="mt-1.5 text-[11px] text-[var(--tx-2)] italic">{entry.note}</div>
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 h-fit',
                    isCurrent ? 'bg-[#EBF5FD] text-[#085499]' : 'bg-[#DCFCE7] text-[#0E86E8]',
                  )}>
                    {isCurrent ? 'En cours' : 'Terminé'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowSection
