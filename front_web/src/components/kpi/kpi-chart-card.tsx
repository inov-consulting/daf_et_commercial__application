"use client";

import { AgCharts } from "ag-charts-react";
import { ModuleRegistry, AllCommunityModule } from "ag-charts-community";
import type { KpiItem, KpiChartSeries } from "@/types/kpi_type";

// Enregistrement unique des modules AG Charts (obligatoire en v14+)
ModuleRegistry.registerModules([AllCommunityModule]);

// ── Palette Portalis pour AG Charts ──────────────────────────────────────────

const PORTALIS_THEME = {
  baseTheme: "ag-default",
  palette: {
    fills: [
      "#1E5B3C",
      "#085499",
      "#92720C",
      "#A01D65",
      "#5829A8",
      "#0F6E56",
      "#D97706",
      "#DC2626",
    ],
    strokes: [
      "#1E5B3C",
      "#085499",
      "#92720C",
      "#A01D65",
      "#5829A8",
      "#0F6E56",
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

// ── Construction des series AG Charts ────────────────────────────────────────

function buildSeries(series: KpiChartSeries[]): Record<string, unknown>[] {
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
  commercial: { bg: "#ECFDF5", color: "#1E5B3C" },
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
  /** Utilise une hauteur plus grande pour la vue détail */
  fullHeight?: boolean;
}

export function KpiChartCard({
  kpi,
  loading = false,
  fullHeight = false,
}: KpiChartCardProps) {
  const hasData = kpi.chart.data.length > 0 && kpi.chart.series.length > 0;
  const catColor = categoryColor(kpi.category);
  const h = fullHeight ? 380 : chartHeight(kpi.chart.series);

  // Options AG Charts — axes auto-détectés par la lib depuis les series
  const options: any = {
    theme: PORTALIS_THEME,
    data: kpi.chart.data,
    series: buildSeries(kpi.chart.series),
  };

  return (
    <div
      className="bg-white border border-[#DDE5EF] rounded-2xl shadow-sm overflow-hidden flex flex-col"
      style={{ minWidth: 0 }}
    >
      {/* Header — masqué en mode fullHeight car KpiDetailView fournit déjà les métadonnées */}
      {!fullHeight && (
        <div className="px-4 pt-4 pb-3 border-b border-[#F0F4F8]">
          <div className="flex items-center justify-between gap-2 mb-1.5">
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
          <div className="font-space-grotesk text-[13px] font-semibold text-[#1B2633] leading-snug">
            {kpi.label}
          </div>
          {kpi.description && (
            <div
              className="text-[11px] text-[#7691A8] mt-0.5 truncate"
              title={kpi.description}
            >
              {kpi.description}
            </div>
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
