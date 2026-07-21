"use client";

import { useState, useEffect } from "react";
import {
  ArrowRightIcon,
  TruckIcon,
  UserIcon,
  TrendUpIcon,
  CheckIcon,
  PencilSimpleIcon,
  XIcon,
  ArrowUpRightIcon,
  WarningIcon,
  TrendDownIcon,
} from "@phosphor-icons/react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchKpiCatalog } from "@/redux/features/kpi/kpiSlice";
import { fetchProspects, createProspect } from "@/redux/features/prospects/prospectsSlice";
import { fetchOffers } from "@/redux/features/offers/offersSlice";
import type { UpdateProspectBody } from "@/types/prospect_type";
import {
  KpiChartCard,
  KpiChartCardSkeleton,
} from "@/components/kpi/kpi-chart-card";
import type { KpiItem } from "@/types/kpi_type";
import { useRouter, useParams } from "next/navigation";

function fmtM(v: number): string {
  if (!v) return "–";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}Md`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}k`;
  return v.toLocaleString("fr-FR");
}

/* ── Mock data ───────────────────────────────────────────────────────── */

const VALIDATION_ITEMS = [
  {
    id: 1,
    model: "sonnet" as const,
    type: "COMPTE-RENDU VOCAL",
    title: "Réunion découverte · Sonatrans SA",
    desc: "Réunion du 29 mai 2026 avec M. Ibrahima Traoré (DSI). Besoins confirmés : transport frigorifique, 40T/mois DKR→ABJ. Budget estimé : 18M FCFA/mois.",
    meta: "Généré il y a 12 min · dictée Sophie Lefèvre 3m42s · Sonnet 4.5",
  },
  {
    id: 2,
    model: "haiku" as const,
    type: "OFFRE COMMERCIALE",
    title: "Proposition Globex Abidjan · 48 000 000 FCFA",
    desc: "Offre transport multimodal 6 mois — 12 missions/mois DKR↔ABJ, camions 40T frigorifiques. Tarif préférentiel volume. Validité 30 jours.",
    meta: "Généré il y a 28 min · brief Moussa Koné · Haiku 4.5",
  },
  {
    id: 3,
    model: "haiku" as const,
    type: "FICHE PROSPECT · 7 CHAMPS EXTRAITS",
    title: "MTN Côte d'Ivoire · Awa Coulibaly, DG Adjoint",
    desc: "Extraction carte de visite. Entreprise, contact, rôle, email, téléphone, ville (Abidjan), secteur (Télécoms) pré-remplis. Vérifiez avant d'enregistrer.",
    meta: "Généré il y a 1h · photo Oumar Ba · Haiku 4.5",
  },
];

const AGENTS = [
  {
    id: 1,
    name: "Agent Extraction",
    model: "Haiku 4.5",
    desc: "Extraction carte de visite · Bolloré Ports CI",
    progress: 62,
    timeLeft: "~4s restantes",
    running: true,
  },
  {
    id: 2,
    name: "Agent CR Vocal",
    model: "Sonnet 4.5",
    desc: "Disponible · dernier CR il y a 12 min",
    progress: null,
    timeLeft: null,
    running: false,
  },
];


const ALERTS = [
  {
    id: 1,
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.08)",
    type: "success" as const,
    text: "MIS-2026-0140 livré · SITARAIL",
    sub: "SITARAIL · Confirmé à Douala · 13h47",
  },
  {
    id: 2,
    color: "#F59E0B",
    bgColor: "rgba(245,158,11,0.08)",
    type: "warning" as const,
    text: "Retard · MIS-2026-0142 · ETA +48h",
    sub: "Blocage douanier Abidjan · ETA +48h",
  },
  {
    id: 3,
    color: "#0E86E8",
    bgColor: "rgba(27,107,69,0.08)",
    type: "info" as const,
    text: "IA · 3 éléments à valider",
    sub: "2 CR + 1 offre · règle R-05",
  },
];


