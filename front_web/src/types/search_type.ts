export type SearchResultType = 'prospect' | 'transport' | 'offre' | 'compte_rendu';

export interface ProspectExtra {
  status: string;
  status_label: string;
  odoo_lead_id: number;
  partner_name: string;
  email: string;
  portalis_id: string;
  synced: boolean;
}

export interface TransportExtra {
  odoo_id: number;
  state: string;
  state_label: string;
  partner_name: string;
  date_order: string;
  sale_amount: string;
}

export interface OffreExtra {
  state?: string;
  state_label?: string;
  partner_name?: string;
  amount?: string;
  [key: string]: unknown;
}

export interface CompteRenduExtra {
  status?: string;
  status_label?: string;
  partner_name?: string;
  [key: string]: unknown;
}

export interface SearchResultNav {
  route: string;
  params: Record<string, string | number>;
}

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  label: string;
  subtitle: string;
  nav: SearchResultNav;
  extra: ProspectExtra | TransportExtra | OffreExtra | CompteRenduExtra;
}

export interface SearchResponse {
  query: string;
  total: number;
  per_type: Record<string, number>;
  results: SearchResultItem[];
}
