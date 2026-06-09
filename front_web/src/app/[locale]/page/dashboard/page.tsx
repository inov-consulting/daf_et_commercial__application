'use client';

import { useState } from 'react';
import {
  ArrowRight, Truck, User, TrendUp, Sparkle,
  Check, PencilSimple, X, ArrowUpRight, Warning,
  Export, Plus, Circle,
} from '@phosphor-icons/react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/* ── Mock data ───────────────────────────────────────────────────────── */

const VALIDATION_ITEMS = [
  {
    id: 1,
    model: 'sonnet' as const,
    type: 'COMPTE-RENDU VOCAL',
    title: 'Réunion découverte · Sonatrans SA',
    desc: 'Réunion du 29 mai 2026 avec M. Ibrahima Traoré (DSI). Besoins confirmés : transport frigorifique, 40T/mois DKR→ABJ. Budget estimé : 18M FCFA/mois.',
    meta: 'Généré il y a 12 min · dictée Sophie Lefèvre 3m42s · Sonnet 4.5',
  },
  {
    id: 2,
    model: 'haiku' as const,
    type: 'OFFRE COMMERCIALE',
    title: 'Proposition Globex Abidjan · 48 000 000 FCFA',
    desc: 'Offre transport multimodal 6 mois — 12 missions/mois DKR↔ABJ, camions 40T frigorifiques. Tarif préférentiel volume. Validité 30 jours.',
    meta: 'Généré il y a 28 min · brief Moussa Koné · Haiku 4.5',
  },
  {
    id: 3,
    model: 'haiku' as const,
    type: "FICHE PROSPECT · 7 CHAMPS EXTRAITS",
    title: "MTN Côte d'Ivoire · Awa Coulibaly, DG Adjoint",
    desc: "Extraction carte de visite. Entreprise, contact, rôle, email, téléphone, ville (Abidjan), secteur (Télécoms) pré-remplis. Vérifiez avant d'enregistrer.",
    meta: 'Généré il y a 1h · photo Oumar Ba · Haiku 4.5',
  },
];

const AGENTS = [
  { id: 1, name: 'Agent Extraction', model: 'Haiku 4.5', desc: 'Extraction carte de visite · Bolloré Ports CI', progress: 62, timeLeft: '~4s restantes', running: true },
  { id: 2, name: 'Agent CR Vocal', model: 'Sonnet 4.5', desc: 'Disponible · dernier CR il y a 12 min', progress: null, timeLeft: null, running: false },
];

const CHART_DATA = [
  { month: 'Jan', value: 40, current: false },
  { month: 'Fév', value: 48, current: false },
  { month: 'Mar', value: 52, current: false },
  { month: 'Avr', value: 60, current: false },
  { month: 'Mai', value: 79, current: true },
];

const MISSIONS = [
  { id: 'MIS-2026-0142', route: 'DKR → ABJ', company: 'Sonatrans SA · 40T', status: 'En cours', color: 'primary' as const },
  { id: 'MIS-2026-0141', route: 'DKR → LOM', company: 'Bolloré Ports', status: 'Planifiée', color: 'warning' as const },
  { id: 'MIS-2026-0140', route: 'ABJ → DLA', company: 'SITARAIL · Fret', status: 'Livrée', color: 'success' as const },
  { id: 'MIS-2026-0139', route: 'DKR → ABJ', company: 'Globex · Agro 2BT', status: 'En cours', color: 'primary' as const },
  { id: 'MIS-2026-0138', route: 'DKR → DLA', company: 'Niger Delta Oil', status: 'Livrée', color: 'success' as const },
];

const ALERTS = [
  { id: 1, color: '#10B981', bgColor: 'rgba(16,185,129,0.08)', type: 'success' as const, text: 'MIS-2026-0140 livré · SITARAIL', sub: 'SITARAIL · Confirmé à Douala · 13h47' },
  { id: 2, color: '#F59E0B', bgColor: 'rgba(245,158,11,0.08)', type: 'warning' as const, text: 'Retard · MIS-2026-0142 · ETA +48h', sub: 'Blocage douanier Abidjan · ETA +48h' },
  { id: 3, color: '#0E86E8', bgColor: 'rgba(14,134,232,0.08)', type: 'info' as const, text: 'IA · 3 éléments à valider', sub: '2 CR + 1 offre · règle R-05' },
];

