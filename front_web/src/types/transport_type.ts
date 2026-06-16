// Dossier transport — W-02 → W-07 workflow

export type DossierMode   = 'maritime' | 'routier' | 'multimodal';
export type DossierStatut = 'ouvert' | 'estim' | 'exec' | 'reel' | 'clos';
export type DossierEtape  = 'A' | 'B' | 'C' | 'D' | 'E';
export type DossierEntite = 'SN' | 'CI';
export type DossierAlerte = 'ecart' | 'critique' | null;

export interface DossierTransport {
  id: string;
  reference: string;         // "DOS-2026-0145"
  client_name: string;
  client_meta?: string;      // "DSI · Ibrahima Traoré"
  commercial?: string;
  trajet: string;            // "Dakar → Abidjan"
  origine?: string;
  destination?: string;
  mode: DossierMode;
  etape: DossierEtape;
  statut: DossierStatut;
  entite: DossierEntite;
  ca_estime: number;         // XOF
  marge_est: number | null;  // %
  marge_reel: number | null; // %
  alerte: DossierAlerte;
  incoterm?: string;
  offre_ref?: string;
  created_at: string;        // ISO
}

export interface DossierListResponse {
  items: DossierTransport[];
  total: number;
}

export interface CreateDossierBody {
  offre_ref?: string;
  client_name: string;
  contact_name?: string;
  commercial_id?: number;
  origine: string;
  destination: string;
  mode: DossierMode;
  incoterm?: string;
  volume?: string;
  devise?: string;
  date_depart?: string;
  date_livraison?: string;
  entite: DossierEntite;
  ca_estime?: number;
}

// ── UI config ──────────────────────────────────────────────────────────────

export const MODE_CONFIG: Record<DossierMode, { label: string; bg: string; color: string }> = {
  maritime:   { label: 'Maritime',   bg: '#EBF5FD', color: '#085499' },
  routier:    { label: 'Routier',    bg: '#ECFDF5', color: '#059669' },
  multimodal: { label: 'Multimodal', bg: '#F3EFFE', color: '#5829A8' },
};

export const STATUT_CONFIG: Record<DossierStatut, {
  label: string; dot: string; bg: string; text: string; etape: DossierEtape;
}> = {
  ouvert: { label: 'Ouvert',       dot: '#0E86E8', bg: '#EBF5FD', text: '#085499', etape: 'A' },
  estim:  { label: 'Estimation',   dot: '#6B35C9', bg: '#F3EFFE', text: '#5829A8', etape: 'B' },
  exec:   { label: 'En exécution', dot: '#F59E0B', bg: '#FFFBEB', text: '#D97706', etape: 'C' },
  reel:   { label: 'Coûts réels',  dot: '#C2257A', bg: '#FDF0F7', text: '#A01D65', etape: 'D' },
  clos:   { label: 'Clôturé',      dot: '#10B981', bg: '#ECFDF5', text: '#059669', etape: 'E' },
};

export const DOSSIER_STATUTS = Object.keys(STATUT_CONFIG) as DossierStatut[];

export const ETAPE_LABELS: Record<DossierEtape, string> = {
  A: 'Ouverture',
  B: 'Coûts est.',
  C: 'Exécution',
  D: 'Coûts réels',
  E: 'Clôture',
};

export const DOSSIER_ETAPES: DossierEtape[] = ['A', 'B', 'C', 'D', 'E'];

// ── Detail types ────────────────────────────────────────────────────────────

export interface CostLine {
  id: string;
  prestation: string;
  type: 'revenu' | 'cout';
  xof: number;
  usd?: number;
  eur?: number;
  notes?: string;
}

export interface PortInfo {
  code: string;
  name: string;
  country: string;
  date_label?: string;
  date?: string;
}

export interface VoyageInfo {
  ref: string;
  compagnie: string;
  bl_number?: string;
  transit_time?: string;
  temperature?: string;
}

export interface DossierTransportDetail extends DossierTransport {
  contact_name?: string;
  date_depart?: string;
  date_livraison?: string;
  volume?: string;
  devise?: string;
  notes?: string;
  taux_usd?: number;
  taux_eur?: number;
  lignes_estimees?: CostLine[];
  lignes_reelles?: CostLine[];
  port_origine?: PortInfo;
  port_destination?: PortInfo;
  voyage?: VoyageInfo;
  declarant_douane?: string;
  transport_final?: string;
  ref_douane?: string;
  statut_livraison?: string;
}
