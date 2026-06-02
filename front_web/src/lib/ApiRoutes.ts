const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export const ApiRoutes = {
  // ── Auth (Keycloak) ─────────────────────────────────────────────────
  AUTH_TOKEN:
    `${process.env.KEYCLOAK_URL}/realms/` +
    `${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
  AUTH_LOGOUT:
    `${process.env.KEYCLOAK_URL}/realms/` +
    `${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`,
  AUTH_USERINFO:
    `${process.env.KEYCLOAK_URL}/realms/` +
    `${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,

  // ── Users ────────────────────────────────────────────────────────────
  USERS_ME:     `${BASE}/api/users/me`,
  USERS_LIST:   `${BASE}/api/users`,
  USERS_DETAIL: (id: string) => `${BASE}/api/users/${id}`,

  // ── Commercial ───────────────────────────────────────────────────────
  COMMERCIAL_LEADS:         `${BASE}/api/commercial/leads`,
  COMMERCIAL_LEAD_DETAIL:   (id: string) => `${BASE}/api/commercial/leads/${id}`,
  COMMERCIAL_PIPELINE:      `${BASE}/api/commercial/pipeline`,
  COMMERCIAL_CLIENTS:       `${BASE}/api/commercial/clients`,
  COMMERCIAL_CLIENT_DETAIL: (id: string) => `${BASE}/api/commercial/clients/${id}`,

  // ── Transport ────────────────────────────────────────────────────────
  TRANSPORT_DOSSIERS:       `${BASE}/api/transport/dossiers`,
  TRANSPORT_DOSSIER_DETAIL: (id: string) => `${BASE}/api/transport/dossiers/${id}`,
  TRANSPORT_VEHICLES:       `${BASE}/api/transport/vehicles`,
  TRANSPORT_DRIVERS:        `${BASE}/api/transport/drivers`,

  // ── Finance (DAF) ────────────────────────────────────────────────────
  FINANCE_INVOICES:        `${BASE}/api/finance/invoices`,
  FINANCE_INVOICE_DETAIL:  (id: string) => `${BASE}/api/finance/invoices/${id}`,
  FINANCE_PAYMENTS:        `${BASE}/api/finance/payments`,
  FINANCE_REPORTS:         `${BASE}/api/finance/reports`,
  FINANCE_DASHBOARD:       `${BASE}/api/finance/dashboard`,

  // ── Agents IA ────────────────────────────────────────────────────────
  AI_DAF_QUERY:         `${BASE}/api/ai/daf/query`,
  AI_COMMERCIAL_QUERY:  `${BASE}/api/ai/commercial/query`,
  AI_TRANSPORT_QUERY:   `${BASE}/api/ai/transport/query`,

  // ── Dashboard ────────────────────────────────────────────────────────
  DASHBOARD_STATS:    `${BASE}/api/dashboard/stats`,
  DASHBOARD_ACTIVITY: `${BASE}/api/dashboard/activity`,
} as const;
