"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import {
  fetchLatestSnapshot,
  fetchSnapshots,
  fetchProposedActions,
  approveAction,
  rejectAction,
  clearDecideError,
} from "@/redux/features/daf/dafSlice";
import { fetchKpiCatalog } from "@/redux/features/kpi/kpiSlice";
import { FinSectionHeader } from "@/components/finance/fin-section-header";
import { FinCard, FinCardHeader } from "@/components/finance/fin-card";
import { FR_MONTHS_SHORT } from "@/components/finance/fin-chart";
import { BalanceAgee } from "@/components/finance/balance-agee";
import { FinLineChart } from "@/components/finance/fin-chart";
import { FloatingToast } from "@/components/ui/toast";
import { ActionDetailDrawer } from "@/components/finance/action-detail-drawer";
import {
  ArrowRightIcon,
  CheckIcon,
  XIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  EyeIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { DafActionPriority, DafActionStatus } from "@/types/daf_type";
import type { BalanceAgeeItem } from "@/types/finance_type";

/* ── Helpers ────────────────────────────────────────────────────────── */

function fmtM(v: number) {
  if (!v) return "0 FCFA";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}Md FCFA`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k FCFA`;
  return `${v.toLocaleString("fr-FR")} FCFA`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ── Config priorité / statut ───────────────────────────────────────── */

const PRIORITY_STYLE: Record<
  DafActionPriority,
  { text: string; bg: string; border: string; bar: string; label: string }
> = {
  critical: {
    text: "#DC2626",
    bg: "rgba(239,68,68,.08)",
    border: "rgba(239,68,68,.25)",
    bar: "#EF4444",
    label: "Critique",
  },
  high: {
    text: "#EA580C",
    bg: "rgba(249,115,22,.08)",
    border: "rgba(249,115,22,.25)",
    bar: "#F97316",
    label: "Élevée",
  },
  medium: {
    text: "#B45309",
    bg: "rgba(245,158,11,.08)",
    border: "rgba(245,158,11,.25)",
    bar: "#F59E0B",
    label: "Moyenne",
  },
  low: {
    text: "#1B6B45",
    bg: "rgba(16,185,129,.08)",
    border: "rgba(16,185,129,.25)",
    bar: "#10B981",
    label: "Faible",
  },
};

const STATUS_STYLE: Record<
  DafActionStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: "En attente", bg: "rgba(245,158,11,.1)", text: "#B45309" },
  approved: { label: "Approuvée", bg: "rgba(16,185,129,.1)", text: "#1B6B45" },
  rejected: { label: "Rejetée", bg: "rgba(239,68,68,.08)", text: "#DC2626" },
  executed: { label: "Exécutée", bg: "rgba(99,102,241,.1)", text: "#4338CA" },
  failed: { label: "Échouée", bg: "rgba(239,68,68,.08)", text: "#DC2626" },
};

/* ── Types factures clients ─────────────────────────────────────────── */

interface FactureClientRow {
  numero: string;
  client: string;
  montant: number;
  date_facture: string;
  echeance: string;
  jours_retard: number;
  devise: string;
}

type StatusKey = "critique" | "retard" | "a_echoir";
const FACTURE_STATUS: Record<
  StatusKey,
  { dot: string; label: string; text: string }
> = {
  critique: { dot: "bg-[#EF4444]", label: "Critique", text: "text-[#DC2626]" },
  retard: { dot: "bg-[#F97316]", label: "En retard", text: "text-[#EA580C]" },
  a_echoir: { dot: "bg-[#10B981]", label: "À échoir", text: "text-[#1B6B45]" },
};
function getFactureStatus(jours: number): StatusKey {
  if (jours > 30) return "critique";
  if (jours > 0) return "retard";
  return "a_echoir";
}
function fmtIsoDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function fmtSolde(v: number) {
  return v.toLocaleString("fr-FR") + " FCFA";
}

/* ── Balance âgée (mock) ────────────────────────────────────────────── */

