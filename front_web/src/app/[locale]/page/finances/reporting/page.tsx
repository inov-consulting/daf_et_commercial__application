"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchRuns, fetchLatestSnapshot } from "@/redux/features/daf/dafSlice";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { FinSectionHeader } from "@/components/finance/fin-section-header";
import {
  FinCard,
  FinCardHeader,
  SectionLabel,
} from "@/components/finance/fin-card";
import { FinBarChart } from "@/components/finance/fin-chart";
import { FloatingToast } from "@/components/ui/toast";
import {
  DownloadSimpleIcon,
  MagicWandIcon,
  SpinnerGapIcon,
  FilePdfIcon,
  FileCsvIcon,
  FileXlsIcon,
  ClockIcon,
  CheckCircleIcon,
  TrendUpIcon,
  TrendDownIcon,
  MinusIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { RapportFin, CompteResultatLigne } from "@/types/finance_type";

/* ── Données mock sans équivalent API ───────────────────────────────── */

const RAPPORTS: RapportFin[] = [
  {
    id: 1,
    titre: "Synthèse financière · Juin 2026",
    type: "Mensuel",
    desc: "CA, trésorerie, DSO, créances — Groupe consolidé",
    status: "pret",
    date: "09/07/2026",
  },
  {
    id: 2,
    titre: "Rapport trésorerie · S1 2026",
    type: "Semestriel",
    desc: "Analyse flux · 6 mois · Sénégal + Côte d'Ivoire",
    status: "pret",
    date: "05/07/2026",
  },
  {
    id: 3,
    titre: "Rapport créances & DSO · Juin 2026",
    type: "Mensuel",
    desc: "Balance âgée, relances, DSO par client",
    status: "brouillon",
    date: "08/07/2026",
  },
  {
    id: 4,
    titre: "Budget vs Réalisé · S1 2026",
    type: "Analytique",
    desc: "Écarts budgétaires · Toutes lignes",
    status: "auto",
    date: "10/07/2026",
  },
  {
    id: 5,
    titre: "Tableau de bord DAF · Juillet 2026",
    type: "Mensuel",
    desc: "Rapport exécutif · Prochaine génération le 10/08",
    status: "auto",
    date: "10/08/2026",
  },
];

const CR_DATA: CompteResultatLigne[] = [
  {
    indicateur: "Chiffre d'affaires",
    juin26: 127_400,
    mai26: 113_900,
    juin25: 98_600,
    budget: 120_000,
    ecartB: 7400,
    ecartPct: 6.2,
    tendance: "up",
    isBold: true,
  },
  {
    indicateur: "  · Transport SN",
    juin26: 78_200,
    mai26: 69_400,
    juin25: 61_000,
    budget: 74_000,
    ecartB: 4200,
    ecartPct: 5.7,
    tendance: "up",
  },
  {
    indicateur: "  · Transport CI",
    juin26: 49_200,
    mai26: 44_500,
    juin25: 37_600,
    budget: 46_000,
    ecartB: 3200,
    ecartPct: 7.0,
    tendance: "up",
  },
  {
    indicateur: "Charges d'exploitation",
    juin26: 98_200,
    mai26: 91_800,
    juin25: 78_400,
    budget: 95_000,
    ecartB: -3200,
    ecartPct: -3.4,
    tendance: "down",
    isBold: true,
  },
  {
    indicateur: "  · Masse salariale",
    juin26: 34_400,
    mai26: 34_200,
    juin25: 31_200,
    budget: 34_000,
    ecartB: -400,
    ecartPct: -1.2,
    tendance: undefined,
  },
  {
    indicateur: "  · Carburant & transport",
    juin26: 28_600,
    mai26: 26_400,
    juin25: 22_800,
    budget: 27_000,
    ecartB: -1600,
    ecartPct: -5.9,
    tendance: "down",
  },
  {
    indicateur: "  · Charges générales",
    juin26: 35_200,
    mai26: 31_200,
    juin25: 24_400,
    budget: 34_000,
    ecartB: -1200,
    ecartPct: -3.5,
    tendance: "down",
  },
  {
    indicateur: "Résultat d'exploitation",
    juin26: 29_200,
    mai26: 22_100,
    juin25: 20_200,
    budget: 25_000,
    ecartB: 4200,
    ecartPct: 16.8,
    tendance: "up",
    isBold: true,
  },
  {
    indicateur: "  Marge EBE",
    juin26: 22_900,
    mai26: 19_400,
    juin25: 17_600,
    budget: 21_000,
    ecartB: 1900,
    ecartPct: 9.0,
    tendance: "up",
  },
  {
    indicateur: "Résultat net estimé",
    juin26: 18_400,
    mai26: 14_200,
    juin25: 12_800,
    budget: 16_000,
    ecartB: 2400,
    ecartPct: 15.0,
    tendance: "up",
    isBold: true,
  },
];

const CA_COMPARE_DATA = [
  { mois: "Jan", budget: 100, reel: 98 },
  { mois: "Fév", budget: 105, reel: 110 },
  { mois: "Mar", budget: 108, reel: 102 },
  { mois: "Avr", budget: 110, reel: 114 },
  { mois: "Mai", budget: 115, reel: 114 },
  { mois: "Jun", budget: 120, reel: 127 },
];

const STATUS_STYLE: Record<
  RapportFin["status"],
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    Icon: React.ElementType;
  }
