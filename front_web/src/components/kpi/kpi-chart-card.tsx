"use client";

import { AgCharts } from "ag-charts-react";
import { ModuleRegistry, AllCommunityModule } from "ag-charts-community";
import type { KpiItem, KpiChartSeries } from "@/types/kpi_type";

// Enregistrement unique des modules AG Charts (obligatoire en v14+)
ModuleRegistry.registerModules([AllCommunityModule]);

// ── Palette Portalis pour AG Charts ──────────────────────────────────────────

export const PORTALIS_THEME = {
  baseTheme: "ag-default",
  palette: {
    fills: [
      "#0E86E8",
      "#C2257A",
      "#92720C",
      "#a01d1d",
      "#5829A8",
      "#0A6DC0",
      "#D97706",
      "#DC2626",
    ],
    strokes: [
      "#0E86E8",
      "#9a1059",
      "#92720C",
      "#a01d1d",
      "#5829A8",
      "#0A6DC0",
      "#D97706",
      "#DC2626",
    ],
  },
  overrides: {
    common: {
      background: { visible: false },
      padding: { top: 8, bottom: 8, left: 8, right: 8 },
      legend: {
        item: { label: { fontSize: 11 } },
      },
    },
    bar: {
      series: { cornerRadius: 3 },
    },
    line: {
      series: { strokeWidth: 2, marker: { size: 4 } },
    },
    area: {
      series: { fillOpacity: 0.15, strokeWidth: 2 },
    },
  },
};

// ── Hauteur par type de chart ─────────────────────────────────────────────────

function chartHeight(series: KpiChartSeries[]): number {
  if (series.some((s) => s.type === "pie")) return 240;
  return 200;
}

// ── Remplissage des mois manquants (Jan → mois courant) ───────────────────────

const FR_MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const FR_MONTHS_FULL  = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function fillMonthlyGaps(
  data: Record<string, unknown>[],
  xKey: string,
  yKeys: string[],
): Record<string, unknown>[] {
  if (!xKey) return data;

  const now          = new Date();
  const currentMonth = now.getMonth();       // 0-indexed
  const currentYear  = now.getFullYear();

  const sample = data.length > 0 ? String(data[0][xKey] ?? '') : '';

  let allMonths: string[];

  const isISO = /^\d{4}-\d{2}$/.test(sample);

  if (isISO) {
    // Format ISO "2026-01" → on génère les mois ISO puis on les traduit en noms courts
    const isoMonths = Array.from({ length: currentMonth + 1 }, (_, i) =>
      `${currentYear}-${String(i + 1).padStart(2, '0')}`,
    );

    const byMonth = new Map<string, Record<string, unknown>>();
    for (const row of data) byMonth.set(String(row[xKey]), row);

    return isoMonths.map((iso, i) => {
      const label = FR_MONTHS_SHORT[i];
      const source = byMonth.get(iso);
      if (source) {
        // remplace la valeur ISO par le nom court dans le résultat
        return { ...source, [xKey]: label };
      }
      const empty: Record<string, unknown> = { [xKey]: label };
      for (const yk of yKeys) empty[yk] = 0;
      return empty;
    });
  }

  if (FR_MONTHS_SHORT.some(m => m === sample)) {
    allMonths = FR_MONTHS_SHORT.slice(0, currentMonth + 1);
  } else if (FR_MONTHS_FULL.some(m => m === sample)) {
    allMonths = FR_MONTHS_FULL.slice(0, currentMonth + 1);
  } else {
    // Format inconnu ou données non-mensuelles : ne pas toucher
    return data;
  }

  const byMonth = new Map<string, Record<string, unknown>>();
  for (const row of data) byMonth.set(String(row[xKey]), row);

  return allMonths.map(month => {
    if (byMonth.has(month)) return byMonth.get(month)!;
    const empty: Record<string, unknown> = { [xKey]: month };
    for (const yk of yKeys) empty[yk] = 0;
    return empty;
  });
}

// ── Construction des series AG Charts ────────────────────────────────────────

