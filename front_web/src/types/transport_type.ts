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

// ── Shipments ──────────────────────────────────────────────────────────────

export type ShipmentState = 'draft' | 'confirmed' | 'in_transit' | 'done' | 'cancelled';

export interface Shipment {
  id: number;
  name: string;
  state: ShipmentState;
  transport_mode?: string;
  partner_id?: number;
  partner?: string;
  vehicle_subtype?: string;
  origin_location?: string;
  destination_location?: string;
  date_start?: string;
  date_end?: string;
  created_at?: string;
  distance_km?: number;
  sale_price_unit?: number;
  voyage_count?: number;
  total_charges?: number;
  revenue?: number;
  margin?: number;
  company?: string;
  currency?: string;
}

export interface ShipmentListResponse {
  items: Shipment[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface ShipmentVoyage {
  id: number;
  name: string;
  shipment_id?: number;
  shipment_name?: string;
  transport_mode?: string;
  state?: string;
  mode_operatoire?: string;
  vehicle?: string;
  driver?: string;
  vehicle_subtype?: string;
  origin_location?: string;
  destination_location?: string;
  date_departure?: string;
  date_arrival_dest?: string | null;
  actual_qty_weighed?: number;
  distance_km?: number;
  fuel_allowance?: number;
  fuel_actual?: number;
  fuel_variance?: number;
  fuel_efficiency_pct?: number;
  total_charges?: number;
  revenue?: number | null;
  margin?: number | null;
  company?: string;
  currency?: string;
}

export interface VoyageListResponse {
  items: ShipmentVoyage[];
  total: number;
}

export interface ShipmentCharge {
  id: number;
  name: string;
  charge_type?: string;
  amount: number;
  porteur?: string;
  state?: string;
  date?: string;
  source?: string;
}

export interface ShipmentImmobilization {
  id: number;
  reason?: string;
  start_date?: string;
  end_date?: string;
  days?: number;
  daily_cost?: number;
  total_cost?: number;
}

export interface ShipmentWorkflowHistory {
  id: number;
  step: string;
  date_entered?: string;
  date_exited?: string | null;
  duration_hours?: number;
  user?: string;
  note?: string | null;
}

export interface ShipmentWorkflow {
  instance_id?: number;
  template?: string;
  current_step?: string;
  state?: string;
  history?: ShipmentWorkflowHistory[];
}

export interface ShipmentDetail extends Shipment {
  voyages?: ShipmentVoyage[];
  charges?: ShipmentCharge[];
  immobilizations?: ShipmentImmobilization[];
  workflow?: ShipmentWorkflow;
  notes?: string;
  date_order?: string;
  product_description?: string;
  planned_qty?: number;
}

/** Corps de la requête POST /api/v1/transport/shipments/{id}/next-step */
export interface NextStepBody {
  note?: string;
}

/** Réponse de POST /api/v1/transport/shipments/{id}/next-step */
export interface NextStepResponse {
  shipment_id: number;
  shipment_name: string;
  previous_step: string;
  current_step: string;
  current_step_code: string;
  next_step: string;
  next_step_code: string;
  workflow_state: string;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardByMode {
  transport_mode: string;
  shipment_count: number;
  voyage_count?: number;
  total_charges?: number;
  revenue?: number;
  margin?: number;
}

export interface TransportDashboard {
  period_from?: string | null;
  period_to?: string | null;
  total_shipments?: number;
  total_voyages?: number;
  total_charges?: number;
  total_revenue?: number;
  total_margin?: number;
  by_mode?: DashboardByMode[];
}

export const SHIPMENT_STATE_CONFIG: Record<ShipmentState, { label: string; bg: string; color: string; dot: string }> = {
  draft:      { label: 'Brouillon',  bg: '#F3F4F6', color: '#374151', dot: '#9CA3AF' },
  confirmed:  { label: 'Confirmé',   bg: '#EBF5FD', color: '#085499', dot: '#0E86E8' },
  in_transit: { label: 'En transit', bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  done:  { label: 'Livré',      bg: '#ECFDF5', color: '#059669', dot: '#10B981' },
  cancelled:  { label: 'Annulé',     bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
};

export const SHIPMENT_MODE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  maritime:    { label: 'Maritime',    bg: '#EBF5FD', color: '#085499' },
  routier:     { label: 'Routier',     bg: '#ECFDF5', color: '#059669' },
  road:        { label: 'Routier',     bg: '#ECFDF5', color: '#059669' },
  terrestre:   { label: 'Terrestre',   bg: '#ECFDF5', color: '#059669' },
  multimodal:  { label: 'Multimodal',  bg: '#F3EFFE', color: '#5829A8' },
  aerien:      { label: 'Aérien',      bg: '#FDF0F7', color: '#A01D65' },
  air:         { label: 'Aérien',      bg: '#FDF0F7', color: '#A01D65' },
  ferroviaire: { label: 'Ferroviaire', bg: '#FFF3E0', color: '#D97706' },
  rail:        { label: 'Ferroviaire', bg: '#FFF3E0', color: '#D97706' },
};

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
