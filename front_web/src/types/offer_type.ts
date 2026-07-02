// ── Transport Offers IA ────────────────────────────────────────────────────────
// Réponses de l'API /api/v1/transport/offers/

export interface TransportOfferListItem {
  id: string;
  session_id: string;
  status: string;
  odoo_shipment_id: number | null;
  odoo_shipment_name: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface TransportOfferDetail {
  offer_id: string;
  status: string;
  title: string;
  reference: string;
  date: string;
  validity_days: number;
  sections: Array<Record<string, unknown>>;
  pricing: Array<Record<string, unknown>>;
  route: {
    origin: string;
    destination: string;
    transport_mode: string;
    vehicle_type: string;
    planned_date: string;
  };
  client: { name: string; odoo_partner_id: number };
  footer: string;
  document_generated_at: string;
  parse_error: boolean;
}

export interface TransportOfferValidateResponse {
  id: string;
  session_id: string;
  status: string;
  odoo_shipment_id: number | null;
  odoo_shipment_name: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface TransportOfferConfirmResponse {
  offer_id: string;
  status: string;
  odoo_shipment_id: number | null;
  odoo_shipment_name: string | null;
  confirmed_at: string;
}

// Mapping transport status → OfferStatus UI
export function mapTransportStatus(status: string): OfferStatus {
  const s = status?.toLowerCase() ?? '';
  if (s === 'generated')  return 'genere';
  if (s === 'validated')  return 'envoyee';
  if (s === 'confirmed')  return 'signee';
  if (s === 'cancelled' || s === 'canceled') return 'refusee';
  return 'brouillon';
}

// Convertit un TransportOfferListItem en Offer pour le composant de liste
export function transportListItemToOffer(item: TransportOfferListItem): Offer {
  return {
    id:                   item.id,
    name:                 item.odoo_shipment_name ?? `OFF-${item.id.slice(0, 8).toUpperCase()}`,
    client_name:          item.odoo_shipment_name ?? '–',
    origin_location:      '–',
    destination_location: '–',
    unit_price:           0,
    amount_untaxed:       0,
    amount_tax:           0,
    amount_total:         0,
    validity_days:        0,
    date_emission:        item.created_at,
    date_expiry:          item.confirmed_at ?? item.created_at,
    state:                mapTransportStatus(item.status),
    created_at:           item.created_at,
    odoo_linked:          !!item.odoo_shipment_id,
    ai_generated:         true,
  };
}

// Convertit un TransportOfferDetail en Offer pour la vue détail
export function transportDetailToOffer(detail: TransportOfferDetail): Offer {
  const price = detail.pricing?.[0];
  const amount = price
    ? Number(price['unit_price'] ?? price['price_per_unit'] ?? price['amount'] ?? price['price'] ?? 0)
    : 0;

  return {
    id:                   detail.offer_id,
    name:                 detail.reference || `OFF-${detail.offer_id.slice(0, 8).toUpperCase()}`,
    client_name:          detail.client?.name ?? '–',
    partner_id:           detail.client?.odoo_partner_id,
    origin_location:      detail.route?.origin ?? '–',
    destination_location: detail.route?.destination ?? '–',
    transport_mode:       detail.route?.transport_mode,
    vehicle_type:         detail.route?.vehicle_type,
    product_description:  (detail.sections?.[0] as Record<string, unknown>)?.['content'] as string ?? '',
    unit_price:           amount,
    amount_untaxed:       amount,
    amount_tax:           0,
    amount_total:         amount,
    validity_days:        detail.validity_days ?? 0,
    date_emission:        detail.date ?? detail.document_generated_at,
    date_expiry:          detail.document_generated_at,
    date_planned:         detail.route?.planned_date,
    state:                mapTransportStatus(detail.status),
    created_at:           detail.document_generated_at,
    odoo_linked:          false,
    ai_generated:         true,
  };
}

// ── Offres commerciales ────────────────────────────────────────────────────────

export type OfferStatus = 'brouillon' | 'genere' | 'envoyee' | 'signee' | 'refusee' | 'expiree';
export type OfferMode   = 'terrestre' | 'maritime' | 'aerien' | 'routier' | 'multimodal';

export interface Offer {
  id: string;
  name: string;                 // "OFF-2026-0091"
  client_name: string;
  partner_id?: number;
  odoo_linked?: boolean;
  origin_location: string;
  destination_location: string;
  transport_mode?: string;
  vehicle_type?: string;
  product_description?: string;
  quantity?: number;
  quantity_unit?: string;
  unit_price: number;
  amount_untaxed: number;       // HT
  amount_tax: number;           // TVA
  amount_total: number;         // TTC
  tva_rate?: number;            // ex: 19.25
  date_emission: string;        // ISO
  validity_days: number;
  date_expiry: string;          // ISO
  date_planned?: string;        // ISO
  state: OfferStatus;
  commercial_name?: string;
  ai_generated?: boolean;
  currency?: string;
  created_at: string;
  updated_at?: string;
  sent_at?: string;
  signed_at?: string;
  refused_at?: string;
  activity?: string;            // "il y a 2 sem" — fourni par l'API ou dérivé
}

export interface OfferListResponse {
  items: Offer[];
  total: number;
  limit?: number;
  offset?: number;
  counts_by_status?: Partial<Record<OfferStatus | 'tous', number>>;
}

export interface CreateOfferBody {
  client_name: string;
  partner_id?: number;
  origin_location: string;
  destination_location: string;
  transport_mode: string;
  vehicle_type: string;
  product_description: string;
  quantity: number;
  quantity_unit: string;
  unit_price: number;
  validity_days: number;
  date_planned?: string;
}

export interface SendOfferBody {
  channel: 'whatsapp' | 'email';
  recipient: string;
  message?: string;
}

// ── Config statuts ─────────────────────────────────────────────────────────────

export const OFFER_STATUS_CONFIG: Record<OfferStatus, {
  label: string; bg: string; color: string; dot: string;
}> = {
  brouillon: { label: 'Brouillon', bg: '#F3F4F6', color: '#374151', dot: '#9CA3AF' },
  genere:    { label: 'Généré',    bg: '#FBF3DE', color: '#725A0A', dot: '#92720C' },
  envoyee:   { label: 'Envoyée',   bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  signee:    { label: 'Signée',    bg: '#ECFDF5', color: '#059669', dot: '#10B981' },
  refusee:   { label: 'Refusée',   bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
  expiree:   { label: 'Expirée',   bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
};

export const OFFER_MODE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  terrestre:  { label: 'Terrestre',  bg: '#ECFDF5', color: '#059669' },
  maritime:   { label: 'Maritime',   bg: '#EBF5FD', color: '#085499' },
  aerien:     { label: 'Aérien',     bg: '#FDF0F7', color: '#A01D65' },
  routier:    { label: 'Routier',    bg: '#ECFDF5', color: '#059669' },
  multimodal: { label: 'Multimodal', bg: '#F3EFFE', color: '#5829A8' },
};

export const OFFER_STATUS_TABS: { key: OfferStatus | 'tous'; label: string }[] = [
  { key: 'tous',      label: 'Tous' },
  { key: 'brouillon', label: 'Brouillon' },
  { key: 'genere',    label: 'Généré' },
  { key: 'envoyee',   label: 'Envoyée' },
  { key: 'signee',    label: 'Signée' },
  { key: 'refusee',   label: 'Refusée' },
  { key: 'expiree',   label: 'Expirée' },
];

export const OFFER_MODES: { value: string; label: string }[] = [
  { value: 'terrestre',  label: 'Terrestre' },
  { value: 'maritime',   label: 'Maritime' },
  { value: 'aerien',     label: 'Aérien' },
  { value: 'routier',    label: 'Routier' },
  { value: 'multimodal', label: 'Multimodal' },
];

export const OFFER_VEHICLES = [
  'Benne', 'Plateau', 'Fourgon', 'Citerne', 'Conteneur', 'Remorque', 'Frigorifique',
];

export const OFFER_VALIDITY_OPTIONS: { value: number; label: string }[] = [
  { value: 7,  label: '7 jours' },
  { value: 15, label: '15 jours' },
  { value: 30, label: '30 jours' },
  { value: 60, label: '60 jours' },
];

// ── Fonctions utilitaires ──────────────────────────────────────────────────────

export function isOfferExpired(offer: Pick<Offer, 'state' | 'date_expiry'>): boolean {
  if (offer.state === 'signee' || offer.state === 'refusee') return false;
  return new Date(offer.date_expiry) < new Date();
}

export function offerDaysLeft(offer: Pick<Offer, 'date_expiry'>): number {
  return Math.round((new Date(offer.date_expiry).getTime() - Date.now()) / 86400000);
}

export function computeOfferStatus(offer: Pick<Offer, 'state' | 'date_expiry'>): OfferStatus {
  if (offer.state === 'signee' || offer.state === 'refusee') return offer.state;
  if (isOfferExpired(offer)) return 'expiree';
  return offer.state;
}

export function hashColor(str: string): string {
  const PALETTE = ['#1E5B3C', '#0F6E56', '#085499', '#5829A8', '#A01D65', '#D97706', '#92720C', '#5A738A'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h * 31) + str.charCodeAt(i)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function toInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}

export function fmtOfferAmount(n: number, currency = 'FCFA'): string {
  return `${(Math.round(n * 10) / 10).toLocaleString('fr-FR')} ${currency}`;
}

export function fmtOfferDate(iso?: string | null): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
