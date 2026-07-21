import type { OfferStatus } from '@/types/offer_type';

export const STATUS_PILL: Record<OfferStatus, { label: string; bg: string; color: string; dot: string }> = {
  brouillon: { label: 'Brouillon', bg: '#EEF2F7', color: '#435869', dot: '#7691A8' },
  genere:    { label: 'Généré',    bg: '#FBF3DE', color: '#725A0A', dot: '#92720C' },
  envoyee:   { label: 'Validée',    bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  validee:   { label: 'Lié à Odoo', bg: '#ECFDF5', color: '#0E86E8', dot: '#0E86E8' },
  refusee:   { label: 'Refusée',   bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
  expiree:   { label: 'Expirée',   bg: '#EEF2F7', color: '#435869', dot: '#7691A8' },
};

export const STATUS_TABS: { key: OfferStatus | 'tous'; label: string }[] = [
  { key: 'tous',      label: 'Tous'      },
  { key: 'brouillon', label: 'Brouillon' },
  { key: 'genere',    label: 'Généré'    },
  { key: 'envoyee',   label: 'Validée'    },
  { key: 'validee',   label: 'Lié à Odoo' },
  { key: 'refusee',   label: 'Refusée'   },
  { key: 'expiree',   label: 'Expirée'   },
];

export const VALIDITY_LEGEND = [
  { dot: '#0E86E8', label: 'Valide (J+4 et plus)' },
  { dot: '#F59E0B', label: 'Bientôt expirée (J-3 à J0)' },
  { dot: '#9EB0C4', label: 'Expirée / non applicable' },
] as const;

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;