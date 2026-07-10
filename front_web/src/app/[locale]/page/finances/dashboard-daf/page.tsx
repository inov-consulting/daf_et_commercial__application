'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchAgentStatus, triggerAgent,
  fetchRuns, fetchLatestSnapshot, fetchSnapshots, fetchProposedActions,
} from '@/redux/features/daf/dafSlice';
import { FinSectionHeader } from '@/components/finance/fin-section-header';
import { FinKpiRow } from '@/components/finance/fin-kpi-row';
import { AgentSyntheseDaf } from '@/components/finance/agent-synthese-daf';
import { AlertesFin } from '@/components/finance/alertes-fin';
import { CreancesTop } from '@/components/finance/creances-top';
import { FinBarChart, FinLineChart } from '@/components/finance/fin-chart';
import { FloatingToast } from '@/components/ui/toast';
import { SpinnerGapIcon, ArrowClockwiseIcon } from '@phosphor-icons/react';
import type { FinKpi, AgentSyntheseItem, AgentActif, AlerteFinance, CreanceClient } from '@/types/finance_type';
import type { DafRun, DafAgentStatus, DafProposedAction, DafSnapshot } from '@/types/daf_type';

/* ── Mock fixe : CA (pas de route API) ──────────────────────────────── */

const CA_DATA = [
  { mois: 'Jan', precedent: 60, valeur: 39 },
  { mois: 'Fév', precedent: 60, valeur: 43 },
  { mois: 'Mar', precedent: 60, valeur: 43 },
  { mois: 'Avr', precedent: 60, valeur: 48 },
  { mois: 'Mai', precedent: 60, valeur: 51 },
  { mois: 'Jun', precedent: 60, valeur: 68 },
];

const KPI_MOCK: FinKpi[] = [
  { label: "Chiffre d'affaires · Juin", value: '127,4M FCFA', sub: 'vs 113,9M en mai',                trend: 'up',      trendVal: '+18%',      accent: 'success' },
  { label: 'Trésorerie nette',           value: '—',           sub: 'Chargement…',                    trend: 'neutral', trendVal: '…',         accent: 'primary' },
  { label: 'DSO moyen',                  value: '—',           sub: 'Objectif 45j',                   trend: 'neutral', trendVal: '…',         accent: 'warning' },
  { label: 'Créances en retard',         value: '—',           sub: 'Chargement…',                    trend: 'neutral', trendVal: '…',         accent: 'error'   },
];

const ALERTES_FALLBACK: AlerteFinance[] = [
  { id: 1, level: 'info', title: 'Données en cours de chargement', sub: 'Les alertes seront disponibles une fois les données API reçues.', date: '—' },
];