> = {
  pret: {
    label: "Prêt",
    bg: "rgba(16,185,129,.08)",
    text: "#1B6B45",
    border: "rgba(16,185,129,.25)",
    Icon: CheckCircleIcon,
  },
  brouillon: {
    label: "Brouillon",
    bg: "rgba(245,158,11,.08)",
    text: "#B45309",
    border: "rgba(245,158,11,.25)",
    Icon: ClockIcon,
  },
  auto: {
    label: "Auto",
    bg: "rgba(99,102,241,.08)",
    text: "#4338CA",
    border: "rgba(99,102,241,.25)",
    Icon: MagicWandIcon,
  },
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtK(v: number) {
  return (v / 1000).toFixed(1) + "M";
}

function fmtEcart(v: number | null) {
  if (v === null) return "—";
  return (v > 0 ? "+" : "") + (v / 1000).toFixed(1) + "M";
}

function fmtPct(v: number | null) {
  if (v === null) return "—";
  return (v > 0 ? "+" : "") + v.toFixed(1) + "%";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function ReportingPage() {
  const dispatch = useAppDispatch();

  const {
    runs,
    runsLoading,
    runsError,
    latestSnapshot,
    latestSnapshotLoading,
    latestSnapshotError,
  } = useAppSelector((s) => s.daf);

  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "error" | "success" | "info";
  } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  function showToast(
    msg: string,
    type: "error" | "success" | "info" = "error",
  ) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    dispatch(fetchRuns(5));
    dispatch(fetchLatestSnapshot());
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [dispatch]);

  useEffect(() => {
    if (runsError) showToast(runsError);
    if (latestSnapshotError) showToast(latestSnapshotError);
  }, [runsError, latestSnapshotError]);

  async function generate(id: number) {
    setGeneratingId(id);
    await new Promise((r) => setTimeout(r, 1800));
    setGeneratingId(null);
  }

  /* Dernier run complété avec un summary */
  const lastCompletedRun = runs.find(
    (r) => r.status === "completed" && r.summary,
  );
  const snap = latestSnapshot;

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <FinSectionHeader
        title="Reporting financier"
        secondaryAction={{
          label: "Exporter tout",
          icon: <DownloadSimpleIcon size={13} />,
          onClick: () => {},
        }}
        actionLabel="+ Nouveau rapport"
        onAction={() => {}}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Rapports disponibles */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader
                title="Rapports disponibles"
                badge={
                  <span className="text-[10px] text-[var(--ok600)] bg-[rgba(16,185,129,.1)] px-2 py-0.5 rounded-full font-semibold">
                    {RAPPORTS.filter((r) => r.status === "pret").length} prêts
                  </span>
                }
              />
            </div>
            <div className="divide-y divide-[var(--bd-def)]">
              {RAPPORTS.map((r) => {
                const s = STATUS_STYLE[r.status];
                const { Icon: StatusIcon } = s;
                const isGenerating = generatingId === r.id;
                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-[var(--bg-sink)] transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: s.bg,
                        border: `1px solid ${s.border}`,
                      }}
                    >
                      <StatusIcon size={18} style={{ color: s.text }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <p className="text-[13px] font-semibold text-[var(--tx-1)]">
                          {r.titre}
                        </p>
                        <span
                          className="text-[10px] px-1.5 py-px rounded font-medium"
                          style={{ background: s.bg, color: s.text }}
                        >
                          {s.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--tx-3)]">{r.desc}</p>
                      <p className="text-[10px] text-[var(--tx-3)] mt-0.5">
                        {r.type} · {r.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {r.status === "pret" && (
                        <>
                          <button
                            className="w-7 h-7 rounded-lg border border-[var(--bd-def)] flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors"
                            title="PDF"
                          >
                            <FilePdfIcon size={14} />
                          </button>
                          <button
                            className="w-7 h-7 rounded-lg border border-[var(--bd-def)] flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors"
                            title="Excel"
                          >
                            <FileXlsIcon size={14} />
                          </button>
                        </>
                      )}
                      {r.status === "brouillon" && (
                        <button
                          onClick={() => generate(r.id)}
                          disabled={isGenerating}
                          className="h-7 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                          style={{ background: "var(--p500)", color: "white" }}
                        >
                          {isGenerating ? (
                            <SpinnerGapIcon
                              size={12}
                              className="animate-spin"
                            />
                          ) : (
                            <MagicWandIcon size={12} />
                          )}
                          {isGenerating ? "Génération…" : "Générer"}
                        </button>
                      )}
                      {r.status === "auto" && (
                        <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] px-2 py-1 rounded-lg border border-[var(--bd-def)]">
                          Planifié
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </FinCard>

          {/* Comparaison Budget vs Réalisé (mock — pas de route CA dans l'API) */}
          <FinBarChart
            title="Budget vs Réalisé · CA mensuel"
            subtitle="Jan – Juin 2026 · Millions FCFA"
            ytd="651M"
            data={CA_COMPARE_DATA}
            series={[
              { yKey: "budget", yName: "Budget", fill: "#D1FAE5" },
              { yKey: "reel", yName: "Réalisé", fill: "#1E5B3C" },
            ]}
            height={200}
          />

          {/* Compte de résultat (mock) */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader
                title="Compte de résultat simplifié"
                badge={
                  <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">
                    Juin 2026 · milliers FCFA
                  </span>
                }
                action="Exporter"
                onAction={() => {}}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-t border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
                    {[
                      "Indicateur",
                      "Juin 2026",
                      "Mai 2026",
                      "Juin 2025",
                      "Budget",
                      "Écart Budget",
                      "%",
                      "Tendance",
                    ].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)]",
                          h === "Indicateur" ? "text-left" : "text-right",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bd-def)]">
                  {CR_DATA.map((l, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "hover:bg-[var(--bg-sink)] transition-colors",
                        l.isBold ? "bg-[var(--bg-sink)]" : "",
                      )}
                    >
                      <td
                        className={cn(
                          "px-4 py-2.5 text-[var(--tx-1)]",
                          l.isBold ? "font-bold text-[13px]" : "text-[12px]",
                        )}
                      >
                        {l.indicateur}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono",
                          l.isBold
                            ? "font-bold text-[var(--tx-1)]"
                            : "text-[var(--tx-2)]",
                        )}
                      >
                        {fmtK(l.juin26)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[var(--tx-3)]">
                        {fmtK(l.mai26)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[var(--tx-3)]">
                        {fmtK(l.juin25)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[var(--tx-3)]">
                        {fmtK(l.budget)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono font-semibold",
                          l.ecartB !== null && l.ecartB >= 0
                            ? "text-[var(--ok600)]"
                            : "text-[#DC2626]",
                        )}
                      >
                        {fmtEcart(l.ecartB)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-semibold",
                          l.ecartPct !== null && l.ecartPct >= 0
                            ? "text-[var(--ok600)]"
                            : "text-[#DC2626]",
                        )}
                      >
                        {fmtPct(l.ecartPct)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {l.tendance === "up" && (
                          <TrendUpIcon
                            size={14}
                            className="inline text-[var(--ok600)]"
                          />
                        )}
                        {l.tendance === "down" && (
                          <TrendDownIcon
                            size={14}
                            className="inline text-[#EF4444]"
                          />
                        )}
                        {!l.tendance && (
                          <MinusIcon
                            size={14}
                            className="inline text-[var(--tx-3)]"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FinCard>
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Export rapide */}
          <FinCard>
            <SectionLabel className="mb-3">Export rapide</SectionLabel>
            <div className="space-y-2">
              {[
                {
                  icon: <FilePdfIcon size={18} className="text-[#EF4444]" />,
                  label: "Rapport exécutif PDF",
                  sub: "Synthèse 4 pages · Prêt",
                },
                {
                  icon: (
                    <FileXlsIcon size={18} className="text-[var(--ok600)]" />
                  ),
                  label: "Données brutes Excel",
                  sub: "Toutes lignes · Filtrable",
                },
                {
                  icon: (
                    <FileCsvIcon size={18} className="text-[var(--tx-2)]" />
                  ),
                  label: "Export CSV · Créances",
                  sub: "Balance âgée · DSO",
                },
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[var(--bd-def)] hover:bg-[var(--bg-sink)] transition-colors text-left"
                >
                  {item.icon}
                  <div>
                    <p className="text-[12px] font-medium text-[var(--tx-1)]">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-[var(--tx-3)]">{item.sub}</p>
                  </div>
                  <DownloadSimpleIcon
                    size={14}
                    className="text-[var(--tx-3)] ml-auto"
                  />
                </button>
              ))}
            </div>
          </FinCard>

          {/* Synthèse IA — données réelles depuis le dernier run DAF */}
          <FinCard className="border-[rgba(16,185,129,.3)] bg-[rgba(16,185,129,.03)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ background: "var(--grad)" }}
                >
                  IA
                </span>
                <p className="text-[12px] font-semibold text-[var(--tx-1)]">
                  Synthèse IA · Dernier run
                </p>
              </div>
              <button
                onClick={() => dispatch(fetchRuns(5))}
                disabled={runsLoading}
                className="w-6 h-6 rounded-lg border border-[var(--bd-def)] flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <ArrowClockwiseIcon
                  size={12}
                  className={runsLoading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {runsLoading && !lastCompletedRun ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 w-full bg-[rgba(16,185,129,.1)] rounded" />
                <div className="h-3 w-5/6 bg-[rgba(16,185,129,.1)] rounded" />
                <div className="h-3 w-4/6 bg-[rgba(16,185,129,.1)] rounded" />
                <div className="h-3 w-full bg-[rgba(16,185,129,.1)] rounded" />
                <div className="h-3 w-3/4 bg-[rgba(16,185,129,.1)] rounded" />
              </div>
            ) : lastCompletedRun?.summary ? (
              <div className="prose-sm max-h-60 overflow-y-auto pr-1">
                {renderMarkdown(lastCompletedRun.summary)}
              </div>
            ) : (
              <p className="text-[12px] text-[var(--tx-3)] italic">
                {runsError
                  ? "Erreur de chargement."
                  : "Aucun run complété disponible."}
              </p>
            )}

            {lastCompletedRun && (
              <div className="mt-3 pt-2 border-t border-[rgba(16,185,129,.2)] flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[10px] text-[var(--tx-3)]">
                  {fmtDate(lastCompletedRun.started_at)} · Agent DAF · À valider
                </p>
                {lastCompletedRun.proposed_actions_count > 0 && (
                  <span className="text-[10px] font-semibold text-[var(--p600)] bg-[rgba(99,102,241,.08)] px-2 py-0.5 rounded-full">
                    {lastCompletedRun.proposed_actions_count} actions proposées
                  </span>
                )}
              </div>
            )}

            {/* Fallback : liste des runs récents si pas de summary */}
            {!runsLoading && runs.length > 0 && (
              <div className="mt-3 pt-2 border-t border-[rgba(16,185,129,.1)] space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mb-2">
                  Runs récents
                </p>
                {runs.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-px rounded font-semibold",
                        r.status === "completed"
                          ? "bg-[rgba(16,185,129,.1)] text-[#1B6B45]"
                          : r.status === "running"
                            ? "bg-[rgba(99,102,241,.1)] text-[#4338CA]"
                            : r.status === "failed"
                              ? "bg-[rgba(239,68,68,.1)] text-[#DC2626]"
                              : "bg-[var(--bg-sink)] text-[var(--tx-3)]",
                      )}
                    >
                      {r.status}
                    </span>
                    <span className="text-[10px] text-[var(--tx-3)] font-mono truncate">
                      {fmtDate(r.started_at)}
                    </span>
                    <span className="text-[10px] text-[var(--tx-3)]">
                      {r.proposed_actions_count} act.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </FinCard>

          {/* Rapports planifiés (mock) */}
          <FinCard>
            <SectionLabel className="mb-3">Rapports planifiés</SectionLabel>
            <div className="space-y-2">
              {[
                {
                  date: "10/07",
                  label: "Rapport hebdo semaine 28",
                  recurrence: "Hebdomadaire",
                },
                {
                  date: "10/08",
                  label: "Synthèse financière · Juil.",
                  recurrence: "Mensuel",
                },
                {
                  date: "15/10",
                  label: "Rapport semestriel S2",
                  recurrence: "Semestriel",
                },
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex items-start gap-3 py-2 border-b border-[var(--bd-def)] last:border-0"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-sink)] border border-[var(--bd-def)] flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[9px] text-[var(--tx-3)] font-bold">
                      {p.date.split("/")[1]}
                    </span>
                    <span className="text-[13px] font-bold text-[var(--tx-1)] leading-none">
                      {p.date.split("/")[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--tx-1)]">
                      {p.label}
                    </p>
                    <p className="text-[10px] text-[var(--tx-3)]">
                      {p.recurrence}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </FinCard>
        </div>
      </div>

      <FloatingToast
        message={toast?.msg ?? null}
        type={toast?.type ?? "error"}
      />
    </div>
  );
}