const BALANCE_AGEE_MOCK: BalanceAgeeItem[] = [
  { tranche: "0 – 30 jours", montant: 18_900, pct: 40 },
  { tranche: "31 – 45 jours", montant: 6_200, pct: 13 },
  { tranche: "46 – 60 jours", montant: 3_800, pct: 8 },
  { tranche: "61 – 90 jours", montant: 14_200, pct: 30 },
  { tranche: "> 90 jours", montant: 4_100, pct: 9 },
];

/* ── Squelettes ─────────────────────────────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 sm:p-5 animate-pulse w-full"
        >
          <div className="h-3 w-3/4 bg-[#EEF2F7] rounded mb-3" />
          <div className="h-7 w-1/3 bg-[#EEF2F7] rounded mb-2" />
          <div className="h-2.5 w-2/3 bg-[#EEF2F7] rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function DsoCreancesPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "fr";

  const {
    latestSnapshot,
    latestSnapshotLoading,
    latestSnapshotError,
    snapshots,
    snapshotsLoading,
    snapshotsError,
    proposedActions,
    proposedActionsLoading,
    proposedActionsError,
    decidingId,
    decideError,
  } = useAppSelector((s) => s.daf);

  const { catalog, catalogLoading } = useAppSelector((s) => s.kpi);

  const [toast, setToast] = useState<{
    msg: string;
    type: "error" | "success" | "info";
  } | null>(null);
  const [detailAction, setDetailAction] = useState<
    import("@/types/daf_type").DafProposedAction | null
  >(null);
  const [actionPage, setActionPage] = useState(0);
  const ACTION_PAGE_SIZE = 10;
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
    dispatch(fetchLatestSnapshot());
    dispatch(fetchSnapshots(10));
    dispatch(fetchProposedActions({ status: "pending", limit: 50 }));
    if (!catalog.length) dispatch(fetchKpiCatalog());
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    setActionPage(0);
  }, [proposedActions]);

  useEffect(() => {
    if (latestSnapshotError) showToast(latestSnapshotError);
    if (snapshotsError) showToast(snapshotsError);
    if (proposedActionsError) showToast(proposedActionsError);
  }, [latestSnapshotError, snapshotsError, proposedActionsError]);

  useEffect(() => {
    if (decideError) {
      showToast(decideError);
      dispatch(clearDecideError());
    }
  }, [decideError, dispatch]);

  async function handleApprove(actionId: string) {
    const res = await dispatch(approveAction({ actionId }));
    if (approveAction.fulfilled.match(res))
      showToast("Action approuvée avec succès", "success");
  }

  async function handleReject(actionId: string) {
    const res = await dispatch(rejectAction({ actionId }));
    if (rejectAction.fulfilled.match(res)) showToast("Action rejetée", "info");
  }

  const snap = latestSnapshot;

  const dsoObjectif = 45;
  const dsoValue = snap?.dso_days ?? 0;
  const dsoTrend = dsoValue > dsoObjectif ? "warning" : "up";

  const chartData = [...snapshots]
    .sort(
      (a, b) =>
        new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime(),
    )
    .map((s) => ({
      mois: FR_MONTHS_SHORT[new Date(s.snapshot_at).getMonth()],
      dso: s.dso_days,
      objectif: dsoObjectif,
    }));

  /* Factures clients impayées */
  const facturesClients = (catalog.find(
    (k) => k.key === "daf_factures_impayees_clients",
  )?.chart.data ?? []) as unknown as FactureClientRow[];
  const maxMontantClient = Math.max(
    ...facturesClients.map((r) => r.montant),
    1,
  );
  const totalFacturesClient = facturesClients.reduce(
    (s, r) => s + r.montant,
    0,
  );
  const nbClientRetard = facturesClients.filter(
    (r) => r.jours_retard > 0,
  ).length;

  function exportFacturesCsv() {
    const headers = [
      "N° Facture",
      "Client",
      "Montant",
      "Devise",
      "Date Facture",
      "Échéance",
      "Jours Retard",
      "Statut",
    ];
    const lines = facturesClients.map((r) =>
      [
        r.numero,
        `"${r.client.replace(/"/g, '""')}"`,
        r.montant,
        r.devise,
        r.date_facture,
        r.echeance,
        r.jours_retard,
        FACTURE_STATUS[getFactureStatus(r.jours_retard)].label,
      ].join(";"),
    );
    const csv = "﻿" + [headers.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `factures-clients-impayees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const priorityRank: Record<DafActionPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const actions = [...proposedActions]
    .filter(
      (a) =>
        a.action_type === "send_reminder" ||
        a.action_type === "escalate" ||
        a.action_type === "flag_risk",
    )
    .sort(
      (a, b) =>
        (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9),
    );

  const criticalCount = actions.filter((a) => a.priority === "critical").length;
  const pageCount = Math.ceil(actions.length / ACTION_PAGE_SIZE);
  const paginatedActions = actions.slice(
    actionPage * ACTION_PAGE_SIZE,
    (actionPage + 1) * ACTION_PAGE_SIZE,
  );

  const isLoading =
    latestSnapshotLoading || snapshotsLoading || proposedActionsLoading;

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto space-y-4 sm:space-y-6">
      <FinSectionHeader title="DSO & Créances clients" onAction={() => {}} />

      {/* KPI row */}
      {isLoading && !snap ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              label: "DSO moyen global",
              value: snap
                ? `${snap.dso_days === null ? 0 : snap.dso_days} jour${snap.dso_days > 1 ? "s" : ""}`
                : "—",
              sub: `Objectif : ${dsoObjectif}j${snap && snap.dso_days > dsoObjectif ? ` — +${snap.dso_days - dsoObjectif}j` : " — Respecté"}`,
              accent: dsoTrend === "warning" ? "#F97316" : "#1B6B45",
            },
            {
              label: "Créances totales",
              value: snap ? fmtM(snap.total_receivables) : "—",
              sub: `${snap?.overdue_receivables_count ?? 0} client(s) en retard`,
              accent: "#DC2626",
            },
            {
              label: "Créances en retard",
              value: snap ? fmtM(snap.overdue_receivables) : "—",
              sub: `${snap?.overdue_receivables_count ?? 0} client(s) · relances prioritaires`,
              accent: "#DC2626",
            },
            {
              label: "Position de trésorerie",
              value: snap ? fmtM(snap.cash_position) : "—",
              sub: snap ? `Mis à jour le ${fmtDate(snap.snapshot_at)}` : "—",
              accent: "#1B6B45",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-4 sm:p-5 flex flex-col"
            >
              <p className="text-[11px] text-[var(--tx-3)] mb-1">{k.label}</p>
              <p
                className="font-display font-bold text-lg sm:text-xl leading-tight mt-auto"
                style={{ color: k.accent }}
              >
                {k.value}
              </p>
              <p className="text-[11px] text-[var(--tx-3)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Layout principal : 2 colonnes sur desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 sm:gap-5 items-start">
        {/* Colonne gauche */}
        <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
          {/* Chart évolution DSO */}
          {chartData.length > 0 ? (
            <FinLineChart
              title="Évolution DSO moyen"
              subtitle="Historique des snapshots · Jours"
              data={chartData}
              series={[
                { yKey: "dso", yName: "DSO réel", stroke: "#F97316" },
                {
                  yKey: "objectif",
                  yName: `Objectif ${dsoObjectif}j`,
                  stroke: "#D1FAE5",
                },
              ]}
              height={220}
              yFormatter={(v) => `${v}j`}
            />
          ) : snapshotsLoading ? (
            <div className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 h-[240px] animate-pulse flex items-center justify-center">
              <SpinnerGapIcon
                size={24}
                className="animate-spin text-[var(--tx-3)]"
              />
            </div>
          ) : null}
        </div>

        {/* Colonne droite - Sidebar */}
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Jauge DSO */}
          <FinCard>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] text-[var(--tx-3)] mb-0.5">
                  DSO actuel
                </p>
                <p
                  className="font-display font-bold text-[32px] sm:text-4xl leading-none"
                  style={{
                    color: dsoValue > dsoObjectif ? "#F97316" : "#1B6B45",
                  }}
                >
                  {latestSnapshotLoading ? "…" : dsoValue}
                </p>
                <p className="text-[11px] text-[var(--tx-3)] mt-0.5">jours</p>
              </div>
              <button
                onClick={() => dispatch(fetchLatestSnapshot())}
                className="text-[11px] font-medium text-[var(--p500)] hover:underline flex items-center gap-1 flex-shrink-0"
              >
                Actualiser <ArrowRightIcon size={11} />
              </button>
            </div>

            {/* Gauge bar */}
            <div className="h-[8px] bg-[var(--bg-sink)] rounded-full overflow-hidden mb-2 relative">
              <div className="absolute inset-0 flex">
                <div
                  className="h-full bg-[#10B981]"
                  style={{ width: `${(dsoObjectif / 90) * 100}%` }}
                />
                <div
                  className="h-full bg-[#F59E0B]"
                  style={{ width: `${(15 / 90) * 100}%` }}
                />
                <div className="h-full flex-1 bg-[#EF4444]" />
              </div>
              {dsoValue > 0 && (
                <div
                  className="absolute top-0 h-full w-[3px] bg-white ring-1 ring-[var(--tx-1)] rounded-full"
                  style={{ left: `${Math.min((dsoValue / 90) * 100, 98)}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[9px] text-[var(--tx-3)] mb-4">
              <span>0j</span>
              <span>{dsoObjectif}j</span>
              <span>60j</span>
              <span>90j</span>
            </div>

            <div className="space-y-2 pt-3 border-t border-[var(--bd-def)]">
              <div className="flex justify-between text-[12px]">
                <span className="text-[var(--tx-3)]">Objectif</span>
                <span className="font-semibold text-[var(--tx-1)]">
                  {dsoObjectif} jours
                  {dsoValue > dsoObjectif && (
                    <span className="text-[#F97316] ml-1">
                      +{dsoValue - dsoObjectif}j
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[var(--tx-3)]">Créances en retard</span>
                <span className="font-semibold text-[#DC2626]">
                  {snap ? fmtM(snap.overdue_receivables) : "—"}
                </span>
              </div>
              {snap && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--tx-3)]">Snapshot</span>
                  <span className="text-[var(--tx-2)]">
                    {fmtDate(snap.snapshot_at)}
                  </span>
                </div>
              )}
            </div>
          </FinCard>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
        {/* Factures clients impayées */}
        <FinCard padding={false}>
          <div className="px-4 sm:px-5 pt-4 pb-2">
            <FinCardHeader
              title="Factures clients impayées"
              badge={
                <span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(239,68,68,.1)] px-2 py-0.5 rounded-full">
                  {nbClientRetard} en retard
                </span>
              }
              action={facturesClients.length > 0 ? "Exporter" : undefined}
              onAction={
                facturesClients.length > 0 ? exportFacturesCsv : undefined
              }
            />
          </div>

          {catalogLoading && facturesClients.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <SpinnerGapIcon
                size={22}
                className="animate-spin text-[var(--tx-3)]"
              />
            </div>
          ) : facturesClients.length === 0 ? (
            <p className="text-center text-[12px] text-[var(--tx-3)] italic py-8">
              Aucune facture client impayée.
            </p>
          ) : (
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="border-t border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
                  <th className="w-[40px] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-left">
                    #
                  </th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-left">
                    Client
                  </th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                    N° Facture
                  </th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                    Montant dû
                  </th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                    Échéance
                  </th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                    Retard
                  </th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bd-def)]">
                {facturesClients.map((f, i) => {
                  const status = getFactureStatus(f.jours_retard);
                  const s = FACTURE_STATUS[status];
                  const pct = Math.round((f.montant / maxMontantClient) * 100);
                  return (
                    <tr
                      key={f.numero}
                      className="hover:bg-[var(--bg-sink)] transition-colors"
                    >
                      {/* # */}
                      <td className="px-4 py-2.5 text-[var(--tx-3)] font-mono text-[11px] text-left">
                        {i + 1}
                      </td>

                      {/* Client - avec barre de progression */}
                      <td className="px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--tx-1)] text-[12px] truncate" title={f.client}>
                            {f.client}
                          </p>
                          <div className="mt-1.5 h-[3px] bg-[var(--bg-sink)] rounded-full overflow-hidden w-full">
                            <div
                              className="h-full rounded-full bg-[#F97316] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* N° Facture */}
                      <td className="px-4 py-2.5 text-right font-mono text-[var(--tx-3)] text-[11px]">
                        {f.numero}
                      </td>

                      {/* Montant dû */}
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-[var(--tx-1)] text-[11px]">
                        {fmtSolde(f.montant)}
                      </td>

                      {/* Échéance */}
                      <td className="px-4 py-2.5 text-right text-[var(--tx-2)] text-[11px]">
                        {fmtIsoDate(f.echeance)}
                      </td>

                      {/* Retard */}
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-semibold text-[11px]",
                          f.jours_retard > 0
                            ? "text-[#DC2626]"
                            : "text-[var(--tx-3)]",
                        )}
                      >
                        {f.jours_retard > 0 ? `+${f.jours_retard}j` : "—"}
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold">
                          <span
                            className={cn(
                              "w-[6px] h-[6px] rounded-full flex-shrink-0",
                              s.dot,
                            )}
                          />
                          <span className={s.text}>{s.label}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--bd-def)] bg-[var(--bg-sink)] font-bold">
                  <td colSpan={3} className="px-4 py-3 text-sm">
                    Total ({facturesClients.length} facture
                    {facturesClients.length > 1 ? "s" : ""})
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[#DC2626]">
                    {fmtSolde(totalFacturesClient)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )}
        </FinCard>

        {/* Actions proposées */}
        <FinCard padding={false}>
          <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-space-grotesk text-sm font-semibold text-[var(--tx-1)]">
                Actions proposées par l&apos;agent DAF
              </h3>
              {criticalCount > 0 ? (
                <span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(239,68,68,.1)] px-2 py-0.5 rounded-full flex-shrink-0">
                  {criticalCount} critique{criticalCount > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5 flex-shrink-0">
                  {actions.length} action{actions.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {actions.length > 0 && (
              <button
                onClick={() => router.push(`/${locale}/page/finances/alertes`)}
                className="text-[11px] font-medium text-[var(--p500)] hover:underline flex-shrink-0 whitespace-nowrap"
              >
                Vue complète
              </button>
            )}
          </div>

          {proposedActionsLoading && actions.length === 0 && (
            <div className="divide-y divide-[var(--bd-def)] border-t border-[var(--bd-def)]">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-4 animate-pulse"
                >
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-48 bg-[#EEF2F7] rounded" />
                    <div className="h-2.5 w-64 bg-[#EEF2F7] rounded" />
                  </div>
                  <div className="h-6 w-16 bg-[#EEF2F7] rounded-full" />
                </div>
              ))}
            </div>
          )}

          {!proposedActionsLoading && actions.length === 0 && (
            <div className="border-t border-[var(--bd-def)] py-10 text-center">
              <CheckIcon
                size={28}
                className="mx-auto mb-2 text-[var(--ok500)] opacity-60"
              />
              <p className="text-[12px] text-[var(--tx-3)]">
                Aucune action en attente
              </p>
            </div>
          )}

          {actions.length > 0 && (
            <>
              <div className="overflow-x-auto border-t border-[var(--bd-def)]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[var(--bg-sink)] text-[var(--tx-3)] text-left">
                      <th className="px-3 sm:px-4 py-2.5 font-semibold whitespace-nowrap w-[80px]">
                        Priorité
                      </th>
                      <th className="px-3 sm:px-4 py-2.5 font-semibold">
                        Titre
                      </th>
                      <th className="px-3 sm:px-4 py-2.5 font-semibold hidden md:table-cell">
                        Description
                      </th>
                      <th className="px-3 sm:px-4 py-2.5 font-semibold whitespace-nowrap hidden sm:table-cell w-[100px]">
                        Date
                      </th>
                      <th className="px-3 sm:px-4 py-2.5 font-semibold whitespace-nowrap w-[90px]">
                        Statut
                      </th>
                      <th className="px-3 sm:px-4 py-2.5 font-semibold text-right w-[130px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bd-def)]">
                    {paginatedActions.map((action) => {
                      const p =
                        PRIORITY_STYLE[action.priority] ?? PRIORITY_STYLE.low;
                      const s =
                        STATUS_STYLE[action.status] ?? STATUS_STYLE.pending;
                      const isDeciding = decidingId === action.id;
                      return (
                        <tr
                          key={action.id}
                          className="hover:bg-[var(--bg-sink)] transition-colors"
                        >
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: p.bg,
                                color: p.text,
                                border: `1px solid ${p.border}`,
                              }}
                            >
                              {p.label}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <p className="font-semibold text-[var(--tx-1)] leading-snug line-clamp-2">
                              {action.title}
                            </p>
                          </td>
                          <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                            <p className="text-[var(--tx-2)] line-clamp-2 max-w-[200px]">
                              {action.description}
                            </p>
                          </td>
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-[var(--tx-3)] hidden sm:table-cell">
                            {fmtDate(action.proposed_at)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <span
                              className="font-semibold text-[11px]"
                              style={{ color: s.text }}
                            >
                              {s.label}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => setDetailAction(action)}
                                className="h-7 w-7 rounded-lg text-[11px] flex items-center justify-center text-[var(--tx-3)] border border-[var(--bd-def)] hover:bg-[var(--bg-sink)] transition-colors"
                                title="Voir détails"
                              >
                                <EyeIcon size={12} />
                              </button>
                              {action.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(action.id)}
                                    disabled={isDeciding}
                                    className="h-7 w-7 sm:w-auto sm:px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 bg-[rgba(16,185,129,.1)] text-[var(--ok600)] hover:bg-[rgba(16,185,129,.2)] disabled:opacity-50 transition-colors"
                                    title="Valider"
                                  >
                                    {isDeciding ? (
                                      <SpinnerGapIcon
                                        size={12}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <CheckIcon size={12} weight="bold" />
                                    )}
                                    <span className="hidden sm:inline">
                                      Valider
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleReject(action.id)}
                                    disabled={isDeciding}
                                    className="h-7 w-7 sm:w-auto sm:px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 bg-[rgba(239,68,68,.08)] text-[#DC2626] hover:bg-[rgba(239,68,68,.15)] disabled:opacity-50 transition-colors"
                                    title="Rejeter"
                                  >
                                    <XIcon size={12} weight="bold" />
                                    <span className="hidden sm:inline">
                                      Rejeter
                                    </span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--bd-def)]">
                  <button
                    onClick={() => setActionPage((p) => Math.max(0, p - 1))}
                    disabled={actionPage === 0}
                    className="h-7 px-3 rounded-lg text-[11px] font-semibold bg-[var(--bg-sink)] border border-[var(--bd-def)] text-[var(--tx-2)] hover:bg-[var(--bd-def)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Précédent
                  </button>
                  <span className="text-[11px] text-[var(--tx-3)]">
                    {actionPage + 1} / {pageCount}
                  </span>
                  <button
                    onClick={() =>
                      setActionPage((p) => Math.min(pageCount - 1, p + 1))
                    }
                    disabled={actionPage >= pageCount - 1}
                    className="h-7 px-3 rounded-lg text-[11px] font-semibold bg-[var(--bg-sink)] border border-[var(--bd-def)] text-[var(--tx-2)] hover:bg-[var(--bd-def)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
          )}
        </FinCard>
      </div>

      <ActionDetailDrawer
        action={detailAction}
        onClose={() => setDetailAction(null)}
        onApprove={(id) => dispatch(approveAction({ actionId: id }))}
        onReject={(id) => dispatch(rejectAction({ actionId: id }))}
        decidingId={decidingId}
      />

      {/* Toast */}
      <FloatingToast
        message={toast?.msg ?? null}
        type={toast?.type ?? "error"}
      />
    </div>
  );
}