const ACTIVITY = [
  {
    id: 1,
    avatar: null,
    name: "IA",
    tag: "IA",
    text: "CR vocal généré · Sonatrans SA",
    time: "09h14",
  },
  {
    id: 2,
    avatar: "HK",
    name: "Hawa Konaté",
    tag: "Validé",
    text: "Offre SITARAIL 32M · approuvée",
    time: "08h51",
  },
  {
    id: 3,
    avatar: null,
    name: "Claude Haiku 4.5",
    tag: "IA",
    text: "Fiche extraite · MTN CI · 7 champs",
    time: "08h33",
  },
  {
    id: 4,
    avatar: "MK",
    name: "Moussa Koné",
    tag: "Humain",
    text: "Prospect qualifié · Globex Abidjan",
    time: "Hier",
  },
];


/* ── Shared helpers ──────────────────────────────────────────────────── */

function ModelBadge({ model }: { model: "sonnet" | "haiku" }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        model === "sonnet"
          ? "bg-[var(--a100)] text-[var(--a600)]"
          : "bg-[var(--p100)] text-[var(--p600)]",
      )}
    >
      {model === "sonnet" ? "Claude Sonnet" : "Claude Haiku"}
    </span>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── Sections ────────────────────────────────────────────────────────── */

const ENTITIES = [
  { key: "all", label: "Toutes", flag: null },
  { key: "sn", label: "Sénégal", flag: "sn" },
  { key: "ci", label: "Côte d'Ivoire", flag: "ci" },
] as const;

type EntityKey = (typeof ENTITIES)[number]["key"];

