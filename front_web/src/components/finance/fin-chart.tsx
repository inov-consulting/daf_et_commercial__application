'use client';

import dynamic from 'next/dynamic';
import { ModuleRegistry, AllCommunityModule } from 'ag-charts-community';
import { PORTALIS_THEME } from '@/components/kpi/kpi-chart-card';
import { FinCard } from './fin-card';

ModuleRegistry.registerModules([AllCommunityModule]);

/* ── Même logique que analytics : Jan → mois courant, trous = 0 ──────── */

const FR_MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function fillMonthlyGaps(
  data: Record<string, unknown>[],
  xKey: string,
  yKeys: string[],
): Record<string, unknown>[] {
  if (!data.length || !xKey) return data;

  const now          = new Date();
  const currentMonth = now.getMonth();       // 0-indexed
  const currentYear  = now.getFullYear();
  const sample       = String(data[0][xKey] ?? '');

  // Format ISO "2026-01"
  if (/^\d{4}-\d{2}$/.test(sample)) {
    const isoMonths = Array.from({ length: currentMonth + 1 }, (_, i) =>
      `${currentYear}-${String(i + 1).padStart(2, '0')}`,
    );
    const byMonth = new Map(data.map(row => [String(row[xKey]), row]));
    return isoMonths.map((iso, i) => {
      const label  = FR_MONTHS_SHORT[i];
      const source = byMonth.get(iso);
      if (source) return { ...source, [xKey]: label };
      const empty: Record<string, unknown> = { [xKey]: label };
      for (const yk of yKeys) empty[yk] = 0;
      return empty;
    });
  }

  // Noms courts français ("Jan", "Fév", …)
  if (FR_MONTHS_SHORT.includes(sample)) {
    const allMonths = FR_MONTHS_SHORT.slice(0, currentMonth + 1);
    const byMonth   = new Map(data.map(row => [String(row[xKey]), row]));
    return allMonths.map(month => {
      if (byMonth.has(month)) return byMonth.get(month)!;
      const empty: Record<string, unknown> = { [xKey]: month };
      for (const yk of yKeys) empty[yk] = 0;
      return empty;
    });
  }

  // Format inconnu — ne pas toucher
  return data;
}

export { FR_MONTHS_SHORT };

const AgCharts = dynamic(
  () => import('ag-charts-react').then(m => m.AgCharts),
  { ssr: false },
);

/* ── Bar chart (CA mensuel, Flux) ────────────────────────────── */

export interface BarDataPoint {
  mois?:      string;
  valeur?:    number;
  precedent?: number;
  entrant?:   number;
  sortant?:   number;
  [key: string]: string | number | undefined;
}

interface FinBarChartProps {
  title:    string;
  subtitle?: string;
  ytd?:     string;
  data:     BarDataPoint[];
  series:   { yKey: string; yName: string; fill: string }[];
  xKey?:    string;
  height?:  number;
  yFormatter?: (v: number) => string;
}

export function FinBarChart({ title, subtitle, ytd, data, series, xKey = 'mois', height = 200, yFormatter }: FinBarChartProps) {
  const fmt        = yFormatter ?? ((v: number) => `${v}M`);
  const yKeys      = series.map(s => s.yKey);
  const filledData = fillMonthlyGaps(data as Record<string, unknown>[], xKey, yKeys);
  return (
    <FinCard padding={false}>
      <div className="flex items-start justify-between px-4 sm:px-5 pt-4 pb-2">
        <div>
          <p className="font-semibold text-sm text-[var(--tx-1)]">{title}</p>
          {subtitle && <p className="text-[11px] text-[var(--tx-3)] mt-0.5">{subtitle}</p>}
        </div>
        {ytd && (
          <div className="text-right flex-shrink-0">
            <p className="font-display font-bold text-base text-[var(--tx-1)]">{ytd}</p>
            <p className="text-[10px] text-[var(--tx-3)]">Total YTD 2026</p>
          </div>
        )}
      </div>
      <div className="px-2 pb-3">
        <AgCharts
          options={{
            theme: PORTALIS_THEME,
            data: filledData,
            series: series.map(s => ({
              type: 'bar',
              xKey,
              yKey: s.yKey,
              yName: s.yName,
              fill: s.fill,
            })),
            axes: [
              { type: 'category', position: 'bottom', line: { enabled: false }, tick: { enabled: false }, gridLine: { enabled: false } },
              { type: 'number', position: 'left', label: { formatter: (p: { value: number }) => fmt(p.value) }, gridLine: { style: [{ stroke: '#F0F4F8', lineDash: [4, 4] }] } },
            ],
            legend: { enabled: series.length > 1, position: 'top', spacing: 12 },
          } as any}
          style={{ height }}
        />
      </div>
    </FinCard>
  );
}

/* ── Line / area chart (Trésorerie) ──────────────────────────── */

export interface LineDataPoint {
  mois:   string;
  solde?: number;
  prev?:  number | null;
  [key: string]: string | number | null | undefined;
}

interface FinLineChartProps {
  title:    string;
  subtitle?: string;
  data:     LineDataPoint[];
  series:   { yKey: string; yName: string; stroke: string; type?: 'line' | 'area' }[];
  height?:  number;
  yFormatter?: (v: number) => string;
}

export function FinLineChart({ title, subtitle, data, series, height = 200, yFormatter }: FinLineChartProps) {
  const fmt        = yFormatter ?? ((v: number) => `${v}M`);
  const yKeys      = series.map(s => s.yKey);
  const filledData = fillMonthlyGaps(data as Record<string, unknown>[], 'mois', yKeys);
  return (
    <FinCard padding={false}>
      <div className="px-4 sm:px-5 pt-4 pb-2">
        <p className="font-semibold text-sm text-[var(--tx-1)]">{title}</p>
        {subtitle && <p className="text-[11px] text-[var(--tx-3)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-2 pb-3">
        <AgCharts
          options={{
            theme: PORTALIS_THEME,
            data: filledData,
            series: series.map(s => ({
              type: s.type ?? 'line',
              xKey: 'mois',
              yKey: s.yKey,
              yName: s.yName,
              stroke: s.stroke,
              fill: s.stroke,
              marker: { size: 5, fill: s.stroke, stroke: '#fff', strokeWidth: 2 },
            })),
            axes: [
              { type: 'category', position: 'bottom', line: { enabled: false }, tick: { enabled: false }, gridLine: { enabled: false } },
              { type: 'number', position: 'left', label: { formatter: (p: { value: number }) => fmt(p.value) }, gridLine: { style: [{ stroke: '#F0F4F8', lineDash: [4, 4] }] } },
            ],
            legend: { enabled: series.length > 1, position: 'top', spacing: 12 },
          } as any}
          style={{ height }}
        />
      </div>
    </FinCard>
  );
}
