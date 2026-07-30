import { cn } from '@/lib/utils';
import type { FinKpi } from '@/types/finance_type';

const ACCENT_MAP = {
  success: { value: 'text-[var(--ok600)]', pill: 'bg-[rgba(16,185,129,.1)] text-[var(--ok600)]', bar: 'bg-[var(--ok500)]' },
  warning: { value: 'text-[var(--warn600)]', pill: 'bg-[rgba(245,158,11,.1)] text-[var(--warn600)]', bar: 'bg-[var(--warn500)]' },
  error:   { value: 'text-[#DC2626]',         pill: 'bg-[rgba(239,68,68,.1)] text-[#DC2626]',         bar: 'bg-[#EF4444]' },
  primary: { value: 'text-[var(--p600)]',      pill: 'bg-[rgba(27,107,69,.1)] text-[var(--p600)]',     bar: 'bg-[var(--p500)]' },
};

const TREND_ARROW = { up: '▲', down: '▼', warning: '▲', neutral: '' };

function FinKpiCard({ kpi }: { kpi: FinKpi }) {
  const ac  = ACCENT_MAP[kpi.accent];
  return (
    <div className="relative bg-white border border-[var(--bd-def)] rounded-2xl p-4 sm:p-5 shadow-[var(--sh-xs)] overflow-hidden">
      <span className={cn('absolute top-0 left-0 right-0 h-[3px]', ac.bar)} />
      <p className="text-[11px] text-[var(--tx-3)] mb-1 mt-1">{kpi.label}</p>
      <p className={cn('font-display text-2xl font-bold leading-none mb-1', ac.value)}>{kpi.value}</p>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-[var(--tx-3)]">{kpi.sub}</p>
        <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded-full', ac.pill)}>
          {TREND_ARROW[kpi.trend]} {kpi.trendVal}
        </span>
      </div>
    </div>
  );
}

export function FinKpiRow({ kpis }: { kpis: FinKpi[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {kpis.map((k, i) => <FinKpiCard key={i} kpi={k} />)}
    </div>
  );
}