function PageHeader() {
  const [entity, setEntity] = useState<EntityKey>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { creating, createError } = useAppSelector((s) => s.prospects);

  async function handleSave(body: UpdateProspectBody) {
    const res = await dispatch(createProspect(body));
    if (createProspect.fulfilled.match(res)) {
      setModalOpen(false);
      dispatch(fetchProspects({ limit: 200 }));
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-xl sm:text-2xl text-[var(--tx-1)]">
            Tableau de bord
          </h1>
          {/* <p className="text-xs sm:text-sm text-[var(--tx-3)] mt-0.5">Vue DG</p> */}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-white border border-[var(--bd-def)] rounded-lg p-0.5 shadow-[var(--sh-xs)]">
            {ENTITIES.map(({ key, label, flag }) => (
              <button
                key={key}
                onClick={() => setEntity(key)}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors",
                  entity === key
                    ? "bg-[var(--p500)] text-white"
                    : "text-[var(--tx-2)] hover:bg-[var(--bg-sink)]",
                )}
              >
                {flag && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <Image
                    src={`https://flagcdn.com/16x12/${flag}.png`}
                    width={16}
                    height={12}
                    alt={label}
                    className="rounded-[2px] flex-shrink-0"
                  />
                )}
                <span className="hidden sm:inline">{label}</span>
                {!flag && <span className="sm:hidden">Toutes</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function IACenter() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] mb-4 sm:mb-6 overflow-hidden">
      <div className="h-[3px]" style={{ background: "var(--grad)" }} />
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--bd-def)] bg-primary/5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--grad)" }}
          >
            <span className="text-white text-lg sm:text-xl leading-none">
              ✦
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">
              Centre de Validation IA
            </p>
            <p className="text-[11px] sm:text-xs text-[var(--tx-3)] hidden sm:block">
              Claude a généré ces éléments — validation requise avant envoi
              client (R-05)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-white px-2 sm:px-2.5 py-1 rounded-full"
            style={{ background: "var(--grad)" }}
          >
            <span className="text-[10px] sm:text-[11px] leading-none">✦</span> 3
          </span>
          <button className="text-xs sm:text-sm font-medium text-[var(--p500)] hover:underline hidden sm:flex items-center gap-1">
            Tout voir <ArrowRightIcon size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] divide-y lg:divide-y-0 lg:divide-x divide-[var(--bd-def)]">
        {/* Validation items */}
        <div className="bg-[var(--bg-sink)]">
          <p className="px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3 text-[9px] sm:text-[10px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase">
            En attente de votre validation
          </p>
          <div className="divide-y divide-[var(--bd-def)] border-t border-[var(--bd-def)] bg-white">
            {VALIDATION_ITEMS.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-3.5"
              >
                <div className="flex items-center justify-between sm:block sm:flex-shrink-0 sm:w-[120px]">
                  <ModelBadge model={item.model} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--tx-3)] uppercase tracking-wide mb-0.5">
                    {item.type}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-[var(--tx-1)] mb-0.5">
                    {item.title}
                  </p>
                  <p className="text-[11px] sm:text-xs text-[var(--tx-2)] line-clamp-2 mb-1">
                    {item.desc}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-[var(--tx-3)] truncate">
                    {item.meta}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto sm:ml-0">
                  <Button
                    variant="success"
                    size="xs"
                    className="text-[10px] sm:text-xs"
                  >
                    <CheckIcon size={12} weight="bold" />
                    <span className="hidden sm:inline ml-1">Valider</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-[10px] sm:text-xs"
                  >
                    <PencilSimpleIcon size={12} />
                    <span className="hidden sm:inline ml-1">Modifier</span>
                  </Button>
                  <Button variant="ghost" size="xs" iconOnly>
                    <XIcon size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active agents */}
        <div className="p-4 sm:p-5 bg-[var(--bg-sink)]">
          <p className="text-[9px] sm:text-[10px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase mb-2 sm:mb-3">
            Agents actifs
          </p>
          <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="p-2.5 sm:p-3 rounded-xl bg-white border border-[var(--bd-def)]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      agent.running
                        ? "bg-[var(--p500)] animate-pulse"
                        : "bg-[var(--ok500)]",
                    )}
                  />
                  <p className="text-xs sm:text-[13px] font-semibold text-[var(--tx-1)] flex-1 truncate">
                    {agent.name}
                  </p>
                  <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 bg-neutral-100 text-neutral-500">
                    {agent.model}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-[11px] sm:text-xs mb-2",
                    agent.running ? "text-[var(--tx-3)]" : "text-success",
                  )}
                >
                  {agent.desc}
                </p>
                {agent.progress !== null && (
                  <div className="flex items-center gap-2">
                    <Progress
                      value={agent.progress}
                      size="sm"
                      className="flex-1"
                    />
                    <span className="text-[9px] sm:text-[10px] text-[var(--tx-3)] whitespace-nowrap">
                      {agent.timeLeft}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-[var(--bd-def)]">
              <p className="font-display font-bold text-xl sm:text-2xl text-primary-700">
                14
              </p>
              <p className="text-[8px] sm:text-[9px] text-[var(--tx-3)]">
                Tâches IA aujourd&apos;hui
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-[var(--bd-def)]">
              <p className="font-display font-bold text-xl sm:text-2xl text-success">
                11
              </p>
              <p className="text-[8px] sm:text-[9px] text-[var(--tx-3)]">
                Validées par équipe
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiRow() {
  const prospects = useAppSelector((s) => s.prospects);
  const offers    = useAppSelector((s) => s.offers);

  const pipelineValue  = prospects.totalPipelineValue ?? 0;
  const totalProspects = prospects.total ?? 0;
  const offersTotal    = offers.list?.length ?? 0;
  const converted      = prospects.byStatus?.converti ?? 0;
  const convRate       = totalProspects > 0 ? Math.round((converted / totalProspects) * 100) : 0;

  // Max pipeline stage count for the progress bar (relative to largest stage)
  const maxStage = Math.max(
    prospects.byStatus?.nouveau   ?? 0,
    prospects.byStatus?.contacte  ?? 0,
    prospects.byStatus?.qualifie  ?? 0,
    prospects.byStatus?.converti  ?? 0,
    1,
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      <KpiCard
        label="Pipeline commercial · valeur totale"
        value={fmtM(pipelineValue)}
        styleValue="text-gradient"
        icon={<ArrowRightIcon size={17} />}
        trend={pipelineValue > 0 ? "up" : undefined}
        trendValue={prospects.loading ? "…" : `${totalProspects} prospects`}
        accent="primary"
        sparkline={<Progress value={converted} max={Math.max(totalProspects, 1)} size="sm" shimmer={prospects.loading} />}
      />
      <KpiCard
        label="Offres transport générées"
        value={prospects.loading || offers.loading ? "…" : String(offersTotal)}
        icon={<TruckIcon size={17} />}
        trend={offersTotal > 0 ? "up" : undefined}
        trendValue={offers.list?.filter(o => o.status === "confirmed").length
          ? `${offers.list.filter(o => o.status === "confirmed").length} confirmées`
          : undefined}
        accent="primary"
      />
      <KpiCard
        label="Prospects dans le pipeline"
        value={prospects.loading ? "…" : String(totalProspects)}
        icon={<UserIcon size={17} />}
        trend={totalProspects > 0 ? "up" : undefined}
        trendValue={prospects.byStatus?.nouveau ? `+${prospects.byStatus.nouveau} nouveaux` : undefined}
        accent="primary"
      />
      <KpiCard
        label="Taux de conversion"
        value={prospects.loading ? "…" : `${convRate}%`}
        icon={<TrendUpIcon size={17} />}
        trend={convRate > 0 ? "up" : undefined}
        trendValue={converted > 0 ? `${converted} convertis` : undefined}
        accent="primary"
        sparkline={
          <Progress
            value={convRate}
            max={100}
            size="sm"
            color={convRate >= 30 ? "success" : "warning"}
            shimmer={prospects.loading}
          />
        }
      />
    </div>
  );
}

// ── Trend badge CA ────────────────────────────────────────────────────────────

function findRevenueKpi(items: KpiItem[]): KpiItem | undefined {
  return items.find((k) =>
    /\b(ca|chiffre[_\s]?affaire|revenue|ca_mensuel|turnover)\b/i.test(
      k.key + " " + k.label,
    ),
  );
}

function RevenueTrendBadge({ kpi }: { kpi: KpiItem }) {
  const s = kpi.chart.series[0];
  if (!s?.yKey) return null;
  const data = kpi.chart.data;
  if (data.length < 2) return null;
  const curr = Number(data[data.length - 1][s.yKey]);
  const prev = Number(data[data.length - 2][s.yKey]);
  if (!prev || isNaN(curr) || isNaN(prev)) return null;
  const label = s.xKey ? String(data[data.length - 2][s.xKey]) : "";
  const delta = curr - prev;
  const pct = Math.abs((delta / prev) * 100).toFixed(1);
  const isUp = delta >= 0;
  const Icon = isUp ? TrendUpIcon : TrendDownIcon;

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        background: isUp ? "#ECFDF5" : "#FEF2F2",
        color: isUp ? "#0E86E8" : "#DC2626",
      }}
    >
      <Icon size={11} weight="bold" />
      {isUp ? "+" : "-"}
      {pct}%{label ? ` vs ${label}` : ""}
    </span>
  );
}

