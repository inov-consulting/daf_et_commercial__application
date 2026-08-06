// ── Transport Offers IA ────────────────────────────────────────────────────────
// Réponses de l'API /api/v1/transport/offers/

export interface TransportOfferListItem {
  id: string;
  session_id: string;
  status: string;
  title: string | null;
  reference: string | null;
  date: string | null;
  validity_days: number | null;
  route: Route | null;
  amount_ttc: number | null;
  odoo_shipment_id: number | null;
  odoo_shipment_name: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface OfferSection {
  heading: string;
  content: string;
}

export interface OfferPricingRow {
  label: string;
  value: number | string;
  unit: string;
}

export interface Route {
    origin: string;
    destination: string;
    transport_mode: string;
    vehicle_type: string;
    planned_date: string;
  }

export interface TransportOfferDetail {
  offer_id: string;
  status: string;
  title: string | null;
  reference: string | null;
  date: string | null;
  validity_days: number | null;
  sections: OfferSection[];
  pricing: OfferPricingRow[];
  route: Route | null;
  client: { name: string; odoo_partner_id: number | null } | null;
  footer: string | null;
  document_generated_at: string | null;
  parse_error: boolean;
  warnings?: string[];
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

/** Réponse PATCH /offers/{id}/form */
export interface TransportOfferFormResponse {
  id: string;
  session_id: string;
  status: string;
  title: string;
  reference: string;
  date: string;
  validity_days: number;
  route: Route;
  amount_ttc: number;
  odoo_shipment_id: number | null;
  odoo_shipment_name: string | null;
  created_at: string;
  confirmed_at: string | null;
}

/** Corps PATCH /offers/{id}/form — tous les champs sont optionnels (PATCH partiel) */
export interface OfferFormPatchPayload {
  client_name?: string;
  odoo_partner_id?: number;
  product_description?: string;
  quantity?: number;
  quantity_unit?: string;
  origin?: string;
  destination?: string;
  transport_mode?: string;
  vehicle_type?: string;
  planned_date?: string;
  price_unit?: number;
  validity_days?: number;
  payment_conditions?: string;
  remarks?: string;
}

// Mapping transport status → OfferStatus UI
export function mapTransportStatus(status: string): OfferStatus {
  const s = status?.toLowerCase() ?? '';
  if (s === 'generated')  return 'genere';
  if (s === 'validated')  return 'envoyee';
  if (s === 'confirmed')  return 'validee';
  if (s === 'completed')  return 'terminee';
  if (s === 'cancelled' || s === 'canceled') return 'refusee';
  return 'brouillon';
}

// Extrait le client depuis un titre "Offre de transport N°REF — Client"
function clientFromTitle(title: string | null | undefined): string {
  if (!title) return '–';
  const parts = title.split(' — ');
  return parts.length > 1 ? parts.at(-1)!.trim() : '–';
}

// Calcule la date d'expiry depuis date d'émission + validité en jours
function computeExpiryDate(date: string | null, validityDays: number | null): string {
  if (!date || validityDays == null || validityDays <= 0) {
    return new Date(0).toISOString(); // passé lointain → expiré
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date(0).toISOString(); // date invalide → expiré
  }

  const d = new Date(parsedDate);
  d.setDate(d.getDate() + validityDays);
  return d.toISOString();
}

// Convertit un TransportOfferListItem en Offer pour le composant de liste
export function transportListItemToOffer(item: TransportOfferListItem): Offer {
  // client_name = nom extrait du titre IA, jamais remplacé par odoo_shipment_name
  const clientName = clientFromTitle(item.title) !== '–'
    ? clientFromTitle(item.title)
    : item.odoo_shipment_name ?? '–';
  const expiryDate = computeExpiryDate(item.created_at, item.validity_days);

  return {
    id:                   item.id,
    name:                 item.reference ?? `OFF-${item.id.slice(0, 8).toUpperCase()}`,
    client_name:          clientName,
    odoo_shipment_name:   item.odoo_shipment_name ?? null,
    origin_location:      item.route?.origin      ?? '–',
    destination_location: item.route?.destination ?? '–',
    route:                item.route ?? undefined,
    transport_mode:       item.route?.transport_mode ?? undefined,
    vehicle_type:         item.route?.vehicle_type   ?? undefined,
    unit_price:           0,
    amount_untaxed:       0,
    amount_tax:           0,
    amount_ttc:           item.amount_ttc ?? 0,
    validity_days:        item.validity_days ?? 0,
    date_emission:        item.date ?? item.created_at,
    date_expiry:          expiryDate,
    state:                mapTransportStatus(item.status),
    created_at:           item.created_at,
    odoo_linked:          !!item.odoo_shipment_id,
    ai_generated:         true,
  };
}

// Convertit un TransportOfferDetail en Offer pour la vue détail
export function transportDetailToOffer(detail: TransportOfferDetail): Offer {
  // Cherche une ligne de tarification par mots-clés (insensible à la casse)
  function findRow(keywords: string[]): OfferPricingRow | undefined {
    return detail.pricing?.find(p =>
      keywords.some(k => String(p.label).toLowerCase().includes(k))
    );
  }

  const prodRow = findRow(['produit']);
  const qteRow  = findRow(['quantit']);
  const puRow   = findRow(['prix unitaire', 'unit price', 'price_per_unit']);
  const htRow   = findRow(['montant ht', 'hors taxe', 'ht']);
  const tvaRow  = findRow(['tva', 'tax']);
  const ttcRow  = findRow(['montant ttc', 'total ttc', 'ttc']);

  const product   = prodRow ? String(prodRow.value)   : '';
  const quantity  = qteRow  ? Number(qteRow.value)  || 0 : 0;
  const qtyUnit   = qteRow?.unit ?? 'tonnes';
  const unitPrice = puRow   ? Number(puRow.value)   || 0 : 0;
  const amountHT  = htRow   ? Number(htRow.value)   || unitPrice * quantity : unitPrice * quantity;
  const amountTVA = tvaRow  ? Number(tvaRow.value)  || 0 : 0;
  const amountTTC = ttcRow  ? Number(ttcRow.value)  || amountHT + amountTVA : amountHT + amountTVA;

  // Extrait le taux TVA depuis le label "TVA (19.25%)"
  let tvaRatePct = 19.25;
  if (tvaRow?.label) {
    const m = String(tvaRow.label).match(/([\d.]+)\s*%/);
    if (m) tvaRatePct = parseFloat(m[1]);
  }

  // date_emission = date de l'offre (ex: "2025-01-16")
  const emissionDate  = detail.date || detail.document_generated_at?.split('T')[0] || '';
  // validité calculée depuis document_generated_at (date de génération du document)
  const generatedDate = detail.document_generated_at?.split('T')[0] || emissionDate;
  const expiryDate    = computeExpiryDate(generatedDate, detail.validity_days);

  return {
    id:                   detail.offer_id,
    name:                 detail.reference || `OFF-${detail.offer_id.slice(0, 8).toUpperCase()}`,
    client_name:          detail.client?.name ?? '–',
    partner_id:           detail.client?.odoo_partner_id ?? undefined,
    route:                detail.route ?? undefined,
    origin_location:      detail.route?.origin ?? '–',
    destination_location: detail.route?.destination ?? '–',
    transport_mode:       detail.route?.transport_mode,
    vehicle_type:         detail.route?.vehicle_type,
    product_description:  product,
    quantity,
    quantity_unit:        qtyUnit,
    unit_price:           unitPrice,
    amount_untaxed:       amountHT,
    amount_tax:           amountTVA,
    amount_ttc:         amountTTC,
    tva_rate:             tvaRatePct,
    validity_days:        detail.validity_days ?? 0,
    date_emission:        emissionDate,
    date_expiry:          expiryDate,
    date_planned:         detail.route?.planned_date,
    state:                mapTransportStatus(detail.status),
    created_at:           detail.document_generated_at ?? new Date().toISOString(),
    odoo_linked:          !!detail.client?.odoo_partner_id,
    ai_generated:         true,
    currency:             'FCFA',
  };
}

// ── Offres commerciales ────────────────────────────────────────────────────────

export type OfferStatus = 'brouillon' | 'genere' | 'envoyee' | 'validee' | 'terminee' | 'refusee' | 'expiree';
export type OfferMode   = 'terrestre' | 'maritime' | 'aerien' | 'routier' | 'multimodal';

export interface Offer {
  id: string;
  name: string;                 // "OFF-2026-0091"
  client_name: string;
  company_name?: string;
  partner_id?: number;
  odoo_linked?: boolean;
  odoo_shipment_name?: string | null;
  origin_location?: string;
  destination_location?: string;
  route?: Route;
  transport_mode?: string;
  vehicle_type?: string;
  product_description?: string;
  quantity?: number;
  quantity_unit?: string;
  unit_price: number;
  amount_untaxed: number;       // HT
  amount_tax: number;           // TVA
  amount_ttc: number;         // TTC
  tva_rate?: number;            // ex: 19.25
  date_emission: string;        // ISO
  validity_days: number;
  date_expiry: string;          // ISO
  date_planned?: string; 
  date?: string;        // ISO
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

export interface OfferListViewProps {
  offers: Offer[];
  loading: boolean;
  onRefresh: () => void;
  onNew: () => void;
  onView: (offer: Offer) => void;
  onEdit: (offer: Offer) => void;
  onDuplicate: (offer: Offer) => void;
  onSend: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
}

export interface RowPopupProps {
  offer: Offer;
  status: OfferStatus;
  onView: () => void;
  onEdit: (offer: Offer) => void;
  onDuplicate: () => void;
  onSend: () => void;
  onDelete: () => void;
  onValidate?: () => void;
  onConfirm?: () => void;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
  totalItems: number;
}

// ── Config statuts ─────────────────────────────────────────────────────────────

export const OFFER_STATUS_CONFIG: Record<OfferStatus, {
  label: string; bg: string; color: string; dot: string;
}> = {
  brouillon: { label: 'Brouillon',  bg: '#F3F4F6', color: '#374151', dot: '#9CA3AF' },
  genere:    { label: 'Généré',     bg: '#FBF3DE', color: '#725A0A', dot: '#92720C' },
  envoyee:   { label: 'Validée',    bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  validee:   { label: 'Lié à Odoo', bg: '#ECFDF5', color: '#059669', dot: '#10B981' },
  terminee:  { label: 'Terminée',   bg: '#EEF2FF', color: '#3730A3', dot: '#6366F1' },
  refusee:   { label: 'Refusée',    bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
  expiree:   { label: 'Expirée',    bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
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
  { key: 'envoyee',   label: 'Validée' },
  { key: 'validee',   label: 'Lié à Odoo' },
  { key: 'terminee',  label: 'Terminée' },
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
  if (offer.state === 'validee' || offer.state === 'terminee' || offer.state === 'refusee') return false;
  const expiry = new Date(offer.date_expiry);
  // epoch sentinel (1970) = pas de date d'expiration définie → pas expiré
  if (isNaN(expiry.getTime()) || expiry.getFullYear() < 2000) return false;
  return expiry < new Date();
}

export function offerDaysLeft(offer: Pick<Offer, 'date_expiry'>): number {
  return Math.round((new Date(offer.date_expiry).getTime() - Date.now()) / 86400000);
}

export function computeOfferStatus(offer: Pick<Offer, 'state' | 'date_expiry'>): OfferStatus {
  if (offer.state === 'validee' || offer.state === 'terminee' || offer.state === 'refusee') return offer.state;
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
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
