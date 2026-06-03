'use client';

import {
  ArrowRight, Truck, UserCircle, TrendUp, Sparkle,
  Check, PencilSimple, X, ArrowUpRight, Warning,
  Export, Plus, Circle,
} from '@phosphor-icons/react';
import { KpiCard }  from '@/components/ui/kpi-card';
import { Badge }    from '@/components/ui/badge';
import { Button }   from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn }       from '@/lib/utils';

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
  { id: 1, name: 'Agent Extraction', model: 'Haiku 4.5', desc: 'Extraction carte de visite · Bolloré Ports CI', progress: 62, timeLeft: '~4s restantes', running: true  },
  { id: 2, name: 'Agent CR Vocal',   model: 'Sonnet 4.5', desc: 'Disponible · dernier CR il y a 12 min',         progress: null, timeLeft: null,           running: false },
];

const CHART_DATA = [
  { month: 'Jan', value: 40, current: false },
  { month: 'Fév', value: 48, current: false },
  { month: 'Mar', value: 52, current: false },
  { month: 'Avr', value: 60, current: false },
  { month: 'Mai', value: 79, current: true  },
];

const MISSIONS = [
  { id: 'MIS-2026-0142', route: 'DKR → ABJ', company: 'Sonatrans SA · 40T', status: 'En cours',  color: 'primary' as const },
  { id: 'MIS-2026-0141', route: 'DKR → LOM', company: 'Bolloré Ports',      status: 'Planifiée', color: 'warning' as const },
  { id: 'MIS-2026-0140', route: 'ABJ → DLA', company: 'SITARAIL · Fret',    status: 'Livrée',    color: 'success' as const },
  { id: 'MIS-2026-0139', route: 'DKR → ABJ', company: 'Globex · Agro 2BT',  status: 'En cours',  color: 'primary' as const },
  { id: 'MIS-2026-0138', route: 'DKR → DLA', company: 'Niger Delta Oil',    status: 'Livrée',    color: 'success' as const },
];

const ALERTS = [
  { id: 1, color: '#10B981', text: 'MIS-2026-0140 livré · SITARAIL',    sub: 'Confirmé à Douala · 13h47' },
  { id: 2, color: '#F59E0B', text: 'Retard · MIS-2026-0142 · ETA +48h', sub: 'Blocage douanier Abidjan · ETA +48h' },
  { id: 3, color: '#0E86E8', text: 'IA · 3 éléments à valider',         sub: '2 CR + 1 offre · règle R-05' },
];

const PIPELINE = [
  { label: 'Nouveau',  value: 24, color: 'primary' as const },
  { label: 'Contacté', value: 15, color: 'primary' as const },
  { label: 'Qualifié', value: 8,  color: 'primary' as const },
  { label: 'Converti', value: 4,  color: 'success' as const },
];

const ACTIVITY = [
  { id: 1, avatar: null, name: 'Claude Sonnet 4.5', tag: 'IA',     text: 'CR vocal généré · Sonatrans SA',       time: '09h14' },
  { id: 2, avatar: 'HK', name: 'Hawa Konaté',       tag: 'Validé', text: 'Offre SITARAIL 32M · approuvée',       time: '08h51' },
  { id: 3, avatar: null, name: 'Claude Haiku 4.5',  tag: 'IA',     text: 'Fiche extraite · MTN CI · 7 champs',   time: '08h33' },
  { id: 4, avatar: 'MK', name: 'Moussa Koné',       tag: 'Humain', text: 'Prospect qualifié · Globex Abidjan',   time: 'Hier'  },
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

function PageHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--tx-1)]">Tableau de bord</h1>
        <p className="text-sm text-[var(--tx-3)] mt-0.5">Dashboard · Vue DG · 29 mai 2026</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 bg-white border border-[var(--bd-def)] rounded-lg p-0.5 shadow-[var(--sh-xs)]">
          <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--p500)] text-white">Toutes entités</button>
          <button className="px-3 py-1.5 rounded-md text-sm text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors">🇸🇳 Sénégal</button>
          <button className="px-3 py-1.5 rounded-md text-sm text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors">🇨🇮 Côte d&apos;Ivoire</button>
        </div>
        <Button variant="ghost" size="sm"><Export size={14} />Exporter</Button>
        <Button variant="primary" size="sm"><Plus size={14} />Nouveau prospect</Button>
      </div>
    </div>
  );
}

