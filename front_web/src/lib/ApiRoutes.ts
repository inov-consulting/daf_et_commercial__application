const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export const ApiRoutes = {
  // ── Auth (Keycloak) ─────────────────────────────────────────────────
  AUTH_TOKEN:
    `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/` +
    `${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/protocol/openid-connect/token`,
  AUTH_LOGOUT:
    `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/` +
    `${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/protocol/openid-connect/logout`,
  AUTH_USERINFO:
    `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/` +
    `${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,

  // ── Users ────────────────────────────────────────────────────────────
  USERS_ME:     `${BASE}/api/v1/auth/me`,
  USERS_LIST:   `${BASE}/api/v1/users`,
  USERS_DETAIL: (id: string) => `${BASE}/api/v1/users/${id}`,
  USERS_ADD:    `${BASE}/api/v1/users`,
  USERS_UPDATE: (id: string) => `${BASE}/api/v1/users/${id}`,

  // ── Company ────────────────────────────────────────────────────────
  COMPANY_LIST:    `${BASE}/api/v1/companies`,

  // ── Commercial ───────────────────────────────────────────────────────
  COMMERCIAL_LEADS:         `${BASE}/api/v1/commercial/leads`,
  COMMERCIAL_LEAD_DETAIL:   (id: string) => `${BASE}/api/v1/commercial/leads/${id}`,
  COMMERCIAL_PIPELINE:      `${BASE}/api/v1/commercial/pipeline`,
  COMMERCIAL_CLIENTS:       `${BASE}/api/v1/commercial/clients`,
  COMMERCIAL_CLIENT_DETAIL: (id: string) => `${BASE}/api/v1/commercial/clients/${id}`,

  // ── Transport ────────────────────────────────────────────────────────
  TRANSPORT_DOSSIERS:       `${BASE}/api/v1/transport/dossiers`,
  TRANSPORT_DOSSIER_DETAIL: (id: string) => `${BASE}/api/v1/transport/dossiers/${id}`,
  TRANSPORT_VEHICLES:       `${BASE}/api/v1/transport/vehicles`,
  TRANSPORT_DRIVERS:        `${BASE}/api/v1/transport/drivers`,

  // ── Finance (DAF) ────────────────────────────────────────────────────
  FINANCE_INVOICES:        `${BASE}/api/v1/finance/invoices`,
  FINANCE_INVOICE_DETAIL:  (id: string) => `${BASE}/api/v1/finance/invoices/${id}`,
  FINANCE_PAYMENTS:        `${BASE}/api/v1/finance/payments`,
  FINANCE_REPORTS:         `${BASE}/api/v1/finance/reports`,
  FINANCE_DASHBOARD:       `${BASE}/api/v1/finance/dashboard`,

  // ── Agents IA ────────────────────────────────────────────────────────
  AI_DAF_QUERY:         `${BASE}/api/v1/ai/daf/query`,
  AI_COMMERCIAL_QUERY:  `${BASE}/api/v1/ai/commercial/query`,
  AI_TRANSPORT_QUERY:   `${BASE}/api/v1/ai/transport/query`,

  // ── Dashboard ────────────────────────────────────────────────────────
  DASHBOARD_STATS:    `${BASE}/api/v1/dashboard/stats`,
  DASHBOARD_ACTIVITY: `${BASE}/api/v1/dashboard/activity`,
} as const;
