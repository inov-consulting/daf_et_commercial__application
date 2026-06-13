export type ActivityModule = 'Transport' | 'DAF' | 'RH' | 'Administration' | 'Facturation';
export type ActivityStatus = 'Succès' | 'Erreur' | 'Warning';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Activity {
  id: number;
  ts: string;
  module: ActivityModule;
  action: string;
  method: HttpMethod;
  endpoint: string;
  user: string;
  userRole: string;
  status: ActivityStatus;
  ip: string;
  duration: string;
  txId: string;
  sess: string;
  sent: string;
  received: string;
}

export const METHOD_STYLES: Record<HttpMethod, { bg: string; color: string }> = {
  GET:    { bg: '#EBF5FD', color: '#1565C0' },
  POST:   { bg: '#E8F5E9', color: '#1B5E20' },
  PUT:    { bg: '#FFF3E0', color: '#E65100' },
  PATCH:  { bg: '#F3E5F5', color: '#6A1B9A' },
  DELETE: { bg: '#FFEBEE', color: '#B71C1C' },
};

export const MODULE_STYLES: Record<ActivityModule, { bg: string; color: string }> = {
  Transport:      { bg: '#EBF5FD', color: '#063A6B' },
  DAF:            { bg: '#F3EFFE', color: '#5829A8' },
  RH:             { bg: '#FDF0F7', color: '#A01D65' },
  Administration: { bg: '#EEF2F7', color: '#435869' },
  Facturation:    { bg: '#ECFDF5', color: '#059669' },
};

export const STATUS_STYLES: Record<ActivityStatus, { bg: string; color: string }> = {
  'Succès':  { bg: '#ECFDF5', color: '#059669' },
  'Erreur':  { bg: '#FEF2F2', color: '#DC2626' },
  'Warning': { bg: '#FFFBEB', color: '#D97706' },
};

