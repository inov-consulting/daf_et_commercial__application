'use client';

import Link from 'next/link';
import { FinCard, FinCardHeader } from './fin-card';
import type { DafRun } from '@/types/daf_type';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDuration(start: string, end: string | null) {
  if (!end) return '—';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

const RUN_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  completed: { label: 'OK',      bg: 'rgba(16,185,129,.1)',  text: '#1B6B45' },
  running:   { label: 'Run',     bg: 'rgba(99,102,241,.1)',  text: '#4338CA' },
  failed:    { label: 'Échec',   bg: 'rgba(239,68,68,.1)',   text: '#DC2626' },
  pending:   { label: 'Attente', bg: 'rgba(245,158,11,.1)', text: '#B45309' },
};

interface Props {
  runs:       DafRun[];
  locale:     string;
  onVoirTout?: () => void;
}

export function CreancesTop({ runs, locale, onVoirTout }: Props) {
  return (
    <FinCard>
      <FinCardHeader
        title="Cycles Agent DAF"
        badge={
          <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">
            {runs.length} runs
          </span>
        }
        action="Voir tout"
        onAction={onVoirTout}
      />
      <div className="mt-2 divide-y divide-[var(--bd-def)]">
        {runs.map(r => {
          const s = RUN_STATUS[r.status] ?? { label: r.status, bg: 'var(--bg-sink)', text: 'var(--tx-3)' };
          return (
            <Link
              key={r.id}
              href={`/${locale}/page/finances/reporting/${r.id}`}
              className="flex items-center gap-2.5 py-2.5 hover:bg-[var(--bg-sink)] rounded-lg px-2 -mx-2 transition-colors"
            >
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 w-12 text-center"
                style={{ background: s.bg, color: s.text }}
              >
                {s.label}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[var(--tx-1)] truncate">{fmtDate(r.started_at)}</p>
                <p className="text-[10px] text-[var(--tx-3)] truncate">
                  {r.trigger.replace(/_/g, ' ')} · {fmtDuration(r.started_at, r.ended_at)}
                </p>
              </div>

              {r.proposed_actions_count > 0 && (
                <span className="text-[10px] font-semibold text-[var(--p500)] bg-[rgba(99,102,241,.08)] px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {r.proposed_actions_count} act.
                </span>
              )}
            </Link>
          );
        })}
        {runs.length === 0 && (
          <p className="py-3 text-[12px] text-[var(--tx-3)] italic">Aucun cycle disponible.</p>
        )}
      </div>
    </FinCard>
  );
}
