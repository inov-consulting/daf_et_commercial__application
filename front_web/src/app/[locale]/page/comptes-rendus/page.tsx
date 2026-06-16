'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  MicrophoneIcon, MagnifyingGlassIcon, FunnelIcon, DownloadSimpleIcon,
  ClockIcon, CaretRightIcon, FileTextIcon, CheckCircleIcon, WarningIcon,
  SparkleIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type CRStatus = 'brouillon' | 'en_traitement' | 'valide' | 'rejete';

interface CompteRendu {
  id: string;
  ref: string;
  company: string;
  initials: string;
  color: string;
  flag: string;
  contact: string;
  contactRole: string;
  dossier: string;
  date: string;
  duration: string;
  wordCount: number;
  status: CRStatus;
  iaConfidence: number;
  summary: string;
}

const STATUS_CFG: Record<CRStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  valide: {
    label: 'Validé', bg: 'rgba(16,185,129,0.10)', text: '#065F46',
    border: 'rgba(16,185,129,0.25)', dot: '#10B981',
  },
  brouillon: {
    label: 'Brouillon', bg: 'rgba(245,158,11,0.10)', text: '#92400E',
    border: 'rgba(245,158,11,0.25)', dot: '#F59E0B',
  },
  en_traitement: {
    label: 'En traitement', bg: 'rgba(107,53,201,0.10)', text: '#5829A8',
    border: 'rgba(107,53,201,0.20)', dot: '#6B35C9',
  },
  rejete: {
    label: 'Rejeté', bg: 'rgba(239,68,68,0.10)', text: '#991B1B',
    border: 'rgba(239,68,68,0.20)', dot: '#EF4444',
  },
};

const MOCK_CRS: CompteRendu[] = [
  {
    id: 'cr1', ref: 'CR-2026-0009', company: 'Sonatrans SA', initials: 'SS', color: '#0EA5E9', flag: '🇸🇳',
    contact: 'Ibrahima Traoré', contactRole: 'DSI', dossier: 'DOS-2026-0142',
    date: '9 juin 2026', duration: '2:14', wordCount: 247, status: 'valide',
    iaConfidence: 94, summary: 'Transport frigorifique 40T/mois · DKR–ABJ · ~18M FCFA/mois',
  },
  {
    id: 'cr2', ref: 'CR-2026-0008', company: 'Bolloré Africa', initials: 'BA', color: '#8B5CF6', flag: '🇨🇲',
    contact: 'Pierre Mbarga', contactRole: 'Dir. Régional', dossier: 'DOS-2026-0138',
    date: '7 juin 2026', duration: '3:42', wordCount: 389, status: 'valide',
    iaConfidence: 97, summary: 'Logistique portuaire · Contrat-cadre 2026 · Décision 20 juin',
  },
  {
    id: 'cr3', ref: 'CR-2026-0007', company: 'Dakar Terminal', initials: 'DT', color: '#F59E0B', flag: '🇸🇳',
    contact: 'Ibrahima Sow', contactRole: 'Dir. Opérations', dossier: 'DOS-2026-0129',
    date: '5 juin 2026', duration: '1:58', wordCount: 192, status: 'brouillon',
    iaConfidence: 78, summary: 'Révision contrat manutention · Nouveaux tarifs H2 2026',
  },
  {
    id: 'cr4', ref: 'CR-2026-0006', company: 'SITARAIL', initials: 'SR', color: '#EF4444', flag: '🇨🇮',
    contact: 'Emmanuel Koffi', contactRole: 'DG Adjoint', dossier: 'DOS-2026-0121',
    date: '4 juin 2026', duration: '4:05', wordCount: 456, status: 'valide',
    iaConfidence: 91, summary: "Extension réseau ferroviaire · Appel d'offres · 38,5M FCFA",
  },
  {
    id: 'cr5', ref: 'CR-2026-0005', company: 'AngloGold Ashanti', initials: 'AG', color: '#84CC16', flag: '🇬🇭',
    contact: 'Christophe Mensah', contactRole: 'Supply Chain Mgr', dossier: 'DOS-2026-0117',
    date: '3 juin 2026', duration: '2:31', wordCount: 284, status: 'en_traitement',
    iaConfidence: 88, summary: 'Transport minerai · Route ABJ–Kumasi · 200T/semaine',
  },
  {
    id: 'cr6', ref: 'CR-2026-0004', company: 'Petroci Holding', initials: 'PH', color: '#22C55E', flag: '🇨🇮',
    contact: 'Jean-Baptiste Kouamé', contactRole: 'Dir. Achats', dossier: 'DOS-2026-0108',
    date: '1 juin 2026', duration: '2:48', wordCount: 312, status: 'valide',
    iaConfidence: 95, summary: 'Approvisionnement carburant · Pipeline DKR–ABJ · Q3 2026',
  },
  {
    id: 'cr7', ref: 'CR-2026-0003', company: 'Globex Abidjan', initials: 'GA', color: '#10B981', flag: '🇨🇮',
    contact: "Kouassi N'Goran", contactRole: 'Dir. Commercial', dossier: 'DOS-2026-0099',
    date: '28 mai 2026', duration: '1:22', wordCount: 148, status: 'rejete',
    iaConfidence: 62, summary: 'Proposition refusée · Budget insuffisant · Reconvenir Q4',
  },
  {
    id: 'cr8', ref: 'CR-2026-0002', company: 'Ciment de CI', initials: 'CI', color: '#F97316', flag: '🇨🇮',
    contact: 'Sékou Traoré', contactRole: 'Dir. Logistique', dossier: 'DOS-2026-0087',
    date: '25 mai 2026', duration: '3:15', wordCount: 341, status: 'valide',
    iaConfidence: 92, summary: 'Livraison béton · Chantier Bouaké · 19,5M FCFA',
  },
];