export function buildSeries(series: KpiChartSeries[]): Record<string, unknown>[] {
  return series.map((s) => {
    const out: Record<string, any> = { type: s.type };
    if (s.xKey) out.xKey = s.xKey;
    if (s.yKey) out.yKey = s.yKey;
    if (s.yName) out.yName = s.yName;
    if (s.angleKey) out.angleKey = s.angleKey;
    if (s.calloutLabelKey) out.calloutLabelKey = s.calloutLabelKey;
    return out;
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function KpiChartCardSkeleton() {
  return (
    <div className="bg-white border border-[#DDE5EF] rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="px-4 pt-4 pb-3 border-b border-[#F0F4F8]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="h-4 w-20 bg-[#EEF2F7] rounded-full" />
          <div className="h-4 w-16 bg-[#EEF2F7] rounded-full" />
        </div>
        <div className="h-4 w-3/4 bg-[#EEF2F7] rounded mb-1.5" />
        <div className="h-3 w-1/2 bg-[#EEF2F7] rounded" />
      </div>
      <div className="px-2 py-2 flex items-center justify-center" style={{ minHeight: 200 }}>
        <div className="h-[160px] w-full bg-[#F7F9FC] rounded-xl" />
      </div>
    </div>
  );
}

// ── Badge catégorie ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  commercial: { bg: "#ECFDF5", color: "#0E86E8" },
  transport: { bg: "#EBF5FD", color: "#085499" },
  finance: { bg: "#FBF3DE", color: "#725A0A" },
  operations: { bg: "#F3EFFE", color: "#5829A8" },
  default: { bg: "#F3F4F6", color: "#6B7280" },
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? CATEGORY_COLORS.default;
}

// ── Composant ─────────────────────────────────────────────────────────────────

interface KpiChartCardProps {
  kpi: KpiItem;
  loading?: boolean;
  /** Hauteur étendue pour la vue détail (header masqué) */
  fullHeight?: boolean;
  /** Mise en vedette : pleine largeur, chart plus grand, header enrichi */
  featured?: boolean;
}

export function KpiChartCard({
  kpi,
  loading = false,
  fullHeight = false,
  featured = false,
}: KpiChartCardProps) {
  const catColor = categoryColor(kpi.category);
  const h = fullHeight ? 380 : featured ? 260 : chartHeight(kpi.chart.series);

  const xKey  = kpi.chart.series[0]?.xKey ?? '';
  const yKeys = kpi.chart.series.map(s => s.yKey).filter(Boolean) as string[];
  const chartData = fillMonthlyGaps(kpi.chart.data, xKey, yKeys);

  const hasData = chartData.length > 0 && kpi.chart.series.length > 0;

  const options: any = {
    theme: PORTALIS_THEME,
    data: chartData,
    series: buildSeries(kpi.chart.series),
  };

  return (
    <div
      className="bg-white border border-[#DDE5EF] rounded-2xl shadow-sm overflow-hidden flex flex-col"
      style={{ minWidth: 0 }}
    >
      {/* Header */}
      {!fullHeight && (
        <div className={featured ? 'px-5 pt-5 pb-4 border-b border-[#F0F4F8]' : 'px-4 pt-4 pb-3 border-b border-[#F0F4F8]'}>
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: catColor.bg, color: catColor.color }}
            >
              {kpi.category}
            </span>
            {kpi.period && (
              <span className="text-[10px] text-[#9EB0C4] bg-[#F7F9FC] px-2 py-0.5 rounded-full border border-[#EEF2F7]">
                {kpi.period}
              </span>
            )}
          </div>
          <div className={featured
            ? 'font-space-grotesk text-[16px] font-bold text-[#1B2633] leading-snug'
            : 'font-space-grotesk text-[13px] font-semibold text-[#1B2633] leading-snug'
          }>
            {kpi.label}
          </div>
          {kpi.description && (
            <div
              className="text-[11px] text-[#7691A8] mt-0.5"
              style={featured ? undefined : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={kpi.description}
            >
              {kpi.description}
            </div>
          )}
          {featured && kpi.unit && (
            <p className="text-[11px] text-[#9EB0C4] mt-1">
              Unité : <span className="font-medium text-[#7691A8]">{kpi.unit}</span>
            </p>
          )}
        </div>
      )}

      {/* Chart area */}
      <div className="flex-1 px-2 py-2" style={{ minHeight: h }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 sm:py-24 gap-2 sm:gap-3 text-[var(--tx-3)]" style={{ height: h }}>
            <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : hasData ? (
          <AgCharts
            options={options as any}
            style={{ width: "100%", height: h }}
          />
        ) : (
          <div
            className="w-full flex flex-col items-center justify-center text-[#C5D0DC] gap-1"
            style={{ height: h }}
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <rect
                x="3"
                y="12"
                width="4"
                height="9"
                rx="1"
                fill="currentColor"
                opacity=".4"
              />
              <rect
                x="10"
                y="7"
                width="4"
                height="14"
                rx="1"
                fill="currentColor"
                opacity=".4"
              />
              <rect
                x="17"
                y="3"
                width="4"
                height="18"
                rx="1"
                fill="currentColor"
                opacity=".4"
              />
            </svg>
            <span className="text-[11px]">Aucune donnée</span>
          </div>
        )}
      </div>

      {/* Footer */}
      {kpi.unit && (
        <div className="px-4 pb-3 text-[10px] text-[#9EB0C4]">
          Unité : <span className="font-medium text-[#7691A8]">{kpi.unit}</span>
        </div>
      )}
    </div>
  );
}