// ── ChartsSection : CA en vedette + autres indicateurs ───────────────────────

function isFinancialKpi(kpi: KpiItem): boolean {
  return /financ|comptab|tresor|budget|recette|depense|marge|benefice|montant|chiffre|revenue|ca_/i.test(
    kpi.category + " " + kpi.key + " " + kpi.label,
  );
}

const DAF_CATEGORIES = new Set(['Agent DAF', 'Finance DAF']);

function ChartsSection() {
  const { displayed, catalogLoading } = useAppSelector((s) => s.kpi);
  const nonDaf          = displayed.filter((k) => !DAF_CATEGORIES.has(k.category));
  const revenueKpi      = findRevenueKpi(nonDaf);
  const otherKpis       = nonDaf.filter((k) => k.key !== revenueKpi?.key);
  const financialOthers = otherKpis.filter(isFinancialKpi);
  const otherIndicators = otherKpis.filter((k) => !isFinancialKpi(k));
  const hasFinancial    = financialOthers.length > 0;
  const hasOthers       = otherIndicators.length > 0;

  if (!catalogLoading && nonDaf.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* ── Graphique CA en vedette ─────────────────────────────────────── */}
      {catalogLoading ? (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-40 bg-[#EEF2F7] rounded animate-pulse" />
            <div className="h-5 w-20 bg-[#EEF2F7] rounded-full animate-pulse" />
          </div>
          <div className="h-[260px] bg-[#F7F9FC] rounded-xl animate-pulse" />
        </Card>
      ) : revenueKpi ? (
        <KpiChartCard kpi={revenueKpi} featured />
      ) : null}

      {/* ── Autres graphiques financiers en colonne ──────────────────────── */}
      {(catalogLoading || hasFinancial) && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-xs font-semibold text-[var(--tx-3)] uppercase tracking-wider">
              Indicateurs financiers
            </p>
            {!catalogLoading && (
              <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] px-2 py-0.5 rounded-full border border-[var(--bd-def)]">
                {financialOthers.length} graphique{financialOthers.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {catalogLoading
              ? [1, 2].map((i) => <KpiChartCardSkeleton key={i} />)
              : financialOthers.map((kpi) => <KpiChartCard key={kpi.key} kpi={kpi} />)}
          </div>
        </Card>
      )}

      {/* ── Autres indicateurs en grille 2 colonnes ─────────────────────── */}
      {(catalogLoading || hasOthers) && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-xs font-semibold text-[var(--tx-3)] uppercase tracking-wider">
              Autres indicateurs
            </p>
            {!catalogLoading && (
              <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] px-2 py-0.5 rounded-full border border-[var(--bd-def)]">
                {otherIndicators.length} graphique{otherIndicators.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catalogLoading
              ? [1, 2, 3, 4].map((i) => <KpiChartCardSkeleton key={i} />)
              : otherIndicators.map((kpi) => <KpiChartCard key={kpi.key} kpi={kpi} />)}
          </div>
        </Card>
      )}
    </div>
  );
}

const OFFER_STATUS_MAP: Record<string, { label: string; color: "primary" | "warning" | "success" | "error" | "neutral"; dot: string }> = {
  generated:  { label: "Générée",   color: "primary",  dot: "bg-[var(--p500)]" },
  validated:  { label: "Validée",   color: "warning",  dot: "bg-[var(--warn500)]" },
  confirmed:  { label: "Confirmée", color: "success",  dot: "bg-[var(--ok500)]" },
  cancelled:  { label: "Annulée",   color: "error",    dot: "bg-red-400" },
  canceled:   { label: "Annulée",   color: "error",    dot: "bg-red-400" },
};

function RecentMissions() {
  const { list, loading } = useAppSelector((s) => s.offers);
  const recent = [...(list ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === "string" ? params.locale : String(params.locale ?? "fr");

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">
          Transports récents
        </p>
        <button onClick={() => router.push(`/${locale}/page/offres`)} className="text-xs sm:text-sm font-medium text-[var(--p500)] hover:underline flex items-center gap-1">
          Voir tout <ArrowUpRightIcon size={13} />
        </button>
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-2 h-2 rounded-full bg-[#EEF2F7] animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-20 bg-[#EEF2F7] rounded animate-pulse" />
                <div className="h-3 w-36 bg-[#EEF2F7] rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-[#EEF2F7] rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && recent.length === 0 && (
        <p className="text-[12px] text-[var(--tx-3)] py-4 text-center">Aucune offre chargée</p>
      )}

      {!loading && recent.length > 0 && (
        <div className="flex flex-col">
          {recent.map((o) => {
            const s = OFFER_STATUS_MAP[o.status] ?? { label: o.status, color: "neutral" as const, dot: "text-[var(--tx-3)]" };
            return (
              <div
                key={o.id}
                className="flex items-center gap-2 sm:gap-3 py-2 sm:py-2.5 border-b border-[var(--bd-def)] last:border-0"
              >
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0 inline-block", s.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--tx-3)]">
                    {o.reference ?? o.odoo_shipment_name ?? o.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-[var(--tx-1)] truncate">
                    {o.title ?? o.odoo_shipment_name ?? "Offre transport"}
                  </p>
                </div>
                <Badge color={s.color} variant="subtle" className="text-[10px] sm:text-xs flex-shrink-0">
                  {s.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ActiveAlerts() {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">
          Alertes actives
        </p>
        <Badge
          color="error"
          variant="subtle"
          className="text-[10px] sm:text-xs"
        >
          3
        </Badge>
      </div>
      <div className="flex flex-col gap-2">
        {ALERTS.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border-l-[3px]"
            style={{ borderLeftColor: a.color, backgroundColor: a.bgColor }}
          >
            <div className="flex-shrink-0 mt-0.5">
              {a.type === "success" && (
                <CheckIcon size={14} weight="bold" style={{ color: a.color }} />
              )}
              {a.type === "warning" && (
                <WarningIcon size={14} weight="fill" style={{ color: a.color }} />
              )}
              {a.type === "info" && (
                <span
                  className="text-lg sm:text-xl leading-none"
                  style={{ color: a.color }}
                >
                  ✦
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[var(--tx-1)]">
                {a.text}
              </p>
              <p className="text-[11px] sm:text-xs text-[var(--tx-3)] mt-0.5">
                {a.sub}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const PIPELINE_STAGES = [
  { key: "nouveau", label: "Nouveau", color: "primary" as const },
  { key: "contacte", label: "Contacté", color: "accent" as const },
  { key: "qualifie", label: "Qualifié", color: "secondary" as const },
  { key: "converti", label: "Converti", color: "success" as const },
] as const;

function CommercialPipeline() {
  const { byStatus, totalPipelineValue, loading } = useAppSelector(
    (s) => s.prospects,
  );
  const counts = PIPELINE_STAGES.map((s) => ({
    ...s,
    value: byStatus?.[s.key] ?? 0,
  }));
  const MAX = Math.max(...counts.map((s) => s.value), 1);

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">
          Pipeline commercial
        </p>
        <button className="text-xs sm:text-sm font-medium text-[var(--p500)] hover:underline flex items-center gap-1">
          Détail <ArrowRightIcon size={13} />
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:gap-3">
        {counts.map((stage) => (
          <div key={stage.key} className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-[var(--tx-2)] w-16 sm:w-20 flex-shrink-0">
              {stage.label}
            </span>
            <Progress
              value={stage.value}
              max={MAX}
              size="sm"
              color={stage.color}
              shimmer={loading}
              className="flex-1"
            />
            <span className="text-xs sm:text-sm font-semibold text-[var(--tx-1)] w-6 text-right flex-shrink-0">
              {loading ? "–" : stage.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[var(--bd-def)] flex items-center justify-between">
        <p className="text-xs sm:text-sm text-[var(--tx-3)]">Valeur totale</p>
        <p className="font-display font-bold text-sm sm:text-base text-primary-700">
          {loading ? "…" : `${fmtM(totalPipelineValue ?? 0)} FCFA`}
        </p>
      </div>
    </Card>
  );
}

function ActivityFeed() {
  const tagColor: Record<string, "accent" | "success" | "neutral" | "white"> = {
    IA: "white",
    Validé: "success",
    Humain: "neutral",
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">
          Activité · IA + Équipe
        </p>
        <p className="text-[10px] sm:text-[11px] text-[var(--tx-3)] flex-shrink-0">
          Aujourd&apos;hui
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:gap-3">
        {ACTIVITY.map((a, idx) => (
          <div
            key={a.id}
            className={cn(
              "flex items-start gap-2 sm:gap-2.5 pt-3 sm:pt-4",
              idx !== 0 && "border-t border-[var(--bd-def)]",
            )}
          >
            {a.avatar ? (
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--grad)" }}
              >
                <span className="text-white text-[9px] sm:text-[10px] font-bold">
                  {a.avatar}
                </span>
              </div>
            ) : (
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--grad)" }}
              >
                <span className="leading-none text-white text-sm">✦</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 flex-wrap">
                <span className="text-xs sm:text-[13px] font-medium text-[var(--tx-1)]">
                  {a.name}
                </span>
                <Badge
                  color={tagColor[a.tag] ?? "neutral"}
                  variant="subtle"
                  className={cn(
                    "text-[8px] sm:text-[9px] !px-1 !py-0.5 rounded-sm",
                    a.tag === "IA" && "text-white",
                    a.tag === "Validé" && "border border-success",
                    a.tag === "Humain" && "border border-neutral-300",
                  )}
                  style={
                    a.tag === "IA" ? { background: "var(--grad)" } : undefined
                  }
                >
                  {a.tag}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--tx-2)] truncate">
                {a.text}
              </p>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--tx-3)] flex-shrink-0 mt-0.5">
              {a.time}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Skeleton global ─────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px] animate-pulse">
      {/* KpiRow skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-4 sm:p-5 h-[90px]">
            <div className="h-3 w-24 bg-[#EEF2F7] rounded mb-3" />
            <div className="h-7 w-16 bg-[#EEF2F7] rounded" />
          </div>
        ))}
      </div>
      {/* Main grid skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3 sm:gap-4">
        {/* Left: charts */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-4 w-36 bg-[#EEF2F7] rounded" />
              <div className="h-4 w-16 bg-[#EEF2F7] rounded-full" />
            </div>
            <div className="h-[260px] bg-[#F7F9FC] rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-5">
            <div className="h-3 w-28 bg-[#EEF2F7] rounded mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-[#DDE5EF] h-[240px] bg-[#F7F9FC]" />
              ))}
            </div>
          </div>
        </div>
        {/* Right: pipeline + missions */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-4 sm:p-5">
            <div className="h-4 w-32 bg-[#EEF2F7] rounded mb-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className="h-3 w-16 bg-[#EEF2F7] rounded" />
                <div className="flex-1 h-2 bg-[#EEF2F7] rounded-full" />
                <div className="h-3 w-4 bg-[#EEF2F7] rounded" />
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-[var(--bd-def)] flex justify-between">
              <div className="h-3 w-20 bg-[#EEF2F7] rounded" />
              <div className="h-4 w-24 bg-[#EEF2F7] rounded" />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-4 sm:p-5">
            <div className="h-4 w-28 bg-[#EEF2F7] rounded mb-4" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[var(--bd-def)] last:border-0">
                <div className="w-2 h-2 rounded-full bg-[#EEF2F7] flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-2.5 w-20 bg-[#EEF2F7] rounded mb-1.5" />
                  <div className="h-3 w-32 bg-[#EEF2F7] rounded" />
                </div>
                <div className="h-5 w-16 bg-[#EEF2F7] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const dispatch = useAppDispatch();

  const { catalog, catalogLoading }  = useAppSelector((s) => s.kpi);
  const { total: prospectsTotal, loading: prospectsLoading } = useAppSelector((s) => s.prospects);
  const { list: offersList, loading: offersLoading }         = useAppSelector((s) => s.offers);

  // Chaque source est "prête" quand elle a fini de charger OU qu'elle a déjà des données
  const kpiReady       = !catalogLoading  || catalog.length > 0;
  const prospectsReady = !prospectsLoading || prospectsTotal > 0;
  const offersReady    = !offersLoading    || (offersList?.length ?? 0) > 0;
  const isFirstLoad    = !kpiReady || !prospectsReady || !offersReady;

  useEffect(() => {
    if (catalog.length === 0)  dispatch(fetchKpiCatalog());
    if (!prospectsTotal)       dispatch(fetchProspects({ limit: 200 }));
    if (!offersList?.length)   dispatch(fetchOffers());
  }, [dispatch, catalog.length, prospectsTotal, offersList?.length]);

  if (isFirstLoad) return <DashboardSkeleton />;

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <PageHeader />
      {/* <IACenter /> */}
      <KpiRow />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3 sm:gap-4 mb-4 sm:mb-6">
        <ChartsSection />
        <div className="flex flex-col gap-4">
          <CommercialPipeline />
          <RecentMissions />
        </div>
      </div>
    </div>
  );
}
