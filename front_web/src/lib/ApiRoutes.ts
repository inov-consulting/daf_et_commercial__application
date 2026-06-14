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
} as const;