export const ACTIVITY_MODULES = Object.keys(MODULE_STYLES) as ActivityModule[];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 1, ts: '11/06/2026 08:14:22', module: 'Transport',
    action: 'Création dossier TRS-2026-089',
    method: 'POST', endpoint: '/api/transport/dossiers',
    user: 'Saurel Ndiaye', userRole: 'Responsable IT',
    status: 'Succès', ip: '192.168.1.12', duration: '87 ms',
    txId: 'a3f2e1b9-4d72', sess: 'sess_SN_06110814',
    sent: '{\n  "action": "create_dossier",\n  "ref": "TRS-2026-089",\n  "origin": "DAKAR",\n  "user_id": "SN001"\n}',
    received: '{\n  "status": "created",\n  "dossier_id": 1089,\n  "created_at": "2026-06-11T08:14:22Z"\n}',
  },
  {
    id: 2, ts: '11/06/2026 08:31:07', module: 'DAF',
    action: 'Validation facture FAC-1042 — montant 4 200 000 XOF',
    method: 'PATCH', endpoint: '/api/daf/invoices/FAC-1042/validate',
    user: 'Aminata Sow', userRole: 'Directrice Administrative',
    status: 'Succès', ip: '192.168.1.34', duration: '142 ms',
    txId: 'b7c3a910-5e28', sess: 'sess_AS_06110831',
    sent: '{\n  "invoice_id": "FAC-1042",\n  "amount": 4200000,\n  "currency": "XOF",\n  "validator": "AS002"\n}',
    received: '{\n  "status": "validated",\n  "approved_at": "2026-06-11T08:31:07Z",\n  "next": "payment_queue"\n}',
  },
  {
    id: 3, ts: '11/06/2026 09:02:44', module: 'RH',
    action: 'Mise à jour fiche employé #EMP-0234',
    method: 'PUT', endpoint: '/api/rh/employees/EMP-0234',
    user: 'Fatou Diallo', userRole: 'Responsable RH',
    status: 'Succès', ip: '192.168.1.45', duration: '63 ms',
    txId: 'c1d4f823-7a91', sess: 'sess_FD_06110902',
    sent: '{\n  "employee_id": "EMP-0234",\n  "fields": ["phone","address"],\n  "updated_by": "FD004"\n}',
    received: '{\n  "status": "updated",\n  "rows_affected": 2,\n  "timestamp": "2026-06-11T09:02:44Z"\n}',
  },
  {
    id: 4, ts: '11/06/2026 09:18:55', module: 'Administration',
    action: 'Tentative connexion échouée — 3 essais',
    method: 'POST', endpoint: '/api/auth/login',
    user: 'Inconnu', userRole: '—',
    status: 'Erreur', ip: '41.75.134.22', duration: '12 ms',
    txId: 'd9e5b047-2c63', sess: '—',
    sent: '{\n  "login": "unknown_user",\n  "attempts": 3,\n  "ip": "41.75.134.22"\n}',
    received: '{\n  "status": "blocked",\n  "reason": "max_attempts_exceeded",\n  "locked_until": "2026-06-11T09:33:55Z"\n}',
  },
  {
    id: 5, ts: '11/06/2026 09:45:12', module: 'Transport',
    action: 'Modification itinéraire TRS-2026-081 — port DAK→ABJ',
    method: 'PATCH', endpoint: '/api/transport/dossiers/1081/route',
    user: 'Kofi Mensah', userRole: 'Responsable Transport',
    status: 'Succès', ip: '192.168.1.19', duration: '211 ms',
    txId: 'e6f7c258-3b14', sess: 'sess_KM_06110945',
    sent: '{\n  "dossier_id": 1081,\n  "route": {"from":"DAK","to":"ABJ"},\n  "user_id": "KM003"\n}',
    received: '{\n  "status": "updated",\n  "dossier_id": 1081,\n  "new_eta": "2026-06-18"\n}',
  },
  {
    id: 6, ts: '11/06/2026 10:03:38', module: 'Facturation',
    action: 'Génération PDF facture FAC-1043',
    method: 'POST', endpoint: '/api/facturation/invoices/FAC-1043/export',
    user: 'Aminata Sow', userRole: 'Directrice Administrative',
    status: 'Warning', ip: '192.168.1.34', duration: '3 420 ms',
    txId: 'f2a1d369-8c45', sess: 'sess_AS_06111003',
    sent: '{\n  "invoice_id": "FAC-1043",\n  "format": "PDF",\n  "template": "standard_v2"\n}',
    received: '{\n  "status": "generated_with_warnings",\n  "file_size": 0,\n  "warning": "template_fallback_used"\n}',
  },
  {
    id: 7, ts: '11/06/2026 10:22:19', module: 'DAF',
    action: 'Export rapport P&L Q2 2026 — 847 Ko',
    method: 'GET', endpoint: '/api/daf/reports/PL_Q2_2026/export',
    user: 'Saurel Ndiaye', userRole: 'Responsable IT',
    status: 'Succès', ip: '192.168.1.12', duration: '934 ms',
    txId: 'g5b8e47a-1d90', sess: 'sess_SN_06111022',
    sent: '{\n  "report": "PL_Q2_2026",\n  "format": "xlsx",\n  "period": "2026-Q2",\n  "user_id": "SN001"\n}',
    received: '{\n  "status": "exported",\n  "file_size_kb": 847,\n  "download_url": "/exports/PL_Q2_2026.xlsx"\n}',
  },
  {
    id: 8, ts: '11/06/2026 10:47:03', module: 'Administration',
    action: 'Réinitialisation mot de passe — user KMensah',
    method: 'POST', endpoint: '/api/admin/users/KMensah/reset-password',
    user: 'Saurel Ndiaye', userRole: 'Responsable IT',
    status: 'Succès', ip: '192.168.1.12', duration: '178 ms',
    txId: 'h3c6f591-4a72', sess: 'sess_SN_06111047',
    sent: '{\n  "action": "reset_password",\n  "target_user": "KMensah",\n  "initiated_by": "SN001"\n}',
    received: '{\n  "status": "reset_email_sent",\n  "email": "k.mensah@portalis.sn",\n  "expires_in": "3600s"\n}',
  },
  {
    id: 9, ts: '11/06/2026 11:05:51', module: 'Transport',
    action: 'Clôture dossier TRS-2026-077 — marge finale 21.4%',
    method: 'PATCH', endpoint: '/api/transport/dossiers/1077/close',
    user: 'Kofi Mensah', userRole: 'Responsable Transport',
    status: 'Succès', ip: '192.168.1.19', duration: '456 ms',
    txId: 'i9d2a014-6e83', sess: 'sess_KM_06111105',
    sent: '{\n  "dossier_id": 1077,\n  "action": "close",\n  "margin_final": 21.4,\n  "user_id": "KM003"\n}',
    received: '{\n  "status": "closed",\n  "dossier_id": 1077,\n  "archived_at": "2026-06-11T11:05:51Z"\n}',
  },
  {
    id: 10, ts: '11/06/2026 11:28:44', module: 'RH',
    action: 'Erreur synchronisation module paie — timeout 30s',
    method: 'POST', endpoint: '/api/rh/payroll/sync',
    user: 'Système', userRole: 'Process automatique',
    status: 'Erreur', ip: '127.0.0.1', duration: '30 000 ms',
    txId: 'j7e4b928-3f51', sess: 'cron_payroll_sync',
    sent: '{\n  "job": "sync_payroll",\n  "source": "rh_module",\n  "target": "paie_api",\n  "timeout": 30000\n}',
    received: '{\n  "status": "timeout",\n  "error": "connection_refused",\n  "retry_at": "2026-06-11T11:43:44Z"\n}',
  },
];
