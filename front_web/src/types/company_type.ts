export interface ApiCompany {
  id: string;
  name?: string;
  country?: string;
  country_code?: string;
  default_currency?: string;
  erp_id?: number;
  parent_company_id?: string | null;
  is_active?: boolean;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
}