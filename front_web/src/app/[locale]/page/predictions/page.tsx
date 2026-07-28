'use client';

import { useState } from 'react';
import {
  ArrowsClockwiseIcon, CrosshairIcon, CheckCircleIcon, XCircleIcon,
  EyeIcon, BuildingsIcon, CalendarIcon, CaretDownIcon, CaretRightIcon,
  ClockIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionType = 'Renouvellement' | 'Upsell' | 'Nouveau besoin' | 'Opportunité';
type PredictionStatus = 'pending' | 'approved' | 'rejected';
type CountryFilter = 'all' | 'SN' | 'CI';

interface Prediction {
  id: string;
  type: ActionType;
  confidence: number;
  revenue: number;
  title: string;
  desc: string;
  reason: string;
  detail: string;
  entity: string;
  country: 'SN' | 'CI';
  date: string;
  consequence: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK: Prediction[] = [
  {
    id: 'p1',
    type: 'Renouvellement',
    confidence: 88,
    revenue: 650_000_000,
    title: 'Renouvellement contrat SOGETRANS CI',
    desc: "Le contrat annuel de SOGETRANS CI arrive à échéance dans 47 jours. L'analyse des échanges récents et du historique de paiement indique une probabilité élevée de renouvellement.",
    reason: "Hausse de 32 % du volume transport au dernier trimestre + 4 comptes-rendus positifs sur les 6 derniers mois.",
    detail: "Recommandation : contacter le directeur logistique avant le 20 du mois. Proposer une offre avec grille tarifaire fixe sur 18 mois et clause de révision semestrielle. Inclure un avenant pour les lignes Abidjan-Ouagadougou récemment activées.",
    entity: "SOGETRANS CI",
    country: 'CI',
    date: '2026-07-28',
    consequence: "Une opportunité Odoo sera créée et assignée au commercial responsable CI.",
  },
  {
    id: 'p2',
    type: 'Upsell',
    confidence: 72,
    revenue: 200_000_000,
    title: "Extension ligne TRANSIT SN vers l'intérieur",
    desc: "TRANSIT SN utilise actuellement uniquement les corridors côtiers. Les données de flotte et les comptes-rendus suggèrent un besoin non exprimé pour les lignes intérieures.",
    reason: "Demandes ad hoc identifiées dans 3 messageries clients + volume insuffisant sur corridors existants.",
    detail: "Proposer un pilote de 3 mois sur la ligne Dakar-Tambacounda avec tarif préférentiel. Le directeur commercial a indiqué lors du dernier CR une ouverture sur la diversification.",
    entity: "TRANSIT SN",
    country: 'SN',
    date: '2026-07-27',
    consequence: "Un lead Odoo sera créé dans le pipeline « Expansion services ».",
  },
  {
    id: 'p3',
    type: 'Nouveau besoin',
    confidence: 54,
    revenue: 150_000_000,
    title: "Stockage intermédiaire DAKAR CARGO",
    desc: "Les analyses de flux montrent des délais d'attente récurrents pour DAKAR CARGO au port. Un service de stockage intermédiaire pourrait répondre à un besoin latent.",
    reason: "Délai moyen d'attente > 48 h détecté sur 7 dossiers consécutifs.",
    detail: "Étude de faisabilité à lancer avec le responsable opérations. La zone franche de Dakar offre des emplacements disponibles à tarifs compétitifs.",
    entity: "DAKAR CARGO",
    country: 'SN',
    date: '2026-07-25',
    consequence: "Un prospect sera ajouté dans Portalis et une action de suivi créée.",
  },
  {
    id: 'p4',
    type: 'Opportunité',
    confidence: 41,
    revenue: 300_000_000,
    title: "Appel d'offres logistique ABIDJAN LOG",
    desc: "Signal détecté dans les échanges email : ABIDJAN LOG explore des alternatives à son prestataire actuel pour la saison de transit Q3.",
    reason: "Mention de « tarifs compétitifs » et « fiabilité » dans 2 échanges récents — signal faible mais exploitable.",
    detail: "Recommandation : prise de contact directe via le DG. Délai estimé de la décision : 3 semaines. Préparer un dossier de présentation personnalisé.",
    entity: "ABIDJAN LOG",
    country: 'CI',
    date: '2026-07-24',
    consequence: "Un prospect sera créé et une tâche de prospection assignée.",
  },
];

const SCHEDULER_HISTORY = [
  { label: "Aujourd'hui à 08:15", status: 'ok', count: 4 },
  { label: "Hier à 08:12",        status: 'ok', count: 3 },
  { label: "25 juil. à 08:19",   status: 'ok', count: 5 },
  { label: "24 juil. à 08:08",   status: 'warn', count: 2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRevenue(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace('.', ',')} Mds FCFA`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} M FCFA`;
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function confidenceTier(c: number): 'high' | 'mid' | 'low' {
  if (c >= 70) return 'high';
  if (c >= 40) return 'mid';
  return 'low';
}

const TYPE_COLORS: Record<ActionType, { dot: string; bg: string; text: string }> = {
  'Renouvellement': { dot: '#22C55E', bg: '#F0FDF4', text: '#15803D' },
  'Upsell':         { dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  'Nouveau besoin': { dot: '#6C4CE0', bg: '#EFEAFD', text: '#6C4CE0' },
  'Opportunité':    { dot: '#6B7280', bg: '#F9FAFB', text: '#4B5563' },
};

const CONFIDENCE_COLORS = {
  high: { bg: '#F0FDF4', text: '#15803D', label: 'Élevée' },
  mid:  { bg: '#FFFBEB', text: '#B45309', label: 'Modérée' },
  low:  { bg: '#F9FAFB', text: '#4B5563', label: 'Faible' },
};

// ── Action Card ───────────────────────────────────────────────────────────────

interface ActionCardProps {
  prediction: Prediction;
  status: PredictionStatus;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function ActionCard({ prediction, status, onApprove, onReject }: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);

  const tier = confidenceTier(prediction.confidence);
  const typeColors = TYPE_COLORS[prediction.type];
  const confColors = CONFIDENCE_COLORS[tier];

  const isResolved = status !== 'pending';

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isResolved && status === 'rejected' && 'opacity-50',
      )}
      style={{ borderColor: 'var(--bd-def)', background: isResolved && status === 'approved' ? '#F0FDF4' : 'var(--bg-surf)' }}
    >
      <div className="p-4">
        {/* Top row: type + confidence + revenue */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {/* type badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: typeColors.bg, color: typeColors.text }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: typeColors.dot }} />
            {prediction.type}
          </span>

          {/* confidence pill */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: confColors.bg, color: confColors.text }}
          >
            {prediction.confidence}% — {confColors.label}
          </span>

          {/* revenue */}
          <span className="ml-auto text-[12px] font-semibold" style={{ color: 'var(--p500)' }}>
            {fmtRevenue(prediction.revenue)}
          </span>
        </div>

        {/* Title */}
        <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--tx-1)' }}>
          {prediction.title}
        </div>

        {/* Desc */}
        <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'var(--tx-2)' }}>
          {prediction.desc}
        </p>

        {/* Reason block */}
        <div
          className="rounded-lg px-3 py-2 text-[12px] italic mb-3"
          style={{
            borderLeft: '3px solid var(--p500)',
            background: 'var(--bg-sink)',
            color: 'var(--tx-2)',
          }}
        >
          <span className="font-semibold not-italic" style={{ color: 'var(--tx-1)' }}>Raison : </span>
          {prediction.reason}
        </div>

        {/* Detail toggle */}
        <button
          className="flex items-center gap-1 text-[11px] font-medium mb-3 transition-colors hover:underline"
          style={{ color: 'var(--p500)' }}
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? <CaretDownIcon size={13} weight="bold" /> : <CaretRightIcon size={13} weight="bold" />}
          {expanded ? 'Masquer le détail' : 'Voir le détail complet'}
        </button>

        {expanded && (
          <div
            className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed mb-3"
            style={{ background: 'var(--bg-sink)', color: 'var(--tx-2)', border: '1px solid var(--bd-def)' }}
          >
            {prediction.detail}
          </div>
        )}

        {/* Entity + date row */}
        <div className="flex items-center gap-3 text-[11px] mb-4" style={{ color: 'var(--tx-3)' }}>
          <span className="flex items-center gap-1">
            <BuildingsIcon size={12} />
            {prediction.entity}
          </span>
          <span className="flex items-center gap-1">
            <CalendarIcon size={12} />
            {new Date(prediction.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
          </span>
        </div>

        {/* Status or buttons */}
        {isResolved ? (
          <div className="flex items-center gap-3">
            {status === 'approved' ? (
              <>
                <span
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: '#DCFCE7', color: '#15803D' }}
                >
                  <CheckCircleIcon size={14} weight="fill" />
                  Approuvée
                </span>
                <span className="text-[11px] italic" style={{ color: 'var(--tx-3)' }}>
                  {prediction.consequence}
                </span>
              </>
            ) : (
              <span
                className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: '#FEE2E2', color: '#DC2626' }}
              >
                <XCircleIcon size={14} weight="fill" />
                Rejetée
              </span>
            )}
          </div>
        ) : confirming ? (
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{ background: confirming === 'approve' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${confirming === 'approve' ? '#BBF7D0' : '#FECACA'}` }}
          >
            <span className="text-[12px] font-medium" style={{ color: confirming === 'approve' ? '#15803D' : '#DC2626' }}>
              {confirming === 'approve' ? 'Confirmer l\'approbation ?' : 'Confirmer le rejet ?'}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors"
                style={{
                  background: confirming === 'approve' ? '#22C55E' : '#EF4444',
                  color: '#fff',
                }}
                onClick={() => {
                  if (confirming === 'approve') onApprove(prediction.id);
                  else onReject(prediction.id);
                  setConfirming(null);
                }}
              >
                Confirmer
              </button>
              <button
                className="px-3 py-1 rounded-lg text-[12px] font-medium transition-colors hover:bg-[var(--bg-sink)]"
                style={{ color: 'var(--tx-2)' }}
                onClick={() => setConfirming(null)}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-[var(--bg-sink)]"
              style={{ border: '1px solid var(--bd-def)', color: 'var(--tx-2)' }}
              onClick={() => setExpanded(true)}
            >
              <EyeIcon size={13} />
              Détails
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
              style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
              onClick={() => setConfirming('approve')}
            >
              <CheckCircleIcon size={13} weight="fill" />
              Approuver
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              onClick={() => setConfirming('reject')}
            >
              <XCircleIcon size={13} weight="fill" />
              Rejeter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PredictionsPage() {
  const [filter, setFilter] = useState<CountryFilter>('all');
  const [statuses, setStatuses] = useState<Record<string, PredictionStatus>>({
    p1: 'pending', p2: 'pending', p3: 'pending', p4: 'pending',
  });
  const [refreshing, setRefreshing] = useState(false);

  const predictions = MOCK.filter(p =>
    filter === 'all' ? true : p.country === filter,
  );

  const pendingCount = Object.values(statuses).filter(s => s === 'pending').length;
  const totalRevenue = MOCK.reduce((acc, p) => acc + p.revenue, 0);
  const avgConfidence = Math.round(MOCK.reduce((acc, p) => acc + p.confidence, 0) / MOCK.length);

  function handleApprove(id: string) {
    setStatuses(s => ({ ...s, [id]: 'approved' }));
  }

  function handleReject(id: string) {
    setStatuses(s => ({ ...s, [id]: 'rejected' }));
  }

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }

  const FILTERS: { key: CountryFilter; label: string; flag?: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'SN',  label: 'Sénégal',      flag: '🇸🇳' },
    { key: 'CI',  label: "Côte d'Ivoire", flag: '🇨🇮' },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CrosshairIcon size={20} weight="fill" style={{ color: 'var(--p500)' }} />
              <h1 className="text-[18px] font-bold" style={{ color: 'var(--tx-1)' }}>
                Prédiction Agent Commercial
              </h1>
            </div>
            <p className="text-[13px]" style={{ color: 'var(--tx-2)' }}>
              Agent prédictif DCom — anticipe les besoins clients et propose des actions
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Country filter */}
            <div
              className="flex items-center p-0.5 rounded-lg"
              style={{ background: 'var(--bg-sink)', border: '1px solid var(--bd-def)' }}
            >
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
                    filter === f.key
                      ? 'bg-white shadow-sm text-[var(--tx-1)]'
                      : 'text-[var(--tx-3)] hover:text-[var(--tx-2)]',
                  )}
                  style={filter === f.key ? { border: '1px solid var(--bd-def)' } : {}}
                >
                  {f.flag && <span>{f.flag}</span>}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Actualiser */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-70"
              style={{ background: 'var(--grad)' }}
            >
              <ArrowsClockwiseIcon size={15} weight="bold" className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Clients analysés', value: `${MOCK.length}`, sub: 'entreprises actives', color: 'var(--p500)' },
            { label: 'CA potentiel identifié', value: fmtRevenue(totalRevenue), sub: 'toutes prédictions', color: '#6C4CE0' },
            { label: 'Confiance moyenne', value: `${avgConfidence} %`, sub: `sur ${MOCK.length} prédictions`, color: '#F59E0B' },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-surf)', border: '1px solid var(--bd-def)' }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx-3)' }}>
                {card.label}
              </div>
              <div className="text-[22px] font-bold mb-0.5" style={{ color: card.color }}>
                {card.value}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                {card.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── Main content: agent card + side panel ──────────────────── */}
        <div className="flex gap-5 items-start">

          {/* Left: agent card */}
          <div className="flex-1 min-w-0 rounded-xl" style={{ background: 'var(--bg-surf)', border: '1px solid var(--bd-def)' }}>
            {/* Card header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--bd-def)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--grad)' }}
                >
                  <CrosshairIcon size={16} weight="fill" className="text-white" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--tx-1)' }}>
                    Agent Prédictif DCom
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                    Propositions générées automatiquement
                  </div>
                </div>
              </div>
              {pendingCount > 0 && (
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: '#EFEAFD', color: '#6C4CE0' }}
                >
                  +{pendingCount} en attente
                </span>
              )}
            </div>

            {/* Action cards list */}
            <div className="p-4 space-y-3">
              {predictions.length === 0 ? (
                <div className="py-10 text-center text-[13px]" style={{ color: 'var(--tx-3)' }}>
                  Aucune prédiction pour ce filtre.
                </div>
              ) : (
                predictions.map(p => (
                  <ActionCard
                    key={p.id}
                    prediction={p}
                    status={statuses[p.id]}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: side panel */}
          <div className="w-[260px] flex-shrink-0 space-y-4">

            {/* Scheduler IA */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-surf)', border: '1px solid var(--bd-def)' }}
            >
              <div
                className="flex items-center gap-2 mb-3 pb-3"
                style={{ borderBottom: '1px solid var(--bd-def)' }}
              >
                <ClockIcon size={15} style={{ color: 'var(--p500)' }} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--tx-1)' }}>
                  Scheduler IA
                </span>
              </div>

              <div className="text-[11px] uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--tx-3)' }}>
                Dernier passage
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-[12px] font-medium" style={{ color: 'var(--tx-1)' }}>
                  Aujourd&apos;hui à 08:15
                </span>
              </div>

              <div className="text-[11px] uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--tx-3)' }}>
                Historique
              </div>
              <div className="space-y-2">
                {SCHEDULER_HISTORY.map((h, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: 'var(--tx-2)' }}>{h.label}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: h.status === 'ok' ? '#F0FDF4' : '#FFFBEB',
                        color: h.status === 'ok' ? '#15803D' : '#B45309',
                      }}
                    >
                      {h.count} prop.
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Types de propositions */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-surf)', border: '1px solid var(--bd-def)' }}
            >
              <div
                className="text-[13px] font-semibold mb-3 pb-3"
                style={{ color: 'var(--tx-1)', borderBottom: '1px solid var(--bd-def)' }}
              >
                Types de propositions
              </div>
              <div className="space-y-2.5">
                {(Object.entries(TYPE_COLORS) as [ActionType, typeof TYPE_COLORS[ActionType]][]).map(([type, c]) => {
                  const count = MOCK.filter(p => p.type === type).length;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                        <span className="text-[12px]" style={{ color: 'var(--tx-2)' }}>{type}</span>
                      </div>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: c.bg, color: c.text }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
