export type UserStatus = 'active' | 'pending' | 'inactive';
export type UserRole = 'DG' | 'Commercial' | 'DAF' | 'Opérations';
export type AccessSurface = 'Mobile' | 'Web' | 'Mobile + Web';

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
  invitedAt?: string;
  inviteExpires?: string;
}

export const COMPANIES = ['INOV Sénégal', "INOV Côte d'Ivoire", 'Groupe Holding'] as const;
export const GROUPES_LIST = ['Terrain', 'Finance', 'Direction', 'Administration', 'Lecture seule'] as const;

export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'DG', label: 'DG — Directeur Général' },
  { value: 'Commercial', label: 'Commercial Terrain' },
  { value: 'DAF', label: 'DAF — Directeur Administratif & Financier' },
  { value: 'Opérations', label: 'Opérations' },
];

export const SURFACES: AccessSurface[] = ['Mobile', 'Web', 'Mobile + Web'];

export const MOCK_USERS: User[] = [
  {
    uid: 'hawa',
    initials: 'HK',
    nom: 'Konaté',
    prenom: 'Hawa',
    email: 'hawa@portalis.ci',
    role: 'DG',
    groupes: ['Direction', 'Administration'],
    entreprises: ['Groupe Holding'],
    surface: 'Mobile + Web',
    status: 'active',
    lastLogin: '4 juin 2026 · 09:15',
    created: '3 mars 2025',
    bg: 'linear-gradient(135deg,#C2257A,#6B35C9)',
  },
  {
    uid: 'amadou',
    initials: 'AD',
    nom: 'Diallo',
    prenom: 'Amadou',
    email: 'amadou@portalis.sn',
    role: 'Commercial',
    groupes: ['Terrain'],
    entreprises: ['INOV Sénégal'],
    surface: 'Mobile',
    status: 'active',
    lastLogin: '2 juin 2026 · 14:33',
    created: '15 mai 2025',
    bg: '#0E86E8',
  },
  {
    uid: 'fatou',
    initials: 'FC',
    nom: 'Camara',
    prenom: 'Fatou',
    email: 'fatou@portalis.sn',
    role: 'DAF',
    groupes: ['Finance', 'Administration'],
    entreprises: ['Groupe Holding', 'INOV Sénégal'],
    surface: 'Web',
    status: 'active',
    lastLogin: '2 juin 2026 · 16:22',
    created: '14 janv. 2026',
    bg: '#6B35C9',
  },
  {
    uid: 'moussa',
    initials: '',
    nom: '',
    prenom: 'Moussa',
    email: 'moussa@diallo-btp.sn',
    role: 'Commercial',
    groupes: [],
    entreprises: ['INOV Sénégal'],
    surface: 'Mobile',
    status: 'pending',
    lastLogin: null,
    created: null,
    bg: '',
    invitedAt: '1 juin 2026 · 11:04',
    inviteExpires: '7 juin 2026 · 11:04',
  },
];
