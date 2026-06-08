export interface ApiCompany {
  id: string;
  name?: string;
  country?: string;
  default_currency?: string;
  erp_id?: number;
  parent_company_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}