const CREANCES_FALLBACK: CreanceClient[] = [];

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtM(v: number) {
  return `${(v / 1_000_000).toFixed(1)}M FCFA`;
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ── Fonctions de mapping API → props composants ────────────────────── */

function runsToItems(runs: DafRun[]): AgentSyntheseItem[] {
  return runs.slice(0, 3).map((run, idx) => {
    const raw       = run.summary ?? run.error ?? '';
    const firstLine = raw.split('\n').map(l => l.trim()).find(l => l && !/^#{1,3}$/.test(l)) ?? `Run ${run.id.slice(0, 8)}`;
    const cleanTitle = stripMarkdown(firstLine).slice(0, 80);
    const cleanDesc  = stripMarkdown(raw).slice(0, 200);
    return {
      id:    idx + 1,
      model: 'sonnet' as const,
      type:  `${run.trigger.replace(/_/g, ' ').toUpperCase()} · ${run.status.toUpperCase()}`,
      title: cleanTitle || `Run ${run.id.slice(0, 8)}`,
      desc:  cleanDesc  || (run.status === 'failed' ? (run.error ?? 'Échec sans message') : 'Aucun résumé disponible.'),
      meta:  `${fmtDateShort(run.started_at)} · ${run.proposed_actions_count} actions proposées`,
    };
  });
}

function statusToAgents(status: DafAgentStatus | null): AgentActif[] {
  if (!status) {
    return [{ id: 1, name: 'Agent DAF', model: 'Sonnet 4.5', desc: 'Chargement du statut…', running: false, progress: null, timeLeft: null }];
  }
  const nextRun = status.next_run_at
    ? new Date(status.next_run_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;
  return [
    {
      id:       1,
      name:     'Agent DAF',
      model:    'Sonnet 4.5',
      desc:     status.scheduler_running
        ? nextRun ? `Scheduler actif · Prochain run · ${nextRun}` : 'Scheduler actif'
        : `Scheduler inactif · Dernier statut : ${status.last_run_status ?? '—'}`,
      running:  status.last_run_status === 'running',
      progress: null,
      timeLeft: nextRun ? `Prochain run · ${nextRun}` : null,
    },
  ];
}

function snapshotToKpis(snap: DafSnapshot): FinKpi[] {
  const dsoOver = snap.dso_days - 45;
  return [
    {
      label:    "Chiffre d'affaires · Juin",
      value:    '127,4M FCFA',
      sub:      'vs 113,9M en mai — estimation',
      trend:    'up',
      trendVal: '+18%',
      accent:   'success',
    },
    {
      label:    'Trésorerie nette',
      value:    fmtM(snap.cash_position),
      sub:      `Snapshot · ${snap.period_label}`,
      trend:    snap.cash_position > 0 ? 'up' : 'down',
      trendVal: snap.cash_position > 0 ? 'Positive' : 'Négative',
      accent:   snap.cash_position > 0 ? 'success' : 'error',
    },
    {
      label:    'DSO moyen',
      value:    `${snap.dso_days} jours`,
      sub:      snap.dso_days > 45 ? `Objectif 45j — dépassé de ${dsoOver}j` : 'Objectif 45j — respecté',
      trend:    snap.dso_days > 45 ? 'warning' : 'up',
      trendVal: snap.dso_days > 45 ? `+${dsoOver}j` : `-${45 - snap.dso_days}j`,
      accent:   snap.dso_days > 45 ? 'warning' : 'success',
    },
    {
      label:    'Créances en retard',
      value:    fmtM(snap.overdue_receivables),
      sub:      `${snap.overdue_receivables_count} clients · Relances prioritaires`,
      trend:    'down',
      trendVal: `${snap.overdue_receivables_count} clients`,
      accent:   'error',
    },
  ];
}

function buildAlertes(actions: DafProposedAction[], snap: DafSnapshot | null): AlerteFinance[] {
  const result: AlerteFinance[] = [];

  if (snap && snap.dso_days > 45) {
    result.push({
      id:    0,
      level: snap.dso_days > 60 ? 'critique' : 'urgent',
      tag:   'DSO',
      title: `DSO ${snap.dso_days}j · Seuil dépassé`,
      sub:   `Objectif 45j — ${snap.overdue_receivables_count} clients > 60j — ${fmtM(snap.overdue_receivables)} exposés`,
      date:  snap.period_label,
    });
  }

  actions
    .filter(a => a.status === 'pending')
    .slice(0, 4)
    .forEach((a, i) => {
      const level: AlerteFinance['level'] =
        a.priority === 'critical' ? 'critique'
        : a.priority === 'high'   ? 'urgent'
        : a.priority === 'medium' ? 'demain'
        : 'info';
      result.push({
        id:    i + 1,
        level,
        title: a.title.slice(0, 60),
        sub:   a.description.slice(0, 80),
        date:  new Date(a.proposed_at).toLocaleDateString('fr-FR'),
      });
    });

  return result.slice(0, 5);
}

function buildCreances(actions: DafProposedAction[]): CreanceClient[] {
  return actions
    .filter(a => ['send_reminder', 'escalate', 'flag_risk'].includes(a.action_type) && a.status === 'pending')
    .slice(0, 5)
    .map((a, i) => {
      const td      = a.target_data as Record<string, unknown>;
      const montant = Number(td?.amount ?? td?.montant ?? td?.outstanding_amount ?? 0);
      const dso     = Number(td?.dso_days ?? td?.dso ?? 0);
      const name    = String(td?.client_name ?? td?.name ?? a.title);
      const ville   = String(td?.ville ?? td?.city ?? 'Dakar');
      const status: CreanceClient['status'] =
        a.priority === 'critical' ? 'critique' : a.priority === 'high' ? 'a_risque' : 'normal';
      return { id: i + 1, rank: i + 1, name, ville, montant, dso, status };
    });
}

/* ── Skeleton AgentSyntheseDaf ───────────────────────────────────────── */

function AgentSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] mb-4 sm:mb-6 overflow-hidden">
      <div className="h-[3px]" style={{ background: 'var(--grad)' }} />
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--bd-def)] bg-[rgba(27,107,69,.04)]">
        <div className="w-8 h-8 rounded-xl animate-pulse" style={{ background: 'var(--grad)', opacity: 0.4 }} />
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

  const {
    agentStatus,          agentStatusLoading, agentStatusError,
    runs,                 runsLoading,        runsError,
    latestSnapshot,       latestSnapshotLoading, latestSnapshotError,
    snapshots,            snapshotsLoading,   snapshotsError,
    proposedActions,                          proposedActionsError,
    triggering,           triggerError,
  } = useAppSelector(s => s.daf);

  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  function showToast(msg: string, type: 'error' | 'success' | 'info' = 'error') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    dispatch(fetchAgentStatus());
    dispatch(fetchRuns(5));
    dispatch(fetchLatestSnapshot());
    dispatch(fetchSnapshots(6));
    dispatch(fetchProposedActions({ status: 'pending', limit: 20 }));
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [dispatch]);

  useEffect(() => {
    if (agentStatusError)     showToast(agentStatusError);
    if (runsError)            showToast(runsError);
    if (latestSnapshotError)  showToast(latestSnapshotError);
    if (snapshotsError)       showToast(snapshotsError);
    if (proposedActionsError) showToast(proposedActionsError);
    if (triggerError)         showToast(triggerError);
  }, [agentStatusError, runsError, latestSnapshotError, snapshotsError, proposedActionsError, triggerError]);

  function handleTrigger() {
    if (triggering) return;
    dispatch(triggerAgent()).then(result => {
      if (!result.type.endsWith('/rejected')) {
        showToast('Agent DAF déclenché avec succès', 'success');
        setTimeout(() => {
          dispatch(fetchRuns(5));
          dispatch(fetchAgentStatus());
        }, 1500);
      }
    });
  }

  function handleRefresh() {
    dispatch(fetchAgentStatus());
    dispatch(fetchRuns(5));
    dispatch(fetchLatestSnapshot());
    dispatch(fetchSnapshots(6));
    dispatch(fetchProposedActions({ status: 'pending', limit: 20 }));
  }

  /* Données dérivées */
  const snap    = latestSnapshot;
  const kpis    = snap ? snapshotToKpis(snap) : KPI_MOCK;
  const items   = runsToItems(runs);
  const agents  = statusToAgents(agentStatus);
  const alertes = buildAlertes(proposedActions, snap);
  const creances = buildCreances(proposedActions);

  const taskCount  = runs.reduce((s, r) => s + r.proposed_actions_count, 0);
  const validCount = proposedActions.filter(a => a.status !== 'pending').length;

  const treoData = [...snapshots]
    .sort((a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime())
    .map(s => ({ mois: s.period_label, solde: +(s.cash_position / 1_000_000).toFixed(2) }));

  const subtitle = snap
    ? `${snap.period_label} · Groupe INOV Consulting · Consolidé Sénégal + Côte d'Ivoire`
    : "Groupe INOV Consulting · Consolidé Sénégal + Côte d'Ivoire";

  const isLoading = runsLoading || agentStatusLoading;

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <FinSectionHeader
        title="Dashboard DAF"
        subtitle={subtitle}
        secondaryAction={{
          label:   'Actualiser',
          icon:    <ArrowClockwiseIcon size={13} className={isLoading ? 'animate-spin' : ''} />,
          onClick: handleRefresh,
        }}
        actionLabel={triggering ? 'Déclenchement…' : 'Déclencher Agent'}
        onAction={handleTrigger}
      />

      {/* Agent Synthèse — monté seulement quand les runs sont disponibles */}
      {runsLoading && runs.length === 0 ? (
        <AgentSkeleton />
      ) : (
        <AgentSyntheseDaf
          label="Agent Synthèse DAF"
          rule="Claude a généré ces éléments — validation requise avant action (R-DAF)"
          items={items}
          agents={agents}
          taskCount={taskCount}
          validCount={validCount}
        />
      )}

      {/* KPI row */}
      {latestSnapshotLoading && !snap ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 sm:p-5 animate-pulse">
              <div className="h-3 w-24 bg-[#EEF2F7] rounded mb-3" />
              <div className="h-7 w-20 bg-[#EEF2F7] rounded mb-2" />
              <div className="h-2.5 w-32 bg-[#EEF2F7] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <FinKpiRow kpis={kpis} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* CA mensuel (mock — pas de route API revenue) */}
          <FinBarChart
            title="Chiffre d'affaires mensuel"
            subtitle="Jan – Juin 2026 · Millions FCFA · Estimation"
            ytd="279M"
            data={CA_DATA}
            series={[
              { yKey: 'precedent', yName: 'Mois précédents', fill: '#D1FAE5' },
              { yKey: 'valeur',    yName: 'Mois en cours',   fill: '#1E5B3C' },
            ]}
            height={220}
          />

          {/* Trésorerie nette (données réelles depuis snapshots) */}
          {snapshotsLoading && treoData.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 h-[240px] flex items-center justify-center">
              <SpinnerGapIcon size={24} className="animate-spin text-[var(--tx-3)]" />
            </div>
          ) : treoData.length > 0 ? (
            <FinLineChart
              title="Trésorerie nette"
              subtitle="Historique des snapshots · Millions FCFA"
              data={treoData}
              series={[{ yKey: 'solde', yName: 'Solde net', stroke: '#1B6B45', type: 'area' }]}
              height={200}
            />
          ) : null}
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <AlertesFin alertes={alertes.length > 0 ? alertes : ALERTES_FALLBACK} />
          <CreancesTop creances={creances.length > 0 ? creances : CREANCES_FALLBACK} />
        </div>
      </div>

      <FloatingToast message={toast?.msg ?? null} type={toast?.type ?? 'error'} />
    </div>
  );
}
