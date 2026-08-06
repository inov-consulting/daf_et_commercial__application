'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchRuns } from '@/redux/features/daf/dafSlice';
import { FinSectionHeader } from '@/components/finance/fin-section-header';
import { FinCard } from '@/components/finance/fin-card';
import { FloatingToast } from '@/components/ui/toast';
import { ArrowClockwiseIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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

const STATUS_CONF = {
  completed: { label: 'Complété', bg: 'rgba(16,185,129,.1)',  text: '#1B6B45' },
  running:   { label: 'En cours', bg: 'rgba(99,102,241,.1)',  text: '#4338CA' },
  failed:    { label: 'Échec',    bg: 'rgba(239,68,68,.1)',   text: '#DC2626' },
  pending:   { label: 'Attente',  bg: 'rgba(245,158,11,.1)',  text: '#B45309' },
} as const;

type StatusFilter = 'all' | 'completed' | 'failed' | 'running' | 'pending';

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'Tous' },
  { key: 'completed', label: 'Complétés' },
  { key: 'running',   label: 'En cours' },
  { key: 'failed',    label: 'Échoués' },
  { key: 'pending',   label: 'En attente' },
];

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 animate-pulse">
      <div className="h-5 w-18 bg-[var(--bg-sink)] rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-36 bg-[var(--bg-sink)] rounded" />
        <div className="h-2.5 w-52 bg-[var(--bg-sink)] rounded" />
      </div>
      <div className="h-4 w-14 bg-[var(--bg-sink)] rounded-full flex-shrink-0" />
      <div className="h-4 w-10 bg-[var(--bg-sink)] rounded flex-shrink-0 hidden sm:block" />
    </div>
  );
}

export default function CyclesPage() {
  const dispatch = useAppDispatch();
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr';

  const { runs, runsLoading, runsError } = useAppSelector(s => s.daf);

  const [activeTab, setActiveTab] = useState<StatusFilter>('all');
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'info' } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  function showToast(msg: string, type: 'error' | 'info' = 'error') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    dispatch(fetchRuns(100));
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [dispatch]);

  useEffect(() => {
    if (runsError) showToast(runsError);
  }, [runsError]);

  const filtered: DafRun[] = activeTab === 'all'
    ? runs
    : runs.filter(r => r.status === activeTab);

  const counts = runs.reduce(
    (acc, r) => { acc[r.status as StatusFilter] = (acc[r.status as StatusFilter] ?? 0) + 1; return acc; },
    {} as Partial<Record<StatusFilter, number>>,
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5">
      {/* Back link */}
      <Link
        href={`/${locale}/page/finances/dashboard-daf`}
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors"
      >
        <ArrowLeftIcon size={13} />
        Dashboard DAF
      </Link>

      <FinSectionHeader
        title="Cycles Agent DAF"
        actionLabel={runsLoading ? 'Chargement…' : 'Actualiser'}
        actionIcon={<ArrowClockwiseIcon size={13} className={runsLoading ? 'animate-spin' : ''} />}
        onAction={() => dispatch(fetchRuns(100))}
        onCompanyChange={() => dispatch(fetchRuns(100))}
      />

      <FinCard>
        {/* Status tabs */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto">
          {TABS.map(tab => {
            const count = tab.key === 'all' ? runs.length : (counts[tab.key] ?? 0);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  isActive
                    ? 'bg-[var(--p500)] text-white'
                    : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)]',
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none',
                  isActive ? 'bg-white/25 text-white' : 'bg-[var(--bg-sink)] text-[var(--tx-3)]',
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Run list */}
        <div className="divide-y divide-[var(--bd-def)] -mx-4 sm:-mx-5">
          {runsLoading && Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)}

          {!runsLoading && filtered.map(r => {
            const s = STATUS_CONF[r.status as keyof typeof STATUS_CONF]
              ?? { label: r.status, bg: 'var(--bg-sink)', text: 'var(--tx-3)' };
            const duration = fmtDuration(r.started_at, r.ended_at);
            return (
              <Link
                key={r.id}
                href={`/${locale}/page/finances/reporting/${r.id}`}
                className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-[var(--bg-sink)] transition-colors group"
              >
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 text-center min-w-[68px]"
                  style={{ background: s.bg, color: s.text }}
                >
                  {s.label}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--tx-1)] group-hover:text-[var(--p600)] transition-colors">
                    {fmtDate(r.started_at)}
                  </p>
                  <p className="text-[11px] text-[var(--tx-3)] truncate mt-0.5">
                    {r.trigger.replace(/_/g, ' ')}
                  </p>
                </div>

                {r.proposed_actions_count > 0 && (
                  <span className="text-[10px] font-semibold text-[var(--p500)] bg-[rgba(99,102,241,.08)] px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                    {r.proposed_actions_count} action{r.proposed_actions_count > 1 ? 's' : ''}
                  </span>
                )}

                <span className="text-[11px] text-[var(--tx-3)] font-mono flex-shrink-0 hidden sm:block w-16 text-right">
                  {duration}
                </span>
              </Link>
            );
          })}

          {!runsLoading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[12px] text-[var(--tx-3)] italic">
                {runs.length === 0
                  ? 'Aucun cycle disponible.'
                  : 'Aucun cycle pour ce filtre.'}
              </p>
            </div>
          )}
        </div>
      </FinCard>

      <FloatingToast message={toast?.msg ?? null} type={toast?.type ?? 'error'} />
    </div>
  );
}
