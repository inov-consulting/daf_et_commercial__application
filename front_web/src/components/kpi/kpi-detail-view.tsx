"use client";

import { useState } from "react";
import {
  ArrowsClockwiseIcon,
  FunnelSimpleIcon,
  XCircleIcon,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchKpiDetail } from "@/redux/features/kpi/kpiSlice";
import { KpiChartCard } from "./kpi-chart-card";
import type { KpiDefinition } from "@/types/app_config_type";

// ── Couleurs catégories ───────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  commercial: { bg: "#ECFDF5", color: "#1E5B3C" },
  transport: { bg: "#EBF5FD", color: "#085499" },
  finance: { bg: "#FBF3DE", color: "#725A0A" },
  operations: { bg: "#F3EFFE", color: "#5829A8" },
  default: { bg: "#F3F4F6", color: "#6B7280" },
};

function catColor(cat: string) {
  return CATEGORY_COLORS[cat?.toLowerCase()] ?? CATEGORY_COLORS.default;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface KpiDetailViewProps {
  definition: KpiDefinition; // métadonnées légères (sans chart)
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function KpiDetailView({ definition }: KpiDetailViewProps) {
  const dispatch = useAppDispatch();
  const { selectedKpi, kpiDetailLoading, kpiDetailError } = useAppSelector(
    (s) => s.kpi,
  );

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtered, setFiltered] = useState(false);

  const cc = catColor(definition.category);

  // Charge le KPI avec ou sans filtre date
  function load(df?: string, dt?: string) {
    dispatch(
      fetchKpiDetail({
        key: definition.key,
        date_from: df || undefined,
        date_to: dt || undefined,
      }),
    );
  }

  // Charge sans filtre au premier affichage si pas encore chargé ou si c'est un autre KPI
  const isCurrentKpi = selectedKpi?.key === definition.key;

  function applyFilter() {
    load(dateFrom, dateTo);
    setFiltered(true);
  }

  function clearFilter() {
    setDateFrom("");
    setDateTo("");
    setFiltered(false);
    load();
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Métadonnées ───────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-[#EEF2F7]">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
            style={{ background: cc.bg, color: cc.color }}
          >
            {definition.category}
          </span>
          {isCurrentKpi && selectedKpi?.period && (
            <span className="text-[10px] text-[#9EB0C4] bg-[#F7F9FC] px-2 py-0.5 rounded-full border border-[#EEF2F7]">
              {selectedKpi.period}
            </span>
          )}
          {filtered && (
            <span className="text-[10px] bg-[#ECFDF5] text-primary px-2 py-0.5 rounded-full font-medium border border-[#BBF7D0]">
              Filtre actif
            </span>
          )}
        </div>
        <h2 className="font-space-grotesk text-[18px] font-bold text-[#1B2633] leading-snug mb-0.5">
          {definition.label}
        </h2>
        {definition.description && (
          <p className="text-[12px] text-[#7691A8]">{definition.description}</p>
        )}
        {definition.unit && (
          <p className="text-[11px] text-[#9EB0C4] mt-1">
            Unité :{" "}
            <span className="font-medium text-[#7691A8]">
              {definition.unit}
            </span>
          </p>
        )}
      </div>

      {/* ── Filtre date ───────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-[#EEF2F7] bg-[#FAFBFC]">
        <div className="flex flex-wrap items-end gap-2">
          <CalendarBlankIcon
            size={13}
            className="text-[#9EB0C4] mb-2 flex-shrink-0"
          />
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-semibold text-[#B0BCC9] uppercase tracking-wide">
              Début
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-7 px-2 border border-[#DDE5EF] rounded-lg text-[11px] text-[#1B2633] bg-white focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-semibold text-[#B0BCC9] uppercase tracking-wide">
              Fin
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-7 px-2 border border-[#DDE5EF] rounded-lg text-[11px] text-[#1B2633] bg-white focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={applyFilter}
            disabled={kpiDetailLoading || (!dateFrom && !dateTo)}
            className="h-7 px-3 bg-primary text-white text-[11px] font-semibold rounded-lg inline-flex items-center gap-1 hover:bg-[#174A30] transition-colors disabled:opacity-50"
          >
            {kpiDetailLoading ? (
              <ArrowsClockwiseIcon size={11} className="animate-spin" />
            ) : (
              <FunnelSimpleIcon size={11} />
            )}
            Filtrer
          </button>
          {filtered && (
            <button
              onClick={clearFilter}
              className="h-7 px-2.5 border border-[#DDE5EF] rounded-lg text-[11px] text-[#7691A8] inline-flex items-center gap-1 hover:bg-[#F7F9FC]"
            >
              <XCircleIcon size={11} />
              Reset
            </button>
          )}
          {!filtered && (
            <button
              onClick={() => load()}
              disabled={kpiDetailLoading}
              className="h-7 px-2.5 border border-[#DDE5EF] rounded-lg text-[11px] text-[#7691A8] inline-flex items-center gap-1 hover:bg-[#F7F9FC] disabled:opacity-50"
              title="Charger"
            >
              <ArrowsClockwiseIcon
                size={11}
                className={kpiDetailLoading ? "animate-spin" : ""}
              />
            </button>
          )}
        </div>
      </div>

      {/* ── Contenu chart ─────────────────────────────────────────── */}
      <div className="flex-1 p-5 overflow-y-auto">
        {kpiDetailError && (
          <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-3 mb-4 text-[12px] text-[#DC2626]">
            <XCircleIcon size={14} weight="fill" className="flex-shrink-0" />
            {kpiDetailError}
          </div>
        )}

        {/* KPI non encore chargé → invite à charger */}
        {!isCurrentKpi && !kpiDetailLoading && !kpiDetailError && (
          <div className="flex flex-col items-center justify-center h-[300px] text-[#C5D0DC] gap-3">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
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
            <p className="text-[12px]">
              Cliquez sur charger pour afficher le graphique
            </p>
            <button
              onClick={() => load()}
              className="h-8 px-4 bg-primary text-white text-[11px] font-semibold rounded-lg inline-flex items-center gap-1.5 hover:bg-[#174A30] transition-colors shadow-sm"
            >
              <ArrowsClockwiseIcon size={12} />
              Charger le graphique
            </button>
          </div>
        )}

        {/* Chart plein */}
        {isCurrentKpi && (
          <KpiChartCard
            kpi={{
              ...selectedKpi!,
              label: definition.label,
              description: definition.description,
            }}
            loading={kpiDetailLoading}
            fullHeight
          />
        )}

        {/* Loading initial */}
        {!isCurrentKpi && kpiDetailLoading && (
          <div className="animate-pulse space-y-3">
            <div className="h-[380px] flex items-center justify-center py-16 sm:py-24 gap-2 sm:gap-3 text-[var(--tx-3)]">
              <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
