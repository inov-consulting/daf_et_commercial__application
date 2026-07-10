'use client';

import { FinSectionHeader } from '@/components/finance/fin-section-header';
import { FinKpiRow } from '@/components/finance/fin-kpi-row';
import { AgentSyntheseDaf } from '@/components/finance/agent-synthese-daf';
import { AlertesFin } from '@/components/finance/alertes-fin';
import { CreancesTop } from '@/components/finance/creances-top';
import { FinBarChart, FinLineChart } from '@/components/finance/fin-chart';
import type { FinKpi, AgentSyntheseItem, AgentActif, AlerteFinance, CreanceClient } from '@/types/finance_type';

/* ── Mock data ─────────────────────────────────────────────────── */

const KPI_DATA: FinKpi[] = [
  { label: 'Chiffre d\'affaires · Juin', value: '127,4M FCFA', sub: 'vs 113,9M en mai', trend: 'up',      trendVal: '+18%',          accent: 'success' },
  { label: 'Trésorerie nette',           value: '34,8M FCFA',  sub: 'Flux sortant prévu · 15 juil.',     trend: 'up',      trendVal: '+17%',          accent: 'success' },
  { label: 'DSO moyen',                  value: '57 jours',     sub: 'Objectif 45j — seuil dépassé',      trend: 'warning', trendVal: '+12j',          accent: 'warning' },
  { label: 'Créances > 60 jours',        value: '18,3M FCFA',  sub: '3 clients · Relances prioritaires', trend: 'down',    trendVal: '3 clients',     accent: 'error'   },
];

const AGENT_ITEMS: AgentSyntheseItem[] = [
  { id: 1, model: 'sonnet', type: 'SYNTHÈSE MENSUELLE',          title: 'Rapport Juin 2026 — Performance financière',      desc: 'CA +12% à 127,4M FCFA · Trésorerie saine à 34,8M · DSO dégradé à 57j (objectif 45j) — 3 clients en retard critique représentant 18,3M FCFA.', meta: 'Généré il y a 4h · 06/07/2026 08h00 · Sonnet 4.5' },
  { id: 2, model: 'haiku',  type: 'RELANCE CLIENT AUTOMATIQUE', title: 'Transcont SARL · 14 200 000 FCFA · 68 jours',     desc: 'Email de relance rédigé automatiquement. Ton professionnel. Propose un échelonnement en 2 versements. À valider avant envoi.', meta: 'Généré il y a 25 min · brief DSO · Haiku 4.5' },
  { id: 3, model: 'haiku',  type: 'PRÉVISION TRÉSORERIE · 7 EXTRAITS', title: 'Flux juillet 2026 · Projection automatique', desc: 'Flux sortants estimés : 17,2 M FCFA le 15 juil. (loyers + salaires). Solde projeté fin juillet: +12,4 M FCFA. Vérifier avant diffusion direction.', meta: 'Généré il y a 1h · photo relevé · Haiku 4.5' },
];

const AGENTS: AgentActif[] = [
  { id: 1, name: 'Agent Extraction',   model: 'Haiku 4.5', desc: 'Extraction carte de visite · Bolloré Ports CI',   running: true,  progress: 62, timeLeft: '~4s restantes' },
  { id: 2, name: 'Agent CR Vocal',     model: 'Sonnet 4.5', desc: 'Disponible · dernier CR il y a 12 min',            running: false, progress: null, timeLeft: null },
  { id: 3, name: 'Agent Synthèse DAF', model: 'Sonnet 4.5', desc: 'Prochaine synthèse · 18h00',                       running: false, progress: null, timeLeft: null },
];

const ALERTES: AlerteFinance[] = [
  { id: 1, level: 'critique', tag: 'DSO',    title: 'DSO 57j · Seuil dépassé',                sub: 'Objectif 45j — 3 clients > 60j — 18,3M FCFA exposés', date: 'Depuis 12 heures' },
  { id: 2, level: 'urgent',                  title: 'Retard · Transcont SARL · ETA +38j',     sub: '14 200 000 FCFA · Relance urgente requise',            date: 'Échéance dépassée · 68j' },
  { id: 3, level: 'demain',                  title: 'Facture F-2026-089 · Échéance demain',   sub: '3 450 000 FCFA · SODITRA SA',                          date: '07/07/2026' },
  { id: 4, level: 'info',                    title: 'IA · Rapport mensuel à valider',         sub: 'Synthèse Juin 2026 générée · à soumettre avant le 10 juil.', date: 'Dans 4 jours' },
];

const CREANCES: CreanceClient[] = [
  { id: 1, rank: 1, name: 'Transcont SARL',   ville: 'Dakar', montant: 14_200_000, dso: 68, status: 'critique' },
  { id: 2, rank: 2, name: 'Diallo BTP SARL',  ville: 'Dakar', montant:  8_900_000, dso: 63, status: 'critique' },
  { id: 3, rank: 3, name: 'SODITRA SA',        ville: 'Thiès', montant:  5_200_000, dso: 45, status: 'a_risque' },
  { id: 4, rank: 4, name: 'Ndiaye Logistics',  ville: 'Dakar', montant:  3_100_000, dso: 28, status: 'normal'   },
];

const CA_DATA = [
  { mois: 'Jan', precedent: 60, valeur: 39 },
  { mois: 'Fév', precedent: 60, valeur: 43 },
  { mois: 'Mar', precedent: 60, valeur: 43 },
  { mois: 'Avr', precedent: 60, valeur: 48 },
  { mois: 'Mai', precedent: 60, valeur: 51 },
  { mois: 'Jun', precedent: 60, valeur: 68 },
];

const TRESO_DATA = [
  { mois: 'Jan', solde: 24.4 },
  { mois: 'Fév', solde: 31.2 },
  { mois: 'Mar', solde: 10.4 },
  { mois: 'Avr', solde: 33.4 },
  { mois: 'Mai', solde: 29.7 },
  { mois: 'Jun', solde: 38.6 },
];

/* ── Page ──────────────────────────────────────────────────────── */

export default function DashboardDafPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <FinSectionHeader title="Dashboard DAF" subtitle="Groupe INOV Consulting · Juin 2026 · Consolidé Sénégal + Côte d'Ivoire" />

      <AgentSyntheseDaf
        label="Agent Synthèse DAF"
        rule="Claude a généré ces éléments — validation requise avant action (R-DAF)"
        items={AGENT_ITEMS}
        agents={AGENTS}
        taskCount={14}
        validCount={11}
      />

      <FinKpiRow kpis={KPI_DATA} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 sm:gap-4">
        {/* Graphiques */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <FinBarChart
            title="Chiffre d'affaires mensuel"
            subtitle="Jan – Juin 2026 · Millions FCFA · Sénégal"
            ytd="279M"
            data={CA_DATA}
            series={[
              { yKey: 'precedent', yName: 'Mois précédents', fill: '#D1FAE5' },
              { yKey: 'valeur',    yName: 'Mois en cours',   fill: '#1E5B3C' },
            ]}
            height={220}
          />
          <FinLineChart
            title="Trésorerie nette"
            subtitle="Évolution 6 mois · Millions FCFA"
            data={TRESO_DATA}
            series={[{ yKey: 'solde', yName: 'Solde net', stroke: '#1B6B45', type: 'area' }]}
            height={200}
          />
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <AlertesFin alertes={ALERTES} />
          <CreancesTop creances={CREANCES} />
        </div>
      </div>
    </div>
  );
}