const PIPELINE = [
  { label: 'Nouveau', value: 24, color: 'primary' as const },
  { label: 'Contacté', value: 15, color: 'accent' as const },
  { label: 'Qualifié', value: 8, color: 'secondary' as const },
  { label: 'Converti', value: 4, color: 'success' as const },
];

const ACTIVITY = [
  { id: 1, avatar: null, name: 'Claude Sonnet 4.5', tag: 'IA', text: 'CR vocal généré · Sonatrans SA', time: '09h14' },
  { id: 2, avatar: 'HK', name: 'Hawa Konaté', tag: 'Validé', text: 'Offre SITARAIL 32M · approuvée', time: '08h51' },
  { id: 3, avatar: null, name: 'Claude Haiku 4.5', tag: 'IA', text: 'Fiche extraite · MTN CI · 7 champs', time: '08h33' },
  { id: 4, avatar: 'MK', name: 'Moussa Koné', tag: 'Humain', text: 'Prospect qualifié · Globex Abidjan', time: 'Hier' },
];

/* ── Shared helpers ──────────────────────────────────────────────────── */

function ModelBadge({ model }: { model: 'sonnet' | 'haiku' }) {
  return (
    <span className={cn(
      'text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
      model === 'sonnet' ? 'bg-[var(--a100)] text-[var(--a600)]' : 'bg-[var(--p100)] text-[var(--p600)]',
    )}>
      {model === 'sonnet' ? 'Claude Sonnet' : 'Claude Haiku'}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] overflow-hidden', className)}>
      {children}
    </div>
  );
}

/* ── Sections ────────────────────────────────────────────────────────── */

const ENTITIES = [
  { key: 'all', label: 'Toutes', flag: null },
  { key: 'sn', label: 'Sénégal', flag: 'sn' },
  { key: 'ci', label: "Côte d'Ivoire", flag: 'ci' },
] as const;

type EntityKey = typeof ENTITIES[number]['key'];

function PageHeader() {
  const [entity, setEntity] = useState<EntityKey>('all');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-xl sm:text-2xl text-[var(--tx-1)]">Tableau de bord</h1>
        <p className="text-xs sm:text-sm text-[var(--tx-3)] mt-0.5">Dashboard · Vue DG · 29 mai 2026</p>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 bg-white border border-[var(--bd-def)] rounded-lg p-0.5 shadow-[var(--sh-xs)]">
          {ENTITIES.map(({ key, label, flag }) => (
            <button
              key={key}
              onClick={() => setEntity(key)}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors',
                entity === key
                  ? 'bg-[var(--p500)] text-white'
                  : 'text-[var(--tx-2)] hover:bg-[var(--bg-sink)]',
              )}
            >
              {flag && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://flagcdn.com/16x12/${flag}.png`}
                  width={16}
                  height={12}
                  alt={label}
                  className="rounded-[2px] flex-shrink-0"
                />
              )}
              <span className="hidden sm:inline">{label}</span>
              {!flag && <span className="sm:hidden">Toutes</span>}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
          <Export size={14} />
          <span className="hidden sm:inline ml-1.5">Exporter</span>
        </Button>
        <Button variant="gradient" style={{ background: 'var(--grad)' }} size="sm" className="text-xs sm:text-sm">
          <Plus size={14} />
          <span className="hidden sm:inline ml-1.5">Nouveau prospect</span>
        </Button>
      </div>
    </div>
  );
}

