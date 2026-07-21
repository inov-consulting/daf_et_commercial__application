import { ApiCompany } from "./company_type";

export interface ApiUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_ids: string[];
  companies: ApiCompany[];
  is_active: boolean;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

// ── Palette déterministe basée sur l'id ───────────────────────────────────
const BG_PALETTE = [
  "linear-gradient(135deg, #0E86E8, #8B6914)",
  "#0E86E8",
  "#8B6914",
  "#10B981",
  "#F59E0B",
  "#6B4E0A",
  "#2E7D52",
  "#166239",
];

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.trunc((h << 5) - h + (id.codePointAt(i) ?? 0));
  return BG_PALETTE[Math.abs(h) % BG_PALETTE.length];
}

// ── Types UI ───────────────────────────────────────────────────────────────
export type UserStatus = "active" | "pending" | "inactive";
export type UserRole = "DG" | "Commercial" | "DAF" | "Opérations";
export type AccessSurface = "Mobile" | "Web" | "Mobile + Web";

export interface User {
  uid: string;
  initials: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  groupes: string[];
  entreprises: string[];
  surface: AccessSurface;
  status: UserStatus;
  lastLogin: string | null;
  created: string | null;
  bg: string;
  avatar?: string;
  invitedAt?: string;
  inviteExpires?: string;
}

export const COMPANIES = [
  "INOV Sénégal",
  "INOV Côte d'Ivoire",
  "Groupe Holding",
] as const;
export const GROUPES_LIST = [
  "Terrain",
  "Finance",
  "Direction",
  "Administration",
  "Lecture seule",
] as const;

export const ROLES: { value: UserRole; label: string }[] = [
  { value: "DG", label: "DG — Directeur Général" },
  { value: "Commercial", label: "Commercial Terrain" },
  { value: "DAF", label: "DAF — Directeur Administratif & Financier" },
  { value: "Opérations", label: "Opérations" },
];

export const SURFACES: AccessSurface[] = ["Mobile", "Web", "Mobile + Web"];

// ── Formatage date ISO → lisible FR ──────────────────────────────────────
function formatDate(iso: string | null | undefined, withTime = false): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!withTime) return datePart;
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${datePart} · ${h}:${m}`;
  } catch {
    return iso ?? null;
  }
}

// ── Mapper API → UI ───────────────────────────────────────────────────────
export function mapApiUser(u: ApiUser): User {
  const first = u.first_name ?? "";
  const last = u.last_name ?? "";

  // Gestion sécurisée des entreprises
  let entreprises: string[] = [];
  if (u.companies?.length) {
    entreprises = u.companies.map((c) => c.name ?? c.id);
  } else if (u.company_ids?.length) {
    entreprises = u.company_ids.map((id) =>
      id.length > 12 ? `${id.slice(0, 8)}…` : id,
    );
  }

  return {
    uid: u.id,
    initials: `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase(),
    prenom: first,
    nom: last,
    email: u.email,
    role: "Commercial", // non exposé encore par le backend
    groupes: [], // idem
    surface: "Mobile + Web", // idem
    entreprises,
    status: u.is_active ? "active" : "inactive",
    lastLogin: formatDate(u.last_login_at, true),
    created: formatDate(u.created_at),
    bg: hashColor(u.id),
    avatar: u.avatar_url,
  };
}

export const MOCK_USERS: User[] = [
  {
    uid: "hawa",
    initials: "HK",
    nom: "Konaté",
    prenom: "Hawa",
    email: "hawa@portalis.ci",
    role: "DG",
    groupes: ["Direction", "Administration"],
    entreprises: ["Groupe Holding"],
    surface: "Mobile + Web",
    status: "active",
    lastLogin: "4 juin 2026 · 09:15",
    created: "3 mars 2025",
    bg: "linear-gradient(135deg, #0E86E8, #8B6914)",
  },
  {
    uid: "amadou",
    initials: "AD",
    nom: "Diallo",
    prenom: "Amadou",
    email: "amadou@portalis.sn",
    role: "Commercial",
    groupes: ["Terrain"],
    entreprises: ["INOV Sénégal"],
    surface: "Mobile",
    status: "active",
    lastLogin: "2 juin 2026 · 14:33",
    created: "15 mai 2025",
    bg: "#0E86E8",
  },
  {
    uid: "fatou",
    initials: "FC",
    nom: "Camara",
    prenom: "Fatou",
    email: "fatou@portalis.sn",
    role: "DAF",
    groupes: ["Finance", "Administration"],
    entreprises: ["Groupe Holding", "INOV Sénégal"],
    surface: "Web",
    status: "active",
    lastLogin: "2 juin 2026 · 16:22",
    created: "14 janv. 2026",
    bg: "#8B6914",
  },
  {
    uid: "moussa",
    initials: "",
    nom: "",
    prenom: "Moussa",
    email: "moussa@diallo-btp.sn",
    role: "Commercial",
    groupes: [],
    entreprises: ["INOV Sénégal"],
    surface: "Mobile",
    status: "pending",
    lastLogin: null,
    created: null,
    bg: "",
    invitedAt: "1 juin 2026 · 11:04",
    inviteExpires: "7 juin 2026 · 11:04",
  },
];
