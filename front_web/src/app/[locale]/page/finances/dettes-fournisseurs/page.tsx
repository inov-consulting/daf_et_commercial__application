"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import {
  fetchLatestSnapshot,
  fetchSnapshots,
} from "@/redux/features/daf/dafSlice";
import { fetchKpiCatalog } from "@/redux/features/kpi/kpiSlice";
import { FinSectionHeader } from "@/components/finance/fin-section-header";
import { FinLineChart, FR_MONTHS_SHORT } from "@/components/finance/fin-chart";
import { FinCard, FinCardHeader } from "@/components/finance/fin-card";
import { FloatingToast } from "@/components/ui/toast";
import {
  SpinnerGapIcon,
  WarningIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/* ── Types locaux ────────────────────────────────────────────────────── */

interface FactureRow {
  numero: string;
  fournisseur: string;
  montant: number;
  date_facture: string;
  echeance: string;
  jours_retard: number;
  devise: string;
}

/* ── Status dérivé du nombre de jours de retard ─────────────────────── */

type StatusKey = "critique" | "retard" | "a_echoir";

const STATUS_STYLE: Record<
  StatusKey,
  { dot: string; label: string; text: string }
> = {
  critique: { dot: "bg-[#EF4444]", label: "Critique", text: "text-[#DC2626]" },
  retard: { dot: "bg-[#F97316]", label: "En retard", text: "text-[#EA580C]" },
  a_echoir: {
    dot: "bg-[#10B981]",
    label: "À échoir",
    text: "text-[var(--ok600)]",
  },
};

function getStatus(jours: number): StatusKey {
  if (jours > 30) return "critique";
  if (jours > 0) return "retard";
  return "a_echoir";
}

function fmtIsoDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtM(v: number, digits = 1) {
  return `${(v / 1_000_000).toFixed(digits)}M FCFA`;
}

const FR_MONTHS_LONG = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function fmtPeriod(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const month = FR_MONTHS_LONG[parseInt(m[2], 10) - 1];
  return month ? `${month} ${m[1]}` : period;
}

function fmtSolde(v: number) {
  return v.toLocaleString("fr-FR") + " FCFA";
}

/* ── Skeleton KPI ────────────────────────────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 sm:p-5 animate-pulse"
        >
          <div className="h-3 w-24 bg-[#EEF2F7] rounded mb-3" />
          <div className="h-7 w-20 bg-[#EEF2F7] rounded mb-2" />
          <div className="h-2.5 w-32 bg-[#EEF2F7] rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function DettesFournisseursPage() {
  const dispatch = useAppDispatch();

  const {
    latestSnapshot,
    latestSnapshotLoading,
    latestSnapshotError,
    snapshots,
    snapshotsLoading,
    snapshotsError,
  } = useAppSelector((s) => s.daf);

  const { catalog, catalogLoading } = useAppSelector((s) => s.kpi);

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
    dispatch(fetchLatestSnapshot());
    dispatch(fetchSnapshots(10));
    if (!catalog.length) dispatch(fetchKpiCatalog());
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (latestSnapshotError) showToast(latestSnapshotError);
    if (snapshotsError) showToast(snapshotsError);
  }, [latestSnapshotError, snapshotsError]);

  /* Données dérivées */
  const snap = latestSnapshot;
  const isKpiLoading = latestSnapshotLoading && !snap;

  const facturesRows = (catalog.find(
    (k) => k.key === "daf_factures_impayees_fournisseurs",
  )?.chart.data ?? []) as unknown as FactureRow[];
  const maxMontant = Math.max(...facturesRows.map((r) => r.montant), 1);
  const nbEnRetard = facturesRows.filter((r) => r.jours_retard > 0).length;
  const totalFactures = facturesRows.reduce((s, r) => s + r.montant, 0);

  function exportCsv() {
    const headers = [
      "N° Facture",
      "Partenaire",
      "Montant",
      "Devise",
      "Date Facture",
      "Échéance",
      "Jours Retard",
      "Statut",
    ];
    const lines = facturesRows.map((r) =>
      [
        r.numero,
        `"${r.fournisseur.replace(/"/g, '""')}"`,
        r.montant,
        r.devise,
        r.date_facture,
        r.echeance,
        r.jours_retard,
        STATUS_STYLE[getStatus(r.jours_retard)].label,
      ].join(";"),
    );
    const csv = "﻿" + [headers.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `factures-impayees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // KPI cards
  const kpiCards = snap
    ? [
        {
          label: "Dettes fournisseurs totales",
          value: fmtM(snap.total_payables),
          sub: `Snapshot · ${fmtPeriod(snap.period_label)}`,
          color: "#DC2626",
          icon: <WarningIcon size={14} className="inline mr-0.5" />,
        },
        {
          label: "Dettes en retard",
          value: fmtM(snap.overdue_payables),
          sub: `${snap.overdue_payables_count} facture${snap.overdue_payables_count > 1 ? "s" : ""} en retard`,
          color: "#F97316",
          icon: <ClockIcon size={14} className="inline mr-0.5" />,
        },
        {
          label: "Fournisseurs en retard",
          value: `${snap.overdue_payables_count === null ? 0 : snap.overdue_payables_count}`,
          sub: `sur ${facturesRows.length} factures`,
          color: snap.overdue_payables_count > 2 ? "#DC2626" : "#F59E0B",
          icon: null,
        },
        {
          label: "Ratio créances / dettes",
          value:
            snap.total_payables > 0
              ? `${(snap.total_receivables / snap.total_payables).toFixed(2)}x`
              : "-",
          sub:
            snap.total_payables > 0 &&
            snap.total_receivables > snap.total_payables
              ? "Créances > Dettes - situation saine"
              : "Dettes > Créances - surveiller",
          color:
            snap.total_receivables >= snap.total_payables
              ? "#1B6B45"
              : "#DC2626",
          icon:
            snap.total_receivables >= snap.total_payables ? (
              <CheckCircleIcon size={14} className="inline mr-0.5" />
            ) : (
              <WarningIcon size={14} className="inline mr-0.5" />
            ),
        },
      ]
    : null;

  // Évolution dettes (oldest → newest)
  const evoData = [...snapshots]
    .sort(
      (a, b) =>
        new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime(),
    )
    .map((s) => ({
      mois: FR_MONTHS_SHORT[new Date(s.snapshot_at).getMonth()],
      dettes: +(s.total_payables / 1_000_000).toFixed(2),
      retard: +(s.overdue_payables / 1_000_000).toFixed(2),
    }));

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <FinSectionHeader
        title="Dettes fournisseurs"
        // secondaryAction={{ label: 'Exporter', icon: <DownloadSimpleIcon size={13} />, onClick: () => {} }}
        // actionLabel="+ Règlement"
        onAction={() => {}}
      />

      {/* KPI row */}
      {isKpiLoading ? (
        <KpiSkeleton />
      ) : kpiCards ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {kpiCards.map((k) => (
            <div
              key={k.label}
              className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-4 sm:p-5"
            >
              <p className="text-[11px] text-[var(--tx-3)] mb-1">{k.label}</p>
              <p
                className="font-display font-bold text-lg leading-tight"
                style={{ color: k.color }}
              >
                {k.icon}
                {k.value}
              </p>
              <p className="text-[11px] text-[var(--tx-3)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Évolution dettes (données réelles depuis snapshots) */}
          {snapshotsLoading && evoData.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 h-[240px] flex items-center justify-center">
              <SpinnerGapIcon
                size={24}
                className="animate-spin text-[var(--tx-3)]"
              />
            </div>
          ) : evoData.length > 0 ? (
            <FinLineChart
              title="Évolution des dettes fournisseurs"
              subtitle="Historique des snapshots · Millions FCFA"
              data={evoData}
              series={[
                {
                  yKey: "dettes",
                  yName: "Total dettes",
                  stroke: "#1E5B3C",
                  type: "area",
                },
                {
                  yKey: "retard",
                  yName: "En retard",
                  stroke: "#F97316",
                  type: "line",
                },
              ]}
              height={200}
            />
          ) : null}

          {/* Factures impayées (données réelles depuis KPI catalogue) */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader
                title="Factures impayées - en cours"
                badge={
                  <span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(239,68,68,.1)] px-2 py-0.5 rounded-full">
                    {nbEnRetard} en retard
                  </span>
                }
                action={facturesRows.length > 0 ? "Exporter" : undefined}
                onAction={facturesRows.length > 0 ? exportCsv : undefined}
              />
            </div>

            {catalogLoading && facturesRows.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <SpinnerGapIcon
                  size={22}
                  className="animate-spin text-[var(--tx-3)]"
                />
              </div>
            ) : facturesRows.length === 0 ? (
              <p className="text-center text-[12px] text-[var(--tx-3)] italic py-8">
                Aucune facture impayée.
              </p>
            ) : (
              <table className="w-full text-xs table-fixed">
                <thead>
                  <tr className="border-t border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
                    <th className="w-[40px] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-left">
                      #
                    </th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-left">
                      Partenaire
                    </th>
                    <th className="w-[110px] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                      N° Facture
                    </th>
                    <th className="w-[120px] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                      Montant dû
                    </th>
                    <th className="w-[95px] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                      Échéance
                    </th>
                    <th className="w-[65px] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                      Retard
                    </th>
                    <th className="w-[90px] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] text-right">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bd-def)]">
                  {facturesRows.map((f, i) => {
                    const status = getStatus(f.jours_retard);
                    const s = STATUS_STYLE[status];
                    const pct = Math.round((f.montant / maxMontant) * 100);
                    return (
                      <tr
                        key={f.numero}
                        className="hover:bg-[var(--bg-sink)] transition-colors"
                      >
                        <td className="px-4 py-2.5 text-[var(--tx-3)] font-mono text-[11px] text-left">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--tx-1)] text-[12px] truncate">
                              {f.fournisseur}
                            </p>
                            <div className="mt-1.5 h-[3px] bg-[var(--bg-sink)] rounded-full overflow-hidden w-full">
                              <div
                                className="h-full rounded-full bg-[#DC2626] transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[var(--tx-3)] text-[11px]">
                          {f.numero}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-[var(--tx-1)] text-[11px]">
                          {fmtSolde(f.montant)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[var(--tx-2)] text-[11px]">
                          {fmtIsoDate(f.echeance)}
                        </td>
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
                      Total ({facturesRows.length} facture
                      {facturesRows.length > 1 ? "s" : ""})
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#DC2626]">
                      {fmtSolde(totalFactures)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            )}
          </FinCard>
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4 xl:sticky xl:top-4 self-start">
          {/* Résumé snapshot */}
          {snap && (
            <FinCard>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-md bg-[rgba(220,38,38,.12)] flex items-center justify-center flex-shrink-0">
                  <WarningIcon size={13} className="text-[#DC2626]" />
                </span>
                <p className="text-[12px] font-semibold text-[var(--tx-1)]">
                  Synthèse snapshot
                </p>
                <span className="ml-auto text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">
                  {fmtPeriod(snap.period_label)}
                </span>
              </div>

              {/* Bloc Dettes fournisseurs */}
              <div className="mb-3">
                <p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#DC2626] mb-1.5">
                  Dettes fournisseurs
                </p>
                <div className="rounded-xl border border-[rgba(220,38,38,.15)] bg-[rgba(220,38,38,.03)] divide-y divide-[rgba(220,38,38,.1)]">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-[var(--tx-3)]">
                      Total
                    </span>
                    <span className="text-[12px] font-bold font-mono text-[var(--tx-1)]">
                      {fmtM(snap.total_payables)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-[var(--tx-3)]">
                      En retard
                    </span>
                    <span className="text-[12px] font-bold font-mono text-[#F97316]">
                      {fmtM(snap.overdue_payables)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-[var(--tx-3)]">
                      Factures fournisseurs en retard
                    </span>
                    <span className="text-[12px] font-semibold text-[#F97316]">
                      {snap.overdue_payables_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloc Créances clients */}
              <div className="mb-3">
                <p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#1B6B45] mb-1.5">
                  Créances clients
                </p>
                <div className="rounded-xl border border-[rgba(27,107,69,.15)] bg-[rgba(27,107,69,.03)] divide-y divide-[rgba(27,107,69,.1)]">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-[var(--tx-3)]">
                      Total
                    </span>
                    <span className="text-[12px] font-bold font-mono text-[var(--tx-1)]">
                      {fmtM(snap.total_receivables)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-[var(--tx-3)]">
                      En retard
                    </span>
                    <span className="text-[12px] font-bold font-mono text-[#F97316]">
                      {fmtM(snap.overdue_receivables)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-[var(--tx-3)]">
                      Factures clients en retard
                    </span>
                    <span className="text-[12px] font-semibold text-[#F97316]">
                      {snap.overdue_receivables_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Position globale */}
              <div className="rounded-xl border border-[var(--bd-def)] bg-[var(--bg-sink)] divide-y divide-[var(--bd-def)]">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] text-[var(--tx-3)]">
                    Ratio créances / dettes
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-bold",
                      snap.total_receivables >= snap.total_payables
                        ? "text-[var(--ok600)]"
                        : "text-[#DC2626]",
                    )}
                  >
                    {snap.total_payables > 0
                      ? `${(snap.total_receivables / snap.total_payables).toFixed(1)}x`
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] text-[var(--tx-3)]">
                    DSO moyen
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-bold",
                      snap.dso_days > 45
                        ? "text-[#F97316]"
                        : "text-[var(--ok600)]",
                    )}
                  >
                    {snap.dso_days === null ? 0 : snap.dso_days}j
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] text-[var(--tx-3)]">
                    Trésorerie nette
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-bold font-mono",
                      snap.cash_position >= 0
                        ? "text-[var(--tx-1)]"
                        : "text-[#DC2626]",
                    )}
                  >
                    {fmtM(snap.cash_position)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-[var(--tx-3)] mt-3 pt-2 border-t border-[var(--bd-def)]">
                Snapshot ·{" "}
                {new Date(snap.snapshot_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </FinCard>
          )}

          {/* Actions rapides */}
          {/* <FinCard>
            <SectionLabel className="mb-3">Actions rapides</SectionLabel>
            <div className="space-y-2">
              {[
                { label: 'Préparer virements urgents',     sub: `${snap?.overdue_payables_count ?? 0} fournisseurs en retard`, color: '#DC2626' },
                { label: 'Exporter balance âgée',           sub: 'PDF · Excel · CSV',                                          color: 'var(--tx-2)' },
                { label: 'Planifier règlements du mois',    sub: 'Créer calendrier de paiements',                              color: 'var(--p500)' },
              ].map(a => (
                <button
                  key={a.label}
                  className="w-full flex items-start gap-3 p-2.5 rounded-lg border border-[var(--bd-def)] hover:bg-[var(--bg-sink)] transition-colors text-left"
                >
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: a.color }} />
                  <div>
                    <p className="text-[12px] font-medium text-[var(--tx-1)]">{a.label}</p>
                    <p className="text-[10px] text-[var(--tx-3)]">{a.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </FinCard> */}
        </div>
      </div>

      <FloatingToast
        message={toast?.msg ?? null}
        type={toast?.type ?? "error"}
      />
    </div>
  );
}