function IACenter() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] mb-6 overflow-hidden">
      <div className="h-[3px]" style={{ background: 'var(--grad)' }} />
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--bd-def)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad)' }}>
            <Sparkle size={18} weight="fill" className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-[var(--tx-1)]">Centre de Validation IA</p>
            <p className="text-xs text-[var(--tx-3)]">Claude a généré ces éléments — validation requise avant envoi client (R-05)</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <Badge color="accent" variant="subtle">+ 3 éléments</Badge>
          <button className="text-sm font-medium text-[var(--p500)] hover:underline flex items-center gap-1">
            Tout voir <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] divide-y lg:divide-y-0 lg:divide-x divide-[var(--bd-def)]">
        {/* Validation items */}
        <div className="p-5">
          <p className="text-[10px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase mb-3">
            En attente de votre validation
          </p>
          <div className="flex flex-col gap-2.5">
            {VALIDATION_ITEMS.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-sink)]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <ModelBadge model={item.model} />
                    <span className="text-[10px] font-semibold text-[var(--tx-3)] uppercase tracking-wide">{item.type}</span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--tx-1)] mb-0.5">{item.title}</p>
                  <p className="text-xs text-[var(--tx-2)] line-clamp-2 mb-1">{item.desc}</p>
                  <p className="text-[10px] text-[var(--tx-3)]">{item.meta}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="success" size="xs"><Check size={12} weight="bold" />Valider</Button>
                  <Button variant="ghost"   size="xs"><PencilSimple size={12} />Modifier</Button>
                  <button className="w-6 h-6 rounded flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bd-def)] hover:text-[var(--tx-1)] transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active agents */}
        <div className="p-5">
          <p className="text-[10px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase mb-3">Agents actifs</p>
          <div className="flex flex-col gap-3 mb-4">
            {AGENTS.map(agent => (
              <div key={agent.id} className="p-3 rounded-xl border border-[var(--bd-def)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    agent.running ? 'bg-[var(--p500)] animate-pulse' : 'bg-[var(--ok500)]',
                  )} />
                  <p className="text-[13px] font-semibold text-[var(--tx-1)] flex-1 truncate">{agent.name}</p>
                  <span className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                    agent.model.startsWith('Sonnet') ? 'bg-[var(--a100)] text-[var(--a600)]' : 'bg-[var(--p100)] text-[var(--p600)]',
                  )}>{agent.model}</span>
                </div>
                <p className="text-xs text-[var(--tx-3)] mb-2">{agent.desc}</p>
                {agent.progress !== null && (
                  <div className="flex items-center gap-2">
                    <Progress value={agent.progress} size="sm" className="flex-1" />
                    <span className="text-[10px] text-[var(--tx-3)] whitespace-nowrap">{agent.timeLeft}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--bg-sink)] text-center">
              <p className="font-display font-bold text-2xl text-[var(--tx-1)]">14</p>
              <p className="text-[11px] text-[var(--tx-3)]">Tâches IA aujourd&apos;hui</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-sink)] text-center">
              <p className="font-display font-bold text-2xl text-[var(--tx-1)]">11</p>
              <p className="text-[11px] text-[var(--tx-3)]">Validées par équipe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiRow() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <KpiCard label="Pipeline commercial · cumul 2026" value="463,5M" icon={<ArrowRight size={17} />} trend="up"      trendValue="+18%"      accent="primary"   sparkline={<Progress value={72} size="sm" shimmer={false} />} />
      <KpiCard label="+3 créées ce mois"                value="18"     icon={<Truck       size={17} />} trend="warning" trendValue="4 urgentes" accent="warning"   />
      <KpiCard label="8 nouveaux ce mois"               value="47"     icon={<UserCircle  size={17} />} trend="up"      trendValue="+12"        accent="success"   />
      <KpiCard label="Objectif 40% · T3 2026"           value="34%"    icon={<TrendUp     size={17} />} trend="neutral" trendValue="+2 pts"     accent="secondary" sparkline={<Progress value={34} max={40} size="sm" color="warning" shimmer={false} />} />
    </div>
  );
}