function IACenter() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] mb-4 sm:mb-6 overflow-hidden">
      <div className="h-[3px]" style={{ background: 'var(--grad)' }} />
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--bd-def)] bg-primary/5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad)' }}>
            <span className="text-white text-lg sm:text-xl leading-none">✦</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">Centre de Validation IA</p>
            <p className="text-[11px] sm:text-xs text-[var(--tx-3)] hidden sm:block">Claude a généré ces éléments — validation requise avant envoi client (R-05)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-white px-2 sm:px-2.5 py-1 rounded-full" style={{ background: 'var(--grad)' }}>
            <span className="text-[10px] sm:text-[11px] leading-none">✦</span> 3
          </span>
          <button className="text-xs sm:text-sm font-medium text-[var(--p500)] hover:underline hidden sm:flex items-center gap-1">
            Tout voir <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] divide-y lg:divide-y-0 lg:divide-x divide-[var(--bd-def)]">
        {/* Validation items */}
        <div className="bg-[var(--bg-sink)]">
          <p className="px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3 text-[9px] sm:text-[10px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase">
            En attente de votre validation
          </p>
          <div className="divide-y divide-[var(--bd-def)] border-t border-[var(--bd-def)] bg-white">
            {VALIDATION_ITEMS.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-3.5">
                <div className="flex items-center justify-between sm:block sm:flex-shrink-0 sm:w-[120px]">
                  <ModelBadge model={item.model} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--tx-3)] uppercase tracking-wide mb-0.5">{item.type}</p>
                  <p className="text-xs sm:text-sm font-semibold text-[var(--tx-1)] mb-0.5">{item.title}</p>
                  <p className="text-[11px] sm:text-xs text-[var(--tx-2)] line-clamp-2 mb-1">{item.desc}</p>
                  <p className="text-[9px] sm:text-[10px] text-[var(--tx-3)] truncate">{item.meta}</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto sm:ml-0">
                  <Button variant="success" size="xs" className="text-[10px] sm:text-xs">
                    <Check size={12} weight="bold" />
                    <span className="hidden sm:inline ml-1">Valider</span>
                  </Button>
                  <Button variant="ghost" size="xs" className="text-[10px] sm:text-xs">
                    <PencilSimple size={12} />
                    <span className="hidden sm:inline ml-1">Modifier</span>
                  </Button>
                  <Button variant="ghost" size="xs" iconOnly>
                    <X size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active agents */}
        <div className="p-4 sm:p-5 bg-[var(--bg-sink)]">
          <p className="text-[9px] sm:text-[10px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase mb-2 sm:mb-3">Agents actifs</p>
          <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4">
            {AGENTS.map(agent => (
              <div key={agent.id} className="p-2.5 sm:p-3 rounded-xl bg-white border border-[var(--bd-def)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    agent.running ? 'bg-[var(--p500)] animate-pulse' : 'bg-[var(--ok500)]',
                  )} />
                  <p className="text-xs sm:text-[13px] font-semibold text-[var(--tx-1)] flex-1 truncate">{agent.name}</p>
                  <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 bg-neutral-100 text-neutral-500">
                    {agent.model}
                  </span>
                </div>
                <p className={cn('text-[11px] sm:text-xs mb-2', agent.running ? 'text-[var(--tx-3)]' : 'text-success')}>{agent.desc}</p>
                {agent.progress !== null && (
                  <div className="flex items-center gap-2">
                    <Progress value={agent.progress} size="sm" className="flex-1" />
                    <span className="text-[9px] sm:text-[10px] text-[var(--tx-3)] whitespace-nowrap">{agent.timeLeft}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-[var(--bd-def)]">
              <p className="font-display font-bold text-xl sm:text-2xl text-primary-700">14</p>
              <p className="text-[8px] sm:text-[9px] text-[var(--tx-3)]">Tâches IA aujourd&apos;hui</p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-[var(--bd-def)]">
              <p className="font-display font-bold text-xl sm:text-2xl text-success">11</p>
              <p className="text-[8px] sm:text-[9px] text-[var(--tx-3)]">Validées par équipe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      <KpiCard label="Pipeline commercial · cumul 2026" value="463,5M" styleValue="text-gradient" icon={<ArrowRight size={17} />} trend="up" trendValue="+18%" accent="primary" sparkline={<Progress value={72} size="sm" shimmer={false} />} />
      <KpiCard label="+3 créées ce mois" value="18" icon={<Truck size={17} />} trend="warning" trendValue="4 urgentes" accent="primary" />
      <KpiCard label="8 nouveaux ce mois" value="47" icon={<User size={17} />} trend="up" trendValue="+12" accent="primary" />
      <KpiCard label="Objectif 40% · T3 2026" value="34%" icon={<TrendUp size={17} />} trend="up" trendValue="+2 pts" accent="primary" sparkline={<Progress value={34} max={40} size="sm" color="warning" shimmer={false} />} />
    </div>
  );
}

function RevenueChart() {
  const [hovered, setHovered] = useState<string | null>(null);
  const MAX = 80;
  const Y_TICKS = [80, 60, 40, 20, 0];

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-5 gap-3">
        <div>
          <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">Chiffre d&apos;affaires mensuel</p>
          <p className="text-[11px] sm:text-xs text-[var(--tx-3)]">Jan – Mai 2026 · Millions FCFA · Toutes entités</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-display font-bold text-lg sm:text-xl text-primary-700">279M</p>
          <p className="text-[11px] sm:text-xs text-[var(--tx-3)]">Total ytd 2026</p>
        </div>
      </div>

      <div className="pl-7 sm:pl-9 relative">
        {/* bars area with grid lines */}
        <div className="relative h-[120px] sm:h-[140px]">
          {Y_TICKS.map(v => {
            const topPct = ((MAX - v) / MAX) * 100;
            return (
              <div key={v}>
                <div
                  className="absolute left-0 right-0 border-t border-[var(--bd-def)]"
                  style={{ top: `${topPct}%` }}
                />
                <span
                  className="absolute text-[9px] sm:text-[10px] text-[var(--tx-3)] -translate-y-1/2 text-right"
                  style={{ top: `${topPct}%`, right: 'calc(100% + 6px)', width: '28px' }}
                >
                  {v === 0 ? '0' : `${v}M`}
                </span>
              </div>
            );
          })}

          <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2">
            {CHART_DATA.map(d => {
              const barPct = (d.value / MAX) * 100;
              return (
                <div
                  key={d.month}
                  className="flex-1 h-full flex items-end relative"
                  onMouseEnter={() => setHovered(d.month)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {hovered === d.month && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-white border border-[var(--bd-def)] rounded-xl shadow-[var(--sh-sm)] px-2 py-1 sm:px-2.5 sm:py-1.5 whitespace-nowrap"
                      style={{ bottom: `calc(${barPct}% + 8px)` }}
                    >
                      <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--tx-1)]">{d.month} 2026</p>
                      <p className="text-[9px] sm:text-[10px] text-[var(--tx-3)]">CA : {d.value}M FCFA</p>
                    </div>
                  )}
                  <div
                    className="w-full rounded-lg sm:rounded-xl transition-all duration-500 cursor-pointer"
                    style={{
                      height: `${barPct}%`,
                      background: d.current ? 'var(--grad)' : 'var(--p100)',
                      minHeight: 4,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* month labels */}
        <div className="flex gap-1.5 sm:gap-2 mt-2">
          {CHART_DATA.map(d => (
            <div key={d.month} className="flex-1 text-center">
              <span className={cn('text-[9px] sm:text-[10px]', d.current ? 'text-[var(--p500)] font-semibold' : 'text-[var(--tx-3)]')}>
                {d.month}{d.current ? ' ●' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 sm:mt-4 pt-3 border-t border-[var(--bd-def)] gap-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[var(--tx-3)]">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm inline-block" style={{ background: 'var(--grad)' }} />Mois en cours
          </span>
          <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[var(--tx-3)]">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-[var(--p100)] inline-block" />Mois précédents
          </span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-[var(--tx-3)]">Prévision juin : <span className="font-semibold text-primary-700">~68M</span></p>
      </div>
    </Card>
  );
}

function RecentMissions() {
  const statusColor: Record<string, 'primary' | 'warning' | 'success'> = {
    'En cours': 'primary', 'Planifiée': 'warning', 'Livrée': 'success',
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">Missions récentes</p>
        <button className="text-xs sm:text-sm font-medium text-[var(--p500)] hover:underline flex items-center gap-1">
          Voir tout <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="flex flex-col">
        {MISSIONS.map(m => (
          <div key={m.id} className="flex items-center gap-2 sm:gap-3 py-2 sm:py-2.5 border-b border-[var(--bd-def)] last:border-0">
            <Circle size={8} weight="fill" className={cn(
              'flex-shrink-0',
              m.color === 'primary' ? 'text-[var(--p500)]' : m.color === 'warning' ? 'text-[var(--warn500)]' : 'text-[var(--ok500)]',
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--tx-3)]">{m.id}</p>
              <p className="text-xs sm:text-sm font-medium text-[var(--tx-1)]">{m.route}</p>
              <p className="text-[11px] sm:text-xs text-[var(--tx-3)] truncate">{m.company}</p>
            </div>
            <Badge color={statusColor[m.status] ?? 'neutral'} variant="subtle" className="text-[10px] sm:text-xs flex-shrink-0">
              {m.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActiveAlerts() {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">Alertes actives</p>
        <Badge color="error" variant="subtle" className="text-[10px] sm:text-xs">3</Badge>
      </div>
      <div className="flex flex-col gap-2">
        {ALERTS.map(a => (
          <div
            key={a.id}
            className="flex items-start gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border-l-[3px]"
            style={{ borderLeftColor: a.color, backgroundColor: a.bgColor }}
          >
            <div className="flex-shrink-0 mt-0.5">
              {a.type === 'success' && <Check size={14} weight="bold" style={{ color: a.color }} />}
              {a.type === 'warning' && <Warning size={14} weight="fill" style={{ color: a.color }} />}
              {a.type === 'info' && <span className="text-lg sm:text-xl leading-none" style={{ color: a.color }} >✦</span>}
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[var(--tx-1)]">{a.text}</p>
              <p className="text-[11px] sm:text-xs text-[var(--tx-3)] mt-0.5">{a.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CommercialPipeline() {
  const MAX = 28;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">Pipeline commercial</p>
        <button className="text-xs sm:text-sm font-medium text-[var(--p500)] hover:underline flex items-center gap-1">
          Détail <ArrowRight size={13} />
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:gap-3">
        {PIPELINE.map(stage => (
          <div key={stage.label} className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-[var(--tx-2)] w-16 sm:w-20 flex-shrink-0">{stage.label}</span>
            <Progress value={stage.value} max={MAX} size="sm" color={stage.color} shimmer={false} className="flex-1" />
            <span className="text-xs sm:text-sm font-semibold text-[var(--tx-1)] w-5 text-right flex-shrink-0">{stage.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[var(--bd-def)] flex items-center justify-between">
        <p className="text-xs sm:text-sm text-[var(--tx-3)]">Valeur totale</p>
        <p className="font-display font-bold text-sm sm:text-base text-primary-700">463,5M FCFA</p>
      </div>
    </Card>
  );
}

function ActivityFeed() {
  const tagColor: Record<string, 'accent' | 'success' | 'neutral' | 'white'> = {
    'IA': 'white', 'Validé': 'success', 'Humain': 'neutral',
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="font-semibold text-sm sm:text-base text-[var(--tx-1)]">Activité · IA + Équipe</p>
        <p className="text-[10px] sm:text-[11px] text-[var(--tx-3)] flex-shrink-0">Aujourd&apos;hui</p>
      </div>
      <div className="flex flex-col gap-2 sm:gap-3">
        {ACTIVITY.map((a, idx) => (
          <div 
            key={a.id} 
            className={cn(
              "flex items-start gap-2 sm:gap-2.5 pt-3 sm:pt-4",
              idx !== 0 && "border-t border-[var(--bd-def)]"
            )}
          >
            {a.avatar ? (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad)' }}>
                <span className="text-white text-[9px] sm:text-[10px] font-bold">{a.avatar}</span>
              </div>
            ) : (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad)' }}>
                <span className="leading-none text-white text-sm">✦</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 flex-wrap">
                <span className="text-xs sm:text-[13px] font-medium text-[var(--tx-1)]">{a.name}</span>
                <Badge
                  color={tagColor[a.tag] ?? 'neutral'}
                  variant="subtle"
                  className={cn('text-[8px] sm:text-[9px] !px-1 !py-0.5 rounded-sm', a.tag === 'IA' && 'text-white', a.tag === 'Validé' && 'border border-success', a.tag === 'Humain' && 'border border-neutral-300')}
                  style={a.tag === 'IA' ? { background: 'var(--grad)' } : undefined}>
                  {a.tag}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--tx-2)] truncate">{a.text}</p>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--tx-3)] flex-shrink-0 mt-0.5">{a.time}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <PageHeader />
      <IACenter />
      <KpiRow />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3 sm:gap-4 mb-4 sm:mb-6">
        <RevenueChart />
        <RecentMissions />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <ActiveAlerts />
        <CommercialPipeline />
        <ActivityFeed />
      </div>
    </div>
  );
}