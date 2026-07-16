'use client';

import Link from 'next/link';
import { XIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/renderMarkdown';
import type { DafRun } from '@/types/daf_type';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'Succès',     color: '#1B6B45', bg: 'rgba(16,185,129,.12)'  },
  failed:    { label: 'Échec',      color: '#DC2626', bg: 'rgba(239,68,68,.12)'   },
  running:   { label: 'En cours',   color: '#2563EB', bg: 'rgba(37,99,235,.12)'   },
  pending:   { label: 'En attente', color: '#B45309', bg: 'rgba(245,158,11,.12)'  },
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function parseError(err: string) {
  const codeMatch = err.match(/Error code:\s*(\d+)/i);
  const msgMatch  = err.match(/'message':\s*'([^']+)'/);
  const typeMatch = err.match(/'type':\s*'([^']+)'/);
  return {
    code:    codeMatch?.[1] ?? null,
    message: msgMatch?.[1] ?? err,
    type:    typeMatch?.[1] ?? null,
    raw:     err,
  };
}

interface Props {
  run:     DafRun | null;
  onClose: () => void;
  locale:  string;
}

export function RunDetailDrawer({ run, onClose, locale }: Props) {
  if (!run) return null;

  const statusCfg   = STATUS_CONFIG[run.status] ?? { label: run.status, color: '#6B7280', bg: 'rgba(107,114,128,.12)' };
  const parsedError = run.error ? parseError(run.error) : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="h-[3px] flex-shrink-0" style={{ background: 'var(--grad)' }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--bd-def)] bg-[rgba(27,107,69,.03)] flex-shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--tx-3)]">
              Cycle Agent DAF · {run.trigger.replace(/_/g, ' ')}
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-px rounded-full"
              style={{ color: statusCfg.color, background: statusCfg.bg }}
            >
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

          {/* Métadonnées */}
          <div className="rounded-xl border border-[var(--bd-def)] bg-[var(--bg-sink)] divide-y divide-[var(--bd-def)]">
            {([
              { label: 'Démarré le',        value: fmtDateTime(run.started_at)                            },
              { label: 'Terminé le',         value: run.ended_at ? fmtDateTime(run.ended_at) : '—'        },
              { label: 'Durée',             value: fmtDuration(run.started_at, run.ended_at)              },
              { label: 'Actions proposées', value: String(run.proposed_actions_count)                      },
              { label: 'ID run',            value: run.id.slice(0, 8) + '…', mono: true                   },
            ] as { label: string; value: string; mono?: boolean }[]).map(row => (
              <div key={row.label} className="flex justify-between items-center px-3 py-2 text-[12px]">
                <span className="text-[var(--tx-3)]">{row.label}</span>
                <span className={cn('text-[var(--tx-2)]', row.mono && 'font-mono text-[10px]')}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Synthèse (markdown) */}
          {run.summary && (
            <div>
              <p className="text-[9px] font-semibold tracking-widest text-[var(--tx-3)] uppercase mb-2">
                Synthèse IA
              </p>
              <div className="rounded-xl border border-[rgba(27,107,69,.2)] bg-[rgba(27,107,69,.03)] p-3 prose-sm max-h-60 overflow-y-auto">
                {renderMarkdown(run.summary)}
              </div>
            </div>
          )}

          {/* Erreur */}
          {parsedError && (
            <div>
              <p className="text-[9px] font-semibold tracking-widest text-[#DC2626] uppercase mb-2">
                Erreur
              </p>
              <div className="rounded-xl border border-[rgba(220,38,38,.2)] bg-[rgba(239,68,68,.04)] p-3 space-y-2">
                {parsedError.code && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-px rounded-full bg-[rgba(239,68,68,.12)] text-[#DC2626]">
                      Code {parsedError.code}
                    </span>
                    {parsedError.type && (
                      <span className="text-[10px] text-[var(--tx-3)] font-mono">{parsedError.type}</span>
                    )}
                  </div>
                )}
                <p className="text-[12px] text-[#DC2626] leading-relaxed">{parsedError.message}</p>
                {!parsedError.code && (
                  <pre className="text-[10px] text-[var(--tx-3)] font-mono whitespace-pre-wrap break-words mt-1 max-h-40 overflow-y-auto">
                    {parsedError.raw}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Pas de contenu */}
          {!run.summary && !run.error && (
            <p className="text-[12px] text-[var(--tx-3)] italic text-center py-4">
              Aucun résumé disponible pour ce cycle.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--bd-def)] bg-white">
          <Link
            href={`/${locale}/page/finances/reporting/${run.id}`}
            className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-[var(--bd-def)] text-[12px] font-semibold text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
            onClick={onClose}
          >
            Voir rapport complet
            <ArrowRightIcon size={13} weight="bold" />
          </Link>
        </div>
      </div>
    </>
  );
}