function RevenueChart() {
  const MAX = 90;
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-[var(--tx-1)]">Chiffre d&apos;affaires mensuel</p>
          <p className="text-xs text-[var(--tx-3)]">Jan – Mai 2026 · Millions FCFA · Toutes entités</p>
        </div>
        <div className="text-right">
          <p className="font-display font-bold text-xl text-[var(--tx-1)]">279M</p>
          <p className="text-xs text-[var(--tx-3)]">Total ytd 2026</p>
        </div>
      </div>
      <div className="flex items-end gap-2.5 h-[120px]">
        {CHART_DATA.map(d => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5 h-full">
            <div className="flex-1 w-full flex flex-col justify-end">
              <div
                className="w-full rounded-t-[4px] transition-all duration-300"
                style={{
                  height: `${(d.value / MAX) * 100}%`,
                  background: d.current ? 'var(--p500)' : 'var(--p100)',
                  minHeight: 4,
                }}
              />
            </div>
            <span className={cn('text-[10px]', d.current ? 'text-[var(--p500)] font-semibold' : 'text-[var(--tx-3)]')}>
              {d.month}{d.current ? ' ●' : ''}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--bd-def)]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--tx-3)]">
            <span className="w-3 h-2 rounded-sm bg-[var(--p500)] inline-block" />Mois en cours
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--tx-3)]">
            <span className="w-3 h-2 rounded-sm bg-[var(--p100)] inline-block" />Mois précédents
          </span>
        </div>
        <p className="text-[11px] text-[var(--tx-3)]">Prévision juin : <span className="font-semibold text-[var(--tx-2)]">~68M</span></p>
      </div>
    </Card>
  );
}

function RecentMissions() {
  const statusColor: Record<string, 'primary' | 'warning' | 'success'> = {
    'En cours': 'primary', 'Planifiée': 'warning', 'Livrée': 'success',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-[var(--tx-1)]">Missions récentes</p>
        <button className="text-sm font-medium text-[var(--p500)] hover:underline flex items-center gap-1">
          Voir tout <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="flex flex-col">
        {MISSIONS.map(m => (
          <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--bd-def)] last:border-0">
            <Circle size={8} weight="fill" className={cn(
              'flex-shrink-0',
              m.color === 'primary' ? 'text-[var(--p500)]' : m.color === 'warning' ? 'text-[var(--warn500)]' : 'text-[var(--ok500)]',
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--tx-3)]">{m.id}</p>
              <p className="text-sm font-medium text-[var(--tx-1)]">{m.route}</p>
              <p className="text-xs text-[var(--tx-3)] truncate">{m.company}</p>
            </div>
            <Badge color={statusColor[m.status] ?? 'neutral'} variant="subtle" className="flex-shrink-0">{m.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActiveAlerts() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-[var(--tx-1)]">Alertes actives</p>
        <Badge color="error" variant="solid">3</Badge>
      </div>
      <div className="flex flex-col gap-2.5">
        {ALERTS.map(a => (
          <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-sink)]">
            <Warning size={15} weight="fill" style={{ color: a.color }} className="flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--tx-1)]">{a.text}</p>
              <p className="text-xs text-[var(--tx-3)] mt-0.5">{a.sub}</p>
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
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-[var(--tx-1)]">Pipeline commercial</p>
        <button className="text-sm font-medium text-[var(--p500)] hover:underline flex items-center gap-1">
          Détail <ArrowRight size={13} />
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {PIPELINE.map(stage => (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="text-sm text-[var(--tx-2)] w-20 flex-shrink-0">{stage.label}</span>
            <Progress value={stage.value} max={MAX} size="sm" color={stage.color} shimmer={false} className="flex-1" />
            <span className="text-sm font-semibold text-[var(--tx-1)] w-5 text-right flex-shrink-0">{stage.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--bd-def)] flex items-center justify-between">
        <p className="text-sm text-[var(--tx-3)]">Valeur totale</p>
        <p className="font-display font-bold text-[var(--tx-1)]">463,5M FCFA</p>
      </div>
    </Card>
  );
}

function ActivityFeed() {
  const tagColor: Record<string, 'accent' | 'success' | 'neutral'> = {
    'IA': 'accent', 'Validé': 'success', 'Humain': 'neutral',
  };
  return (
    <Card className="p-5">
      <p className="font-semibold text-[var(--tx-1)] mb-4">Activité · IA + Équipe</p>
      <div className="flex flex-col gap-3">
        {ACTIVITY.map(a => (
          <div key={a.id} className="flex items-start gap-2.5">
            {a.avatar ? (
              <div className="w-7 h-7 rounded-full bg-[#6B35C9] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">{a.avatar}</span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad)' }}>
                <Sparkle size={13} weight="fill" className="text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-[13px] font-medium text-[var(--tx-1)]">{a.name}</span>
                <Badge color={tagColor[a.tag] ?? 'neutral'} variant="subtle" className="text-[9px] !px-1.5 !py-0">{a.tag}</Badge>
              </div>
              <p className="text-xs text-[var(--tx-2)] truncate">{a.text}</p>
            </div>
            <span className="text-[11px] text-[var(--tx-3)] flex-shrink-0 mt-0.5">{a.time}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <PageHeader />
      <IACenter />
      <KpiRow />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 mb-6">
        <RevenueChart />
        <RecentMissions />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActiveAlerts />
        <CommercialPipeline />
        <ActivityFeed />
      </div>
    </div>
  );
}
