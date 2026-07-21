export interface ApiLog {
  id: string;
  method: string;
  path: string;
  query_params: Record<string, unknown>;
  status_code: number;
  duration_ms: number;
  user_id: string | null;
  user_email: string | null;
  ip_address: string;
  is_error: boolean;
  error_message: string | null;
  created_at: string;
}

export interface ApiLogsResponse {
  items: ApiLog[];
  total: number;
  offset: number;
  limit: number;
}

export type ApiLogDetails = Record<string, unknown>;

export interface ApiLogsFilters {
  method: string;
  path: string;
  status_code: string;
  is_error: boolean | null;
  date_from: string;
  date_to: string;
  limit: number;
  offset: number;
}

export const DEFAULT_LOGS_FILTERS: ApiLogsFilters = {
  method: '',
  path: '',
  status_code: '',
  is_error: null,
  date_from: '',
  date_to: '',
  limit: 50,
  offset: 0,
};

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET:    { bg: '#EBF5FD', color: '#1565C0' },
  POST:   { bg: '#E8F5E9', color: '#1B5E20' },
  PUT:    { bg: '#FFF3E0', color: '#E65100' },
  PATCH:  { bg: '#F3E5F5', color: '#6A1B9A' },
  DELETE: { bg: '#FFEBEE', color: '#B71C1C' },
};

export function logStatus(log: ApiLog): { label: string; bg: string; color: string } {
  if (log.is_error || log.status_code >= 500)
    return { label: 'Erreur',  bg: '#FEF2F2', color: '#DC2626' };
  if (log.status_code >= 400)
    return { label: 'Warning', bg: '#FFFBEB', color: '#D97706' };
  return   { label: 'Succès',  bg: '#ECFDF5', color: '#0E86E8' };
}

export function fmtLogDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}
