/* ── Finance domain types ─────────────────────────────────────── */

export type AlerteLevel = 'critique' | 'urgent' | 'demain' | 'info';
export type DsoStatus   = 'critique' | 'a_risque' | 'normal';
export type EntityKey   = 'all' | 'sn' | 'ci';

/* ── Agent Synthèse items ──────────────────────────────────────── */
export interface AgentSyntheseItem {
  id:    number;
  model: 'sonnet' | 'haiku';
  type:  string;
  title: string;
  desc:  string;
  meta:  string;
}

export interface AgentActif {
  id:       number;
  name:     string;
  model:    string;
  desc:     string;
  running:  boolean;
  progress: number | null;
  timeLeft: string | null;
}

/* ── KPI Finance ───────────────────────────────────────────────── */
export interface FinKpi {
  label:     string;
  value:     string;
  sub:       string;
  trend:     'up' | 'down' | 'warning' | 'neutral';
  trendVal:  string;
  accent:    'success' | 'warning' | 'error' | 'primary';
}

/* ── Alertes ───────────────────────────────────────────────────── */
export interface AlerteFinance {
  id:    number;
  level: AlerteLevel;
  tag?:  string;
  title: string;
  sub:   string;
  date?: string;
}

/* ── Créances clients ──────────────────────────────────────────── */
export interface CreanceClient {
  id:     number;
  rank:   number;
  name:   string;
  ville:  string;
  montant: number;
  dso:    number;
  status: DsoStatus;
}

export interface BalanceAgeeItem {
  tranche: string;
  montant: number;
  pct:     number;
}

/* ── Compte bancaire ───────────────────────────────────────────── */
export interface CompteBancaire {
  id:     number;
  banque: string;
  pays:   string;
  ref:    string;
  solde:  number;
  trend:  number;
}

/* ── Échéance ──────────────────────────────────────────────────── */
export interface EcheanceItem {
  id:      number;
  date:    string;
  label:   string;
  sub:     string;
  montant: number;
  status:  'urgent' | 'planifie' | 'confirme' | 'attente';
}

/* ── Facture créance ───────────────────────────────────────────── */
export interface FactureCreance {
  ref:       string;
  objet:     string;
  emission:  string;
  echeance:  string;
  montant:   number;
  age:       number;
  statut:    'retard' | 'a_echoir' | 'regle' | 'partiel';
}

/* ── Rapport financier ─────────────────────────────────────────── */
export interface RapportFin {
  id:     number;
  titre:  string;
  type:   string;
  desc:   string;
  status: 'pret' | 'brouillon' | 'auto';
  date:   string;
}

export interface CompteResultatLigne {
  indicateur: string;
  juin26:     number;
  mai26:      number;
  juin25:     number;
  budget:     number;
  ecartB:     number | null;
  ecartPct:   number | null;
  tendance?:  string;
  isBold?:    boolean;
}