type TabKey = 'tous' | CRStatus;

export default function ComptesRendusPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  const [activeTab, setActiveTab] = useState<TabKey>('tous');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: MOCK_CRS.length };
    (['valide', 'brouillon', 'en_traitement', 'rejete'] as CRStatus[]).forEach(s => {
      c[s] = MOCK_CRS.filter(cr => cr.status === s).length;
    });
    return c;
  }, []);

  const filtered = useMemo(() => {
    let r = MOCK_CRS;
    if (activeTab !== 'tous') r = r.filter(cr => cr.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(cr =>
        cr.company.toLowerCase().includes(q) ||
        cr.contact.toLowerCase().includes(q) ||
        cr.dossier.toLowerCase().includes(q) ||
        cr.summary.toLowerCase().includes(q),
      );
    }
    return r;
  }, [activeTab, search]);

  const kpis = [
    { label: 'Total CRs', value: MOCK_CRS.length, sub: 'tous dossiers', icon: FileTextIcon },
    { label: 'Ce mois', value: 4, sub: 'juin 2026', icon: ClockIcon },
    { label: 'À valider', value: counts.brouillon + counts.en_traitement, sub: 'en attente', icon: WarningIcon },
    { label: 'Durée moy.', value: '2:38', sub: 'par enregistrement', icon: MicrophoneIcon },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'valide', label: 'Validés' },
    { key: 'brouillon', label: 'Brouillons' },
    { key: 'en_traitement', label: 'En traitement' },
    { key: 'rejete', label: 'Rejetés' },
  ];

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="p-4 sm:p-7 pb-16">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
            Comptes-rendus
          </h1>
          <p className="text-[var(--tx-3)] text-[12px] mt-0.5">
            Dashboard › Comptes-rendus
            <span className="mx-1 opacity-50">·</span>
            {dateStr}
          </p>
        </div>
        <button
          onClick={() => router.push(`/${locale}/page/comptes-rendus/nouveau`)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-[13px] font-semibold transition-opacity hover:opacity-90 flex-shrink-0 shadow-sm"
          style={{ background: 'var(--grad)', boxShadow: '0 2px 14px rgba(107,53,201,0.30)' }}
        >
          <MicrophoneIcon size={14} weight="bold" />
          Nouveau CR
        </button>
      </div>

      {/* ── KPI row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white border border-[var(--bd-def)] rounded-xl p-4 flex flex-col gap-1">
            <div className="text-[24px] font-bold text-[var(--tx-1)] font-display leading-none">{k.value}</div>
            <div className="text-[12px] font-semibold text-[var(--tx-2)] mt-1">{k.label}</div>
            <div className="text-[11px] text-[var(--tx-3)]">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs + search ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-0.5 bg-[var(--bg-sink)] rounded-lg p-1 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-[5px] rounded-md text-[12px] font-medium transition-all duration-150 whitespace-nowrap',
                activeTab === t.key
                  ? 'bg-white text-[var(--tx-1)] shadow-xs font-semibold'
                  : 'text-[var(--tx-3)] hover:text-[var(--tx-2)]',
              )}
            >
              {t.label}
              <span className={cn(
                'text-[10px] font-bold min-w-[16px] text-center',
                activeTab === t.key ? 'text-primary-500' : 'text-[var(--tx-3)]',
              )}>
                {t.key === 'tous' ? counts.tous : (counts[t.key] ?? 0)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative">
            <MagnifyingGlassIcon
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'h-8 pl-8 pr-3 rounded-lg border border-[var(--bd-def)] bg-white',
                'text-[13px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)]',
                'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
                'transition-colors w-44',
              )}
            />
          </div>
          <button className="h-8 px-3 rounded-lg border border-[var(--bd-def)] bg-white text-[12px] text-[var(--tx-2)] flex items-center gap-1.5 hover:bg-[var(--bg-sink)] transition-colors whitespace-nowrap">
            <FunnelIcon size={13} />
            Filtres
          </button>
        </div>
      </div>

      {/* ── List ──────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--bd-def)] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_56px] px-5 py-3 border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
          {['Société · Dossier', 'Contact', 'Date', 'Statut', ''].map((h, i) => (
            <span key={i} className="text-[11px] font-semibold text-[var(--tx-3)] uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <FileTextIcon size={38} className="text-[var(--tx-3)]" />
            <div>
              <p className="text-[14px] font-semibold text-[var(--tx-2)]">Aucun compte-rendu trouvé</p>
              <p className="text-[12px] text-[var(--tx-3)] mt-1">Modifiez vos filtres ou créez un nouveau CR</p>
            </div>
          </div>
        ) : (
          filtered.map((cr, idx) => {
            const s = STATUS_CFG[cr.status];
            const conf = cr.iaConfidence;
            const confColor = conf >= 90 ? '#10B981' : conf >= 75 ? '#F59E0B' : '#EF4444';
            return (
              <div
                key={cr.id}
                onClick={() => router.push(`/${locale}/page/comptes-rendus/nouveau`)}
                className={cn(
                  'sm:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_56px]',
                  'flex flex-col gap-2 sm:gap-0',
                  'items-start sm:items-center px-5 py-4 hover:bg-[var(--bg-sink)] transition-colors cursor-pointer',
                  idx < filtered.length - 1 && 'border-b border-[var(--bd-def)]',
                )}
              >
                {/* Company */}
                <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: cr.color }}
                  >
                    {cr.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-[var(--tx-1)] truncate">{cr.company}</span>
                      <span className="text-[13px]">{cr.flag}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-[var(--tx-3)] font-mono tracking-tight">{cr.dossier}</span>
                      <span className="text-[var(--tx-3)] opacity-40 text-[10px]">·</span>
                      <span className="text-[11px] text-[var(--tx-3)] truncate max-w-[200px]">{cr.summary}</span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <div className="text-[13px] text-[var(--tx-1)] font-medium">{cr.contact}</div>
                  <div className="text-[11px] text-[var(--tx-3)] mt-0.5">{cr.contactRole}</div>
                </div>

                {/* Date */}
                <div>
                  <div className="text-[12px] text-[var(--tx-2)]">{cr.date}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ClockIcon size={10} className="text-[var(--tx-3)]" />
                    <span className="text-[11px] text-[var(--tx-3)] font-mono">{cr.duration}</span>
                    <span className="text-[var(--tx-3)] opacity-40 text-[10px]">·</span>
                    <span className="text-[11px] text-[var(--tx-3)]">{cr.wordCount} mots</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[10px] font-bold w-fit"
                    style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                    {s.label}
                  </span>
                  <span
                    className="flex items-center gap-1 text-[10px] font-mono"
                    style={{ color: confColor }}
                  >
                    <SparkleIcon size={9} />
                    IA {conf}%
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    title="Télécharger"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bd-def)] hover:text-[var(--tx-1)] transition-colors"
                  >
                    <DownloadSimpleIcon size={13} />
                  </button>
                  <button
                    title="Ouvrir"
                    onClick={() => router.push(`/${locale}/page/comptes-rendus/nouveau`)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bd-def)] hover:text-[var(--tx-1)] transition-colors"
                  >
                    <CaretRightIcon size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-[12px] text-[var(--tx-3)]">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
