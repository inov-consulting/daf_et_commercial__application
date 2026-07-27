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
  GROUP_LIST:         `${BASE}/api/v1/groups`,
  GROUP_CREATE:       `${BASE}/api/v1/groups`,
  GROUP_DELETE:       (id: string) => `${BASE}/api/v1/groups/${id}`,
  GROUP_ROLES:        (id: string) => `${BASE}/api/v1/groups/${id}/roles`,
  GROUP_ROLES_ASSIGN: (id: string) => `${BASE}/api/v1/groups/${id}/roles`,
  GROUP_ROLE_DELETE:  (id: string, role: string) => `${BASE}/api/v1/groups/${id}/roles/${role}`,

  // ── Permissions (realm roles) ────────────────────────────────────
  PERMISSIONS_LIST:   `${BASE}/api/v1/permissions`,

  // ── Chat & Vocal ─────────────────────────────────────────────────
  CHAT_MESSAGE:     `${BASE}/api/v1/chat`,
  VOCAL_TRANSCRIBE: `${BASE}/api/v1/chat/transcribe`,

  // ── Prospects ────────────────────────────────────────────────────
  PROSPECTS_LIST:   `${BASE}/api/v1/commercial/prospects`,
  PROSPECTS_CREATE: `${BASE}/api/v1/commercial/prospects`,
  PROSPECTS_GET:    (id: string) => `${BASE}/api/v1/commercial/prospects/${id}`,
  PROSPECTS_UPDATE: (id: string) => `${BASE}/api/v1/commercial/prospects/${id}`,
  PROSPECTS_DELETE: (id: string) => `${BASE}/api/v1/commercial/prospects/${id}`,
  PROSPECTS_ACTION: (id: string) => `${BASE}/api/v1/commercial/prospects/${id}/actions`,
  PROSPECTS_SYNC:   `${BASE}/api/v1/commercial/prospects/sync`,

  // ── Prospect Notes ───────────────────────────────────────────────
  PROSPECT_NOTES:       (id: string) => `${BASE}/api/v1/commercial/prospects/${id}/notes`,
  PROSPECT_NOTE_DELETE: (prospectId: string, noteId: string) => `${BASE}/api/v1/commercial/prospects/${prospectId}/notes/${noteId}`,

  // ── Prospect Comptes-rendus ──────────────────────────────────────
  PROSPECT_CRS:         (id: string) => `${BASE}/api/v1/commercial/prospects/${id}/compte-rendus`,
  PROSPECT_CR_DOWNLOAD: (prospectId: string, crId: string) => `${BASE}/api/v1/commercial/prospects/${prospectId}/compte-rendus/${crId}/download`,
  PROSPECT_CR_STATUS:   (prospectId: string, crId: string) => `${BASE}/api/v1/commercial/prospects/${prospectId}/compte-rendus/${crId}/status`,

  // ── Transport ────────────────────────────────────────────────────
  TRANSPORT_DOSSIERS:           `${BASE}/api/v1/transport/dossiers`,
  TRANSPORT_DOSSIER:            (id: string) => `${BASE}/api/v1/transport/dossiers/${id}`,
  TRANSPORT_DOSSIER_CLOSE:      (id: string) => `${BASE}/api/v1/transport/dossiers/${id}/close`,
  TRANSPORT_DASHBOARD:          `${BASE}/api/v1/transport/dashboard`,
  TRANSPORT_SHIPMENTS:          `${BASE}/api/v1/transport/shipments`,
  TRANSPORT_SHIPMENT:           (id: string) => `${BASE}/api/v1/transport/shipments/${id}`,
  TRANSPORT_SHIPMENT_VOYAGES:   (id: string) => `${BASE}/api/v1/transport/shipments/${id}/voyages`,
  TRANSPORT_SHIPMENT_NEXT_STEP: (id: string | number) => `${BASE}/api/v1/transport/shipments/${id}/next-step`,
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
  TRANSPORT_OFFERS_FORM:      (id: string) => `${BASE}/api/v1/transport/offers/${id}/form`,
  TRANSPORT_OFFERS_CUSTOMERS: `${BASE}/api/v1/transport/offers/customers`,

  // ── Comptes-rendus (global) ──────────────────────────────────────────
  COMPTE_RENDUS:        `${BASE}/api/v1/compte-rendus`,
  COMPTE_RENDU_DETAIL:  (id: string) => `${BASE}/api/v1/compte-rendus/${id}`,
  COMPTE_RENDU_STATUS:  (id: string) => `${BASE}/api/v1/compte-rendus/${id}/status`,

  // ── API Logs ─────────────────────────────────────────────────────────
  API_LOGS:        `${BASE}/api/v1/api-logs`,
  API_LOG:         (id: string) => `${BASE}/api/v1/api-logs/${id}`,
  API_LOG_DETAILS: (id: string) => `${BASE}/api/v1/api-logs/${id}/details`,

  // ── KPI ──────────────────────────────────────────────────────────────────
  KPI_CATALOG: `${BASE}/api/v1/kpi/catalog`,
  KPI_DETAIL:  (key: string) => `${BASE}/api/v1/kpi/${key}`,

  // ── DAF ──────────────────────────────────────────────────────────────────
  DAF_AGENT_STATUS:     `${BASE}/api/v1/daf/agent/status`,
  DAF_AGENT_TRIGGER:    `${BASE}/api/v1/daf/agent/trigger`,
  DAF_RUNS:             `${BASE}/api/v1/daf/runs`,
  DAF_RUN:              (runId: string) => `${BASE}/api/v1/daf/runs/${runId}`,
  DAF_SNAPSHOTS_LATEST: `${BASE}/api/v1/daf/snapshots/latest`,
  DAF_SNAPSHOTS:        `${BASE}/api/v1/daf/snapshots`,
  DAF_PROPOSED_ACTIONS: `${BASE}/api/v1/daf/proposed-actions`,
  DAF_PROPOSED_ACTION:  (actionId: string) => `${BASE}/api/v1/daf/proposed-actions/${actionId}`,
  DAF_APPROVE_ACTION:   (actionId: string) => `${BASE}/api/v1/daf/proposed-actions/${actionId}/approve`,
  DAF_REJECT_ACTION:    (actionId: string) => `${BASE}/api/v1/daf/proposed-actions/${actionId}/reject`,

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFICATIONS:              `${BASE}/api/v1/notifications`,
  NOTIFICATIONS_UNREAD_COUNT: `${BASE}/api/v1/notifications/unread-count`,
  NOTIFICATION_READ:          (id: string) => `${BASE}/api/v1/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL:     `${BASE}/api/v1/notifications/read-all`,
  NOTIFICATIONS_DEVICE_REG:   `${BASE}/api/v1/notifications/devices/register`,
  NOTIFICATIONS_DEVICE_UNREG: `${BASE}/api/v1/notifications/devices/unregister`,

  // ── WhatsApp / Messagerie ─────────────────────────────────────────────────
  WHATSAPP_CONVERSATIONS:       `${BASE}/api/v1/whatsapp/conversations`,
  WHATSAPP_CONVERSATION:        (id: string) => `${BASE}/api/v1/whatsapp/conversations/${id}`,
  WHATSAPP_MESSAGES:            (convId: string) => `${BASE}/api/v1/whatsapp/conversations/${convId}/messages`,
  WHATSAPP_STREAM:              (convId: string) => `${BASE}/api/v1/whatsapp/conversations/${convId}/stream`,
  WHATSAPP_CONVERSATIONS_START: `${BASE}/api/v1/whatsapp/conversations/start`,
  WHATSAPP_REPLY:               (convId: string) => `${BASE}/api/v1/whatsapp/conversations/${convId}/reply`,
  WHATSAPP_GENERATE_CR:         (convId: string) => `${BASE}/api/v1/whatsapp/conversations/${convId}/generate-cr`,
  WHATSAPP_READ:                (convId: string) => `${BASE}/api/v1/whatsapp/conversations/${convId}/read`,
  WHATSAPP_CR_LINK_PROSPECT:    (crId: string)   => `${BASE}/api/v1/compte-rendus/${crId}/link-prospect`,

  // ── App Config ───────────────────────────────────────────────────────────
  CONFIG_APP:            `${BASE}/api/v1/config/app`,
  CONFIG_APP_VALIDATORS: `${BASE}/api/v1/config/app/validators`,
  CONFIG_APP_SMTP:       `${BASE}/api/v1/config/app/smtp`,
  CONFIG_KPI_AVAILABLE:  `${BASE}/api/v1/config/app/kpi/available`,
  CONFIG_KPI_GROUPS:     `${BASE}/api/v1/config/app/kpi/groups`,
  CONFIG_KPI_GROUP:      (groupId: string) => `${BASE}/api/v1/config/app/kpi/groups/${groupId}`,

  // ── Monitoring ──────────────────────────────────────────────────────────
  MONITORING_STATS:      `${BASE}/api/v1/monitoring/stats`,
  MONITORING_AI_USAGE:   (days = 30) => `${BASE}/api/v1/monitoring/ai/usage?days=${days}`,
  MONITORING_AI_BALANCE: `${BASE}/api/v1/monitoring/ai/balance`,

  // ── AI Models & Config ───────────────────────────────────────────────────
  AI_MODELS:            `${BASE}/api/v1/ai/models`,
  AI_CONFIG:            `${BASE}/api/v1/ai/config`,
  AI_CONFIG_GENERATION: `${BASE}/api/v1/ai/config/generation`,
  AI_CONFIG_EMBEDDING:  `${BASE}/api/v1/ai/config/embedding`,
  AI_CONFIG_TEMPLATE:   `${BASE}/api/v1/ai/config/template`,
} as const;
