export type ProspectStatus = 'nouveau' | 'contacte' | 'qualifie' | 'converti' | 'perdu';

export interface Prospect {
  id: string;
  company: string;
  initials: string;
  color: string;
  flag: string;
  contact: string;
  contactRole: string;
  sector: string;
  status: ProspectStatus;
  city: string;
  dossiers: number | null;
  pipeline: number | null;
  pipelineAge: number | null;
  lastActivity: string;
}

export const PROSPECT_STATUSES: ProspectStatus[] = [
  'nouveau', 'contacte', 'qualifie', 'converti', 'perdu',
];

export const STATUS_CONFIG: Record<ProspectStatus, {
  label: string;
  dotColor: string;
  tagBg: string;
  tagText: string;
  tagBorder: string;
  colBg: string;
}> = {
  nouveau: {
    label: 'Nouveau',
    dotColor: '#1B6B45',
    tagBg: 'rgba(27,107,69,0.10)',
    tagText: '#0F3D27',
    tagBorder: 'rgba(27,107,69,0.25)',
    colBg: 'rgba(27,107,69,0.03)',
  },
  contacte: {
    label: 'Contacté',
    dotColor: '#F59E0B',
    tagBg: 'rgba(245,158,11,0.10)',
    tagText: '#92400E',
    tagBorder: 'rgba(245,158,11,0.25)',
    colBg: 'rgba(245,158,11,0.03)',
  },
  qualifie: {
    label: 'Qualifié',
    dotColor: '#8B6914',
    tagBg: 'rgba(139,105,20,0.10)',
    tagText: '#6B4E0A',
    tagBorder: 'rgba(139,105,20,0.25)',
    colBg: 'rgba(139,105,20,0.03)',
  },
  converti: {
    label: 'Converti',
    dotColor: '#10B981',
    tagBg: 'rgba(16,185,129,0.10)',
    tagText: '#065F46',
    tagBorder: 'rgba(16,185,129,0.25)',
    colBg: 'rgba(16,185,129,0.03)',
  },
  perdu: {
    label: 'Perdu',
    dotColor: '#9EB0C4',
    tagBg: 'rgba(158,176,196,0.12)',
    tagText: '#5A738A',
    tagBorder: 'rgba(158,176,196,0.22)',
    colBg: 'rgba(158,176,196,0.03)',
  },
};

export const SECTOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Transport':        { bg: 'rgba(27,107,69,0.10)',   text: '#1B6B45', border: 'rgba(27,107,69,0.22)' },
  'Agro-alimentaire': { bg: 'rgba(16,185,129,0.10)',  text: '#059669', border: 'rgba(16,185,129,0.22)' },
  'Mining':           { bg: 'rgba(245,158,11,0.10)',  text: '#B45309', border: 'rgba(245,158,11,0.22)' },
  'Énergie':          { bg: 'rgba(249,115,22,0.10)',  text: '#C2410C', border: 'rgba(249,115,22,0.22)' },
  'BTP':              { bg: 'rgba(120,113,108,0.10)', text: '#57534E', border: 'rgba(120,113,108,0.22)' },
  'Logistique':       { bg: 'rgba(20,184,166,0.10)',  text: '#0D9488', border: 'rgba(20,184,166,0.22)' },
  'Tourisme':         { bg: 'rgba(139,105,20,0.10)',  text: '#8B6914', border: 'rgba(139,105,20,0.22)' },
  'Retail':           { bg: 'rgba(107,78,10,0.10)',   text: '#6B4E0A', border: 'rgba(107,78,10,0.22)' },
};

export function formatFcfa(amount: number | null, noUnit = false): string {
  if (!amount) return '–';
  const n = amount.toLocaleString('fr-FR');
  return noUnit ? n : `${n} FCFA`;
}

export function pipelineAgeInfo(days: number | null): {
  label: string;
  prefix: string;
  color: string;
  severity: 'normal' | 'warn' | 'urgent';
} {
  if (days === null) return { label: '–', prefix: '', color: 'var(--tx-3)', severity: 'normal' };
  if (days >= 60) return { label: `J+${days}`, prefix: '●', color: '#EF4444', severity: 'urgent' };
  if (days >= 30) return { label: `J+${days}`, prefix: '▲', color: '#F59E0B', severity: 'warn' };
  return { label: `J+${days}`, prefix: '', color: 'var(--tx-2)', severity: 'normal' };
}

