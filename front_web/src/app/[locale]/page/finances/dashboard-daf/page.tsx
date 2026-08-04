"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import {
  fetchAgentStatus,
  triggerAgent,
  fetchRuns,
  fetchLatestSnapshot,
  fetchSnapshots,
  fetchProposedActions,
  approveAction,
  rejectAction,
} from "@/redux/features/daf/dafSlice";
import { fetchKpiCatalog } from "@/redux/features/kpi/kpiSlice";
import { FinSectionHeader } from "@/components/finance/fin-section-header";
import { FinKpiRow } from "@/components/finance/fin-kpi-row";
import { AgentSyntheseDaf } from "@/components/finance/agent-synthese-daf";
import { ActionDetailDrawer } from "@/components/finance/action-detail-drawer";
import { RunDetailDrawer } from "@/components/finance/run-detail-drawer";
import { AlertesFin } from "@/components/finance/alertes-fin";
import { CreancesTop } from "@/components/finance/creances-top";
import {
  FR_MONTHS_SHORT,
} from "@/components/finance/fin-chart";
import {
  KpiChartCard,
  KpiChartCardSkeleton,
} from "@/components/kpi/kpi-chart-card";
import { FloatingToast } from "@/components/ui/toast";
import { SpinnerGapIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import type {
  FinKpi,
  AlerteFinance,
} from "@/types/finance_type";
import type { KpiItem } from "@/types/kpi_type";

import type {
  DafAgentStatus,
  DafProposedAction,
  DafSnapshot,
} from "@/types/daf_type";

/* ── Helpers KPI Agent DAF ───────────────────────────────────────────── */

const FR_MONTHS_ABBR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function fmtDayLabel(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  return `${d.getDate()} ${FR_MONTHS_ABBR[d.getMonth()]}`;
}

function transformDayKpi(kpi: KpiItem): KpiItem {
  const xKey = kpi.chart.series[0]?.xKey;
  if (!xKey) return kpi;
  const sample = String(kpi.chart.data[0]?.[xKey] ?? '');
  if (!/^\d{4}-\d{2}-\d{2}/.test(sample)) return kpi;
  const seen = new Set<string>();
  const newData: Record<string, unknown>[] = [];
  for (const row of kpi.chart.data) {
    const dayKey = String(row[xKey] ?? '').slice(0, 10);
    if (seen.has(dayKey)) continue;
    seen.add(dayKey);
    newData.push({ ...row, [xKey]: fmtDayLabel(String(row[xKey])) });
  }
  return { ...kpi, chart: { ...kpi.chart, data: newData } };
}

function swapCritiqueBasse(kpi: KpiItem): KpiItem {
  if (kpi.key !== 'daf_actions_priorite') return kpi;
  const series = [...kpi.chart.series];
  const ci = series.findIndex(s => s.yKey === 'Critique');
  const bi = series.findIndex(s => s.yKey === 'Basse');
  if (ci === -1 || bi === -1) return kpi;
  [series[ci], series[bi]] = [series[bi], series[ci]];
  return { ...kpi, chart: { ...kpi.chart, series } };
}

const KPI_MOCK: FinKpi[] = [
  {
    label: `Chiffre d'affaires · ${FR_MONTHS_ABBR[new Date().getMonth()]}`,
    value: "—",
    sub: `Données en cours de chargement…`,
    trend: "up",
    trendVal: "+18%",
    accent: "success",
  },
  {
    label: "Trésorerie nette",
    value: "—",
    sub: "Chargement…",
    trend: "neutral",
    trendVal: "…",
    accent: "primary",
  },
  {
    label: "DSO moyen",
    value: "—",
    sub: "Objectif 45j",
    trend: "neutral",
    trendVal: "…",
    accent: "warning",
  },
  {
    label: "Créances en retard",
    value: "—",
    sub: "Chargement…",
    trend: "neutral",
    trendVal: "…",
    accent: "error",
  },
];

const ALERTES_FALLBACK: AlerteFinance[] = [
  {
    id: 1,
    level: "info",
    title: "Données en cours de chargement",
    sub: "Les alertes seront disponibles une fois les données API reçues.",
    date: "—",
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtM(v: number) {
  return `${(v / 1_000_000).toFixed(1)}M FCFA`;
}

/* ── Fonctions de mapping API → props composants ────────────────────── */

function snapshotToKpis(snap: DafSnapshot): FinKpi[] {
  const dsoOver = snap.dso_days - 45;
  return [
    {
      label: `Chiffre d'affaires · ${FR_MONTHS_ABBR[new Date().getMonth()]}`,
      value: "—",
      sub: `en ${FR_MONTHS_ABBR[(new Date().getMonth() + 11) % 12]} — estimation`,
      trend: "up",
      trendVal: "+18%",
      accent: "success",
    },
    {
      label: "Trésorerie nette",
      value: fmtM(snap.cash_position),
      sub: `Snapshot · ${snap.period_label}`,
      trend: snap.cash_position > 0 ? "up" : "down",
      trendVal: snap.cash_position > 0 ? "Positive" : "Négative",
      accent: snap.cash_position > 0 ? "success" : "error",
    },
    {
      label: "DSO moyen",
      value: `${snap.dso_days === null ? 0 : snap.dso_days} jour${snap.dso_days > 1 ? 's' : ''}`,
      sub:
        snap.dso_days > 45
          ? `Objectif 45j — dépassé de ${dsoOver}j`
          : "Objectif 45j — respecté",
      trend: snap.dso_days > 45 ? "warning" : "up",
      trendVal: snap.dso_days > 45 ? `+${dsoOver}j` : `-${45 - snap.dso_days}j`,
      accent: snap.dso_days > 45 ? "warning" : "success",
    },
    {
      label: "Créances en retard",
      value: fmtM(snap.overdue_receivables),
      sub: `${snap.overdue_receivables_count === null ? 0 : snap.overdue_receivables_count} client${snap.overdue_receivables_count > 1 ? 's' : ''} · Relances prioritaires`,
      trend: "down",
      trendVal: `${snap.overdue_receivables_count} client${snap.overdue_receivables_count > 1 ? 's' : ''}`,
      accent: "error",
    },
  ];
}

function buildAlertes(
  actions: DafProposedAction[],
  snap: DafSnapshot | null,
): AlerteFinance[] {
  const result: AlerteFinance[] = [];

  if (snap && snap.dso_days > 45) {
    result.push({
      id: 0,
      level: snap.dso_days > 60 ? "critique" : "urgent",
      tag: "DSO",
      title: `DSO ${snap.dso_days}j · Seuil dépassé`,
      sub: `Objectif 45j — ${snap.overdue_receivables_count} client${snap.overdue_receivables_count > 1 ? 's' : ''} > 60j — ${fmtM(snap.overdue_receivables)} exposés`,
      date: snap.period_label,
    });
  }

  actions
    .filter((a) => a.status === "pending")
    .slice(0, 4)
    .forEach((a, i) => {
      const level: AlerteFinance["level"] =
        a.priority === "critical"
          ? "critique"
          : a.priority === "high"
            ? "urgent"
            : a.priority === "medium"
              ? "demain"
              : "info";
      result.push({
        id: i + 1,
        level,
        title: a.title.slice(0, 60),
        sub: a.description.slice(0, 80),
        date: new Date(a.proposed_at).toLocaleDateString("fr-FR"),
      });
    });

  return result.slice(0, 5);
}


/* ── Skeleton AgentSyntheseDaf ───────────────────────────────────────── */

function AgentSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] mb-4 sm:mb-6 overflow-hidden">
      <div className="h-[3px]" style={{ background: "var(--grad)" }} />
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--bd-def)] bg-[rgba(27,107,69,.04)]">
        <div
          className="w-8 h-8 rounded-xl animate-pulse"
          style={{ background: "var(--grad)", opacity: 0.4 }}
        />
        <div className="h-4 w-48 bg-[#EEF2F7] rounded animate-pulse" />
      </div>
      <div className="flex items-center justify-center h-32">
        <SpinnerGapIcon size={24} className="animate-spin text-[var(--tx-3)]" />
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function DashboardDafPage() {
  const dispatch = useAppDispatch();
  const params   = useParams();
  const locale   = typeof params?.locale === 'string' ? params.locale : 'fr';

  const {
    agentStatus,
    agentStatusLoading,
    agentStatusError,
    runs,
    runsLoading,
    runsError,
    latestSnapshot,
    latestSnapshotLoading,
    latestSnapshotError,
    snapshots,
    snapshotsLoading,
    snapshotsError,
    proposedActions,
    proposedActionsError,
    decidingId,
    triggering,
    triggerError,
  } = useAppSelector((s) => s.daf);

  const { catalog, catalogLoading } = useAppSelector((s) => s.kpi);

  const [detailAction, setDetailAction] = useState<import('@/types/daf_type').DafProposedAction | null>(null);
  const [detailRun,    setDetailRun]    = useState<import('@/types/daf_type').DafRun | null>(null);

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
    dispatch(fetchAgentStatus());
    dispatch(fetchRuns(15));
    dispatch(fetchLatestSnapshot());
    dispatch(fetchSnapshots(6));
    dispatch(fetchProposedActions({ status: "pending", limit: 20 }));
    if (catalog.length === 0) dispatch(fetchKpiCatalog());
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (agentStatusError) showToast(agentStatusError);
    if (runsError) showToast(runsError);
    if (latestSnapshotError) showToast(latestSnapshotError);
    if (snapshotsError) showToast(snapshotsError);
    if (proposedActionsError) showToast(proposedActionsError);
    if (triggerError) showToast(triggerError);
  }, [
    agentStatusError,
    runsError,
    latestSnapshotError,
    snapshotsError,
    proposedActionsError,
    triggerError,
  ]);

  function handleTrigger() {
    if (triggering) return;
    dispatch(triggerAgent()).then((result) => {
      if (!result.type.endsWith("/rejected")) {
        showToast("Agent DAF déclenché avec succès", "success");
        setTimeout(() => {
          dispatch(fetchRuns(10));
          dispatch(fetchAgentStatus());
        }, 1500);
      }
    });
  }

  function handleRefresh() {
    dispatch(fetchAgentStatus());
    dispatch(fetchRuns(10));
    dispatch(fetchLatestSnapshot());
    dispatch(fetchSnapshots(6));
    dispatch(fetchProposedActions({ status: "pending", limit: 20 }));
  }

  /* Données dérivées */
  const snap   = latestSnapshot;
  const kpis   = snap ? snapshotToKpis(snap) : KPI_MOCK;
  const alertes = buildAlertes(proposedActions, snap);

  const taskCount = runs.reduce((s, r) => s + r.proposed_actions_count, 0);
  const validCount = proposedActions.filter(
    (a) => a.status !== "pending",
  ).length;

  const treoData = [...snapshots]
    .sort(
      (a, b) =>
        new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime(),
    )
    .map((s) => ({
      mois: FR_MONTHS_SHORT[new Date(s.snapshot_at).getMonth()],
      solde: +(s.cash_position / 1_000_000).toFixed(2),
    }));

  const isLoading = runsLoading || agentStatusLoading;

  const dafAgentKpis = catalog
    .filter((k) => k.category === 'Agent DAF')
    .map(transformDayKpi)
    .map(swapCritiqueBasse);

  const prioriteKpi = dafAgentKpis.find((k) => k.key === 'daf_actions_priorite');
  const otherKpis   = dafAgentKpis.filter((k) => k.key !== 'daf_actions_priorite');

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <FinSectionHeader
        title="Dashboard DAF"
        secondaryAction={{
          label: "Actualiser",
          icon: (
            <ArrowClockwiseIcon
              size={13}
              className={isLoading ? "animate-spin" : ""}
            />
          ),
          onClick: handleRefresh,
        }}
        // actionLabel={triggering ? "Déclenchement…" : "Déclencher Agent"}
        onAction={handleTrigger}
        onCompanyChange={handleRefresh}
      />

      {/* KPI row */}
      {latestSnapshotLoading && !snap ? (
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
      ) : (
        <FinKpiRow kpis={kpis} />
      )}

      {/* Agent Synthèse — monté seulement quand les runs sont disponibles */}
      {runsLoading && runs.length === 0 ? (
        <AgentSkeleton />
      ) : (
        <AgentSyntheseDaf
          label="Agent Synthèse DAF"
          rule="L&apos;IA a généré ces éléments — validation requise avant action (R-DAF)"
          proposedActions={[...proposedActions].sort((a, b) => new Date(b.proposed_at).getTime() - new Date(a.proposed_at).getTime()).slice(0, 3)}
          agentStatus={agentStatus}
          decidingId={decidingId}
          onApprove={(id) => dispatch(approveAction({ actionId: id }))}
          onReject={(id)  => dispatch(rejectAction({ actionId: id }))}
          onViewAction={(a) => setDetailAction(a)}
          taskCount={taskCount}
          validCount={validCount}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* KPIs Agent DAF (catalogue) */}
          {catalogLoading && dafAgentKpis.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <KpiChartCardSkeleton key={i} />)}
            </div>
          ) : dafAgentKpis.length > 0 ? (
            <>
              {otherKpis[0] && <KpiChartCard kpi={otherKpis[0]} featured />}
              {otherKpis.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {otherKpis.slice(1).map((kpi) => (
                    <KpiChartCard key={kpi.key} kpi={kpi} />
                  ))}
                </div>
              )}
              {prioriteKpi && <KpiChartCard kpi={prioriteKpi} featured />}
            </>
          ) : null}
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <AlertesFin
            alertes={alertes.length > 0 ? alertes : ALERTES_FALLBACK}
          />
          <CreancesTop
            runs={runs}
            locale={locale}
            onViewRun={(r) => setDetailRun(r)}
          />
        </div>
      </div>

      <ActionDetailDrawer
        action={detailAction}
        onClose={() => setDetailAction(null)}
        onApprove={(id) => dispatch(approveAction({ actionId: id }))}
        onReject={(id)  => dispatch(rejectAction({ actionId: id }))}
        decidingId={decidingId}
      />
      <RunDetailDrawer
        run={detailRun}
        onClose={() => setDetailRun(null)}
        locale={locale}
      />

      <FloatingToast
        message={toast?.msg ?? null}
        type={toast?.type ?? "error"}
      />
    </div>
  );
}
