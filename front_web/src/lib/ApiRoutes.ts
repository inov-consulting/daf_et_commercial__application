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

  // ── Group ────────────────────────────────────────────────────────
  GROUP_LIST:    `${BASE}/api/v1/groups`,

  // ── Chat & Vocal ─────────────────────────────────────────────────
  CHAT_MESSAGE:     `${BASE}/api/v1/chat`,
  VOCAL_TRANSCRIBE: `${BASE}/api/v1/chat/transcribe`,

  // ── Prospects ────────────────────────────────────────────────────
  PROSPECTS_LIST:   `${BASE}/api/v1/commercial/prospects`,
  PROSPECTS_CREATE: `${BASE}/api/v1/commercial/prospects`,
  PROSPECTS_GET:    (id: string) => `${BASE}/api/v1/commercial/prospects/${id}`,
  PROSPECTS_UPDATE: (id: string) => `${BASE}/api/v1/commercial/prospects/${id}`,
  PROSPECTS_ACTION: (id: string) => `${BASE}/api/v1/commercial/prospects/${id}/actions`,
  PROSPECTS_SYNC:   `${BASE}/api/v1/commercial/prospects/sync`,

  // ── Prospect Notes ───────────────────────────────────────────────
  PROSPECT_NOTES:       (id: string) => `${BASE}/api/v1/commercial/prospects/${id}/notes`,
  PROSPECT_NOTE_DELETE: (prospectId: string, noteId: string) => `${BASE}/api/v1/commercial/prospects/${prospectId}/notes/${noteId}`,

  // ── Prospect Comptes-rendus ──────────────────────────────────────
  PROSPECT_CRS:         (id: string) => `${BASE}/api/v1/commercial/prospects/${id}/compte-rendus`,
  PROSPECT_CR_DOWNLOAD: (prospectId: string, crId: string) => `${BASE}/api/v1/commercial/prospects/${prospectId}/compte-rendus/${crId}/download`,

  // ── Transport ────────────────────────────────────────────────────
  TRANSPORT_DOSSIERS:           `${BASE}/api/v1/transport/dossiers`,
  TRANSPORT_DOSSIER:            (id: string) => `${BASE}/api/v1/transport/dossiers/${id}`,
  TRANSPORT_DOSSIER_CLOSE:      (id: string) => `${BASE}/api/v1/transport/dossiers/${id}/close`,
  TRANSPORT_DASHBOARD:          `${BASE}/api/v1/transport/dashboard`,
  TRANSPORT_SHIPMENTS:          `${BASE}/api/v1/transport/shipments`,
  TRANSPORT_SHIPMENT:           (id: string) => `${BASE}/api/v1/transport/shipments/${id}`,
  TRANSPORT_SHIPMENT_VOYAGES:   (id: string) => `${BASE}/api/v1/transport/shipments/${id}/voyages`,
  TRANSPORT_VOYAGE:             (id: string) => `${BASE}/api/v1/transport/voyages/${id}`,

  // ── Offers ────────────────────────────────────────────────────────────
  OFFERS_LIST:     `${BASE}/api/v1/transport/offers`,
  OFFERS_CREATE:   `${BASE}/api/v1/commercial/offers`,
  OFFERS_GET:      (id: string) => `${BASE}/api/v1/commercial/offers/${id}`,
  OFFERS_UPDATE:   (id: string) => `${BASE}/api/v1/commercial/offers/${id}`,
  OFFERS_ACTION:   (id: string) => `${BASE}/api/v1/commercial/offers/${id}/actions`,
  OFFERS_SEND:     (id: string) => `${BASE}/api/v1/commercial/offers/${id}/send`,
  OFFERS_GENERATE: (id: string) => `${BASE}/api/v1/commercial/offers/${id}/generate`,
  OFFERS_SYNC:     `${BASE}/api/v1/commercial/offers/sync`,

  // ── Transport Offers IA ──────────────────────────────────────────────
  TRANSPORT_OFFERS_LIST:     `${BASE}/api/v1/transport/offers/`,
  TRANSPORT_OFFERS_CHAT:     `${BASE}/api/v1/transport/offers/chat`,
  TRANSPORT_OFFERS_GET:      (id: string) => `${BASE}/api/v1/transport/offers/${id}`,
  TRANSPORT_OFFERS_GENERATE: (id: string) => `${BASE}/api/v1/transport/offers/${id}/generate`,
  TRANSPORT_OFFERS_VALIDATE: (id: string) => `${BASE}/api/v1/transport/offers/${id}/validate`,
  TRANSPORT_OFFERS_CONFIRM:  (id: string) => `${BASE}/api/v1/transport/offers/${id}/confirm`,
  TRANSPORT_OFFERS_CANCEL:   (id: string) => `${BASE}/api/v1/transport/offers/${id}/cancel`,

  // ── Comptes-rendus (global) ──────────────────────────────────────────
  COMPTE_RENDUS:       `${BASE}/api/v1/compte-rendus`,
  COMPTE_RENDU_DETAIL: (id: string) => `${BASE}/api/v1/compte-rendus/${id}`,

  // ── API Logs ─────────────────────────────────────────────────────────
  API_LOGS:        `${BASE}/api/v1/api-logs`,
  API_LOG:         (id: string) => `${BASE}/api/v1/api-logs/${id}`,
  API_LOG_DETAILS: (id: string) => `${BASE}/api/v1/api-logs/${id}/details`,

  // ── App Config ───────────────────────────────────────────────────────────
  CONFIG_APP:            `${BASE}/api/v1/config/app`,
  CONFIG_APP_VALIDATORS: `${BASE}/api/v1/config/app/validators`,
  CONFIG_APP_SMTP:       `${BASE}/api/v1/config/app/smtp`,
  CONFIG_KPI_AVAILABLE:  `${BASE}/api/v1/config/app/kpi/available`,
  CONFIG_KPI_GROUPS:     `${BASE}/api/v1/config/app/kpi/groups`,
  CONFIG_KPI_GROUP:      (groupId: string) => `${BASE}/api/v1/config/app/kpi/groups/${groupId}`,
} as const;