export const MOCK_PROSPECTS: Prospect[] = [
  // Nouveau (3)
  {
    id: 'p1', company: 'Sonatrans SA', initials: 'SS', color: '#0EA5E9', flag: '🇸🇳',
    contact: 'Amadou Diallo', contactRole: 'Dir. Logistique', sector: 'Transport',
    status: 'nouveau', city: 'Dakar', dossiers: null, pipeline: 12500000, pipelineAge: null, lastActivity: 'il y a 2h',
  },
  {
    id: 'p2', company: 'Petroci Holding', initials: 'PH', color: '#22C55E', flag: '🇨🇮',
    contact: 'Jean-Baptiste Kouamé', contactRole: 'Dir. Achats', sector: 'Énergie',
    status: 'nouveau', city: 'Abidjan', dossiers: null, pipeline: 5800000, pipelineAge: null, lastActivity: 'il y a 5j',
  },
  {
    id: 'p3', company: 'SAPCO Sénégal', initials: 'SC', color: '#14B8A6', flag: '🇸🇳',
    contact: 'Moussa Ndiaye', contactRole: 'Dir. Général', sector: 'Tourisme',
    status: 'nouveau', city: 'Dakar', dossiers: null, pipeline: 7400000, pipelineAge: null, lastActivity: 'il y a 1 sem',
  },
  // Contacté (2)
  {
    id: 'p4', company: 'Globex Abidjan SARL', initials: 'GA', color: '#10B981', flag: '🇨🇮',
    contact: "Kouassi N'Goran", contactRole: 'Directeur Commercial', sector: 'Agro-alimentaire',
    status: 'contacte', city: 'Abidjan', dossiers: 2, pipeline: 8750000, pipelineAge: 45, lastActivity: 'il y a 1j',
  },
  {
    id: 'p5', company: 'Sosumar', initials: 'SM', color: '#1E3A5F', flag: '🇸🇳',
    contact: 'Fatou Ba', contactRole: 'Resp. Logistique', sector: 'Agro-alimentaire',
    status: 'contacte', city: 'Dakar', dossiers: 1, pipeline: 3200000, pipelineAge: 72, lastActivity: 'il y a 2j',
  },
  // Qualifié (3)
  {
    id: 'p6', company: 'SITARAIL', initials: 'SR', color: '#EF4444', flag: '🇨🇮',
    contact: 'Emmanuel Koffi', contactRole: 'DG Adjoint', sector: 'Transport',
    status: 'qualifie', city: 'Abidjan', dossiers: 3, pipeline: 38500000, pipelineAge: 22, lastActivity: 'il y a 3h',
  },
  {
    id: 'p7', company: 'AngloGold Ashanti', initials: 'AG', color: '#84CC16', flag: '🇬🇭',
    contact: 'Christophe Mensah', contactRole: 'Supply Chain Manager', sector: 'Mining',
    status: 'qualifie', city: 'Abidjan', dossiers: 2, pipeline: 24000000, pipelineAge: 35, lastActivity: 'il y a 4h',
  },
  {
    id: 'p8', company: "Ciment de Côte d'Ivoire", initials: 'CI', color: '#F97316', flag: '🇨🇮',
    contact: 'Sékou Traoré', contactRole: 'Dir. Logistique', sector: 'BTP',
    status: 'qualifie', city: 'Abidjan', dossiers: 1, pipeline: 19500000, pipelineAge: 28, lastActivity: 'il y a 6h',
  },
  // Converti (2)
  {
    id: 'p9', company: 'Dakar Terminal', initials: 'DT', color: '#F59E0B', flag: '🇸🇳',
    contact: 'Ibrahima Sow', contactRole: 'Dir. Opérations', sector: 'Logistique',
    status: 'converti', city: 'Dakar', dossiers: 5, pipeline: 87200000, pipelineAge: 8, lastActivity: 'il y a 30min',
  },
  {
    id: 'p10', company: 'Bolloré Africa', initials: 'BA', color: '#8B5CF6', flag: '🇨🇲',
    contact: 'Pierre Mbarga', contactRole: 'Directeur Régional', sector: 'Transport',
    status: 'converti', city: 'Douala', dossiers: 7, pipeline: 156000000, pipelineAge: 12, lastActivity: 'il y a 1h',
  },
  // Perdu (2)
  {
    id: 'p11', company: 'Camair-Co', initials: 'CC', color: '#60A5FA', flag: '🇨🇲',
    contact: 'André Talla', contactRole: 'Dir. Fret', sector: 'Transport',
    status: 'perdu', city: 'Douala', dossiers: null, pipeline: null, pipelineAge: null, lastActivity: 'il y a 3 sem',
  },
  {
    id: 'p12', company: 'SOCOCÉ', initials: 'SV', color: '#38BDF8', flag: '🇨🇮',
    contact: 'Adjoua Coulibaly', contactRole: 'Dir. Supply Chain', sector: 'Retail',
    status: 'perdu', city: 'Abidjan', dossiers: null, pipeline: null, pipelineAge: null, lastActivity: 'il y a 1 mois',
  },
];
