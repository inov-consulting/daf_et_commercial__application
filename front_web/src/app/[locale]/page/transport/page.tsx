'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  MagnifyingGlassIcon, PlusIcon, ArrowsClockwiseIcon,
  WarningIcon, DownloadSimpleIcon, CircleNotchIcon, FolderOpenIcon,
  ArrowRightIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import {
  type DossierTransport, type DossierListResponse,
  MODE_CONFIG, STATUT_CONFIG,
  type DossierEntite,
} from '@/types/transport_type';
import { cn } from '@/lib/utils';
import Image from 'next/image';

/* ── Sub-components ───────────────────────────────────────────────────────── */

function MiniStepper({ etape }: { etape: string }) {
  const steps = ['A', 'B', 'C', 'D', 'E'];
  const ci = steps.indexOf(etape);
  return (
    <div className="flex items-center gap-[3px]">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-[3px]">
          <div
            className={cn(
              'w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-[10px] font-bold font-display',
              i < ci ? 'bg-[#ECFDF5] text-[#059669]' :
                i === ci ? 'text-white' :
                  'bg-[#F0F4F8] text-[#9EB0C4]',
            )}
            style={i === ci ? { background: 'linear-gradient(135deg,#0E86E8,#6B35C9)' } : {}}
          >
            {i < ci ? '✓' : s}
          </div>
          {i < 4 && (
            <div className={cn('w-[6px] h-[2px] rounded-[1px]', i < ci ? 'bg-[#10B981]' : 'bg-[var(--bd-def)]')} />
          )}
        </div>
      ))}
    </div>
  );
}

function MargeBadge({ marge, isEstim }: { marge: number | null; isEstim: boolean }) {
  if (marge === null) return <span className="text-[12px] text-[var(--tx-3)] font-medium">–</span>;
  const [bg, color] =
    marge >= 20 ? ['#ECFDF5', '#059669'] :
      marge >= 10 ? ['#FFFBEB', '#D97706'] :
        ['#FEF2F2', '#DC2626'];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[12px] font-bold font-display"
      style={{ background: bg, color, opacity: isEstim ? 0.8 : 1 }}
    >
      {marge.toFixed(1)}%{isEstim ? ' est.' : ''}
    </span>
  );
}

function fmtMontant(xof: number): string {
  if (xof >= 1_000_000) return `${(xof / 1_000_000).toFixed(1)} M`;
  if (xof >= 1_000) return `${(xof / 1_000).toFixed(0)} K`;
  return String(xof);
}

/* ── Types locaux ─────────────────────────────────────────────────────────── */

type PillFilter = 'all' | 'actif' | 'alerte' | 'cloture';
type EntityFilter = 'all' | DossierEntite;
type EntityKey = 'all' | 'SN' | 'CI';

interface EntityConfig {
  key: EntityKey;
  label: string;
  flag: string | null;
}

const ENTITIES: EntityConfig[] = [
  { key: 'all', label: 'Consolidé', flag: null },
  { key: 'SN', label: 'Sénégal', flag: 'sn' },
  { key: 'CI', label: "Côte d'Ivoire", flag: 'ci' },
];

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function TransportPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  const [dossiers, setDossiers] = useState<DossierTransport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [pill, setPill] = useState<PillFilter>('all');
  const [entity, setEntity] = useState<EntityFilter>('all');

  /* ── Fetch ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await GetData<DossierListResponse>({
        url: ApiRoutes.TRANSPORT_DOSSIERS,
        protected: true,
      });
      if (cancelled) return;
      setLoading(false);
      if (res.ok && res.data) setDossiers(res.data.items);
      else setError(res.error ?? 'Erreur de chargement');
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Computed ── */
  const filtered = useMemo(() => {
    let list = dossiers;
    if (entity !== 'all') list = list.filter(d => d.entite === entity);
    if (pill === 'actif') list = list.filter(d => d.statut !== 'clos');
    if (pill === 'alerte') list = list.filter(d => !!d.alerte);
    if (pill === 'cloture') list = list.filter(d => d.statut === 'clos');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.reference.toLowerCase().includes(q) ||
        d.client_name.toLowerCase().includes(q) ||
        d.trajet.toLowerCase().includes(q),
      );
    }
    return list;
  }, [dossiers, entity, pill, search]);

  const kpi = useMemo(() => {
    const active = dossiers.filter(d => d.statut !== 'clos');
    const withMarge = active.filter(d => d.marge_est !== null || d.marge_reel !== null);
    const margeSum = withMarge.reduce((s, d) => s + (d.marge_reel ?? d.marge_est ?? 0), 0);
    return {
      actifs: active.length,
      caPipeline: active.reduce((s, d) => s + d.ca_estime, 0),
      margeAvg: withMarge.length ? margeSum / withMarge.length : null,
      alertes: dossiers.filter(d => !!d.alerte).length,
    };
  }, [dossiers]);

  const closCount = dossiers.filter(d => d.statut === 'clos').length;
  const activeCount = dossiers.filter(d => d.statut !== 'clos').length;
  const alertCount = dossiers.filter(d => !!d.alerte).length;

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ── Render ── */
  return (
    <div className="p-5 sm:p-7 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-[24px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
            Dossiers transport
          </h1>
          <p className="text-[var(--tx-3)] text-[12px] mt-0.5">Finance · Dossiers · {dateStr}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Entity toggle */}
          <div className="flex border border-[var(--bd-def)] rounded-lg overflow-hidden bg-white shadow-sm">
            {ENTITIES.map(({ key, label, flag }) => (
              <button
                key={key}
                onClick={() => setEntity(key)}
                className={cn(
                  'px-2.5 sm:px-3 h-[32px] text-[11px] sm:text-[12px] font-medium border-r border-[var(--bd-def)] last:border-r-0 flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap',
                  entity === key
                    ? 'bg-[#EBF5FD] text-[#085499] font-semibold'
                    : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)]',
                )}
              >
                {flag ? (
                  <Image
                    src={`https://flagcdn.com/16x12/${flag}.png`}
                    width={16}
                    height={12}
                    alt={label}
                    className="rounded-[2px] flex-shrink-0"
                    unoptimized
                  />
                ) : null}
                <span>{label}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm">
            <DownloadSimpleIcon size={14} /> Exporter
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => router.push(`/${locale}/page/transport/nouveau`)}
            style={{ boxShadow: '0 2px 8px rgba(107,53,201,0.2)' }}
          >
            <PlusIcon size={14} weight="bold" /> Nouveau dossier
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="⊞ Dossiers actifs"
          value={loading ? '–' : String(kpi.actifs)}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#0E86E8,#6B35C9)"
          trendValue={`${closCount} clôturé${closCount !== 1 ? 's' : ''} · ${activeCount} en cours`}
          trend="neutral"
        />
        <KpiCard
          label="⊕ CA pipeline"
          value={loading ? '–' : fmtMontant(kpi.caPipeline)}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#6B35C9,#C2257A)"
          trendValue="XOF · Estimé · dossiers actifs"
          trend="up"
        />
        <KpiCard
          label="% Marge moyenne"
          value={loading ? '–' : (kpi.margeAvg !== null ? `${kpi.margeAvg.toFixed(1)}%` : '–')}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#10B981,#0E86E8)"
          trendValue="Estimée · dossiers actifs"
          trend={kpi.margeAvg !== null ? (kpi.margeAvg >= 15 ? 'up' : 'warning') : 'neutral'}
          styleValue={kpi.margeAvg !== null ? (kpi.margeAvg >= 15 ? 'text-[#059669]' : 'text-[#D97706]') : undefined}
        />
        <KpiCard
          label="⚠ Alertes actives"
          value={loading ? '–' : String(kpi.alertes)}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#EF4444,#F59E0B)"
          trendValue={alertCount > 0 ? `${alertCount} dossier${alertCount > 1 ? 's' : ''} à vérifier` : 'Aucune alerte'}
          trend={kpi.alertes > 0 ? 'down' : 'neutral'} 
          styleValue={kpi.alertes > 0 ? 'text-[#DC2626]' : undefined}
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-[240px] flex-shrink-0">
          <MagnifyingGlassIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full h-[34px] pl-8 pr-3 border border-[var(--bd-def)] rounded-lg bg-white text-[13px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-primary-500 transition-colors shadow-sm"
          />
        </div>
        {(
          [
            { key: 'all', label: 'Tous', count: dossiers.length },
            { key: 'actif', label: 'En cours', count: activeCount },
            { key: 'alerte', label: '⚠ Alertes', count: alertCount, danger: true },
            { key: 'cloture', label: 'Clôturés', count: closCount },
          ] as { key: PillFilter; label: string; count: number; danger?: boolean }[]
        ).map(p => (
          <button
            key={p.key}
            onClick={() => setPill(p.key)}
            className={cn(
              'h-[30px] px-3 border rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap',
              pill === p.key
                ? 'bg-[#EBF5FD] text-[#085499] border-[#A1D3F7] font-semibold'
                : 'bg-white text-[var(--tx-2)] border-[var(--bd-def)] hover:bg-[var(--bg-sink)] hover:border-[var(--bd-str)]',
            )}
          >
            {p.label}
            {p.count > 0 && (
              <span
                className="min-w-[18px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                style={{ background: p.danger ? '#EF4444' : '#0E86E8' }}
              >
                {p.count}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="text-[11px]">⊟ Colonnes</Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[var(--bd-def)] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-[var(--tx-3)]">
            <CircleNotchIcon size={20} className="animate-spin" />
            <span className="text-[13px]">Chargement des dossiers…</span>
          </div>
        ) : error ? (
          <div className="p-6">
            <Alert type="error" title="Erreur de chargement">
              {error}
            </Alert>
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                <ArrowsClockwiseIcon size={13} /> Réessayer
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpenIcon size={28} />}
            title="Aucun dossier trouvé"
            description={dossiers.length === 0 ? "Commencez par créer votre premier dossier transport." : "Aucun dossier ne correspond aux filtres sélectionnés."}
            action={dossiers.length === 0 ? (
              <Button variant="gradient" size="sm" onClick={() => router.push(`/${locale}/page/transport/nouveau`)}>
                <PlusIcon size={13} weight="bold" /> Créer le premier dossier
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-sink)] border-b-2 border-[var(--bd-def)]">
                  {['Référence', 'Client', 'Trajet', 'Mode', 'Étape', 'Marge', 'Statut', ''].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] whitespace-nowrap',
                        i === 0 && 'pl-5',
                        i === 7 && 'pr-4 text-right',
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const st = STATUT_CONFIG[d.statut];
                  const mod = MODE_CONFIG[d.mode];
                  const margeVal = d.marge_reel ?? d.marge_est;
                  const isEstim = d.marge_reel === null && d.marge_est !== null;
                  const [from, to] = d.trajet.split('→').map(s => s.trim());
                  return (
                    <tr
                      key={d.id}
                      onClick={() => router.push(`/${locale}/page/transport/${d.id}`)}
                      className="border-b border-[#F0F4F8] hover:bg-[#F7FBFF] cursor-pointer transition-colors last:border-b-0"
                    >
                      {/* Référence */}
                      <td className="pl-5 pr-3 py-3.5 align-middle">
                        <span className="font-mono text-[12px] font-semibold text-[#085499]">{d.reference}</span>
                      </td>

                      {/* Client */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex items-center gap-1">
                          <span className="text-[13px] font-semibold text-[var(--tx-1)]">{d.client_name}</span>
                          {d.alerte && (
                              <WarningIcon
                                size={14}
                                className="text-[#EF4444] flex-shrink-0"
                                aria-label={d.alerte === 'critique' ? 'Marge critique < 10%' : 'Écart coûts > 10%'}
                              />
                          )}
                        </div>
                        {d.client_meta && (
                          <div className="text-[11px] text-[var(--tx-3)] mt-0.5">{d.client_meta}</div>
                        )}
                        <div className="text-[11px] text-[var(--tx-3)] mt-0.5">
                          {d.entite === 'SN' ? '🇸🇳 SN' : '🇨🇮 CI'}{' '}·{' '}
                          {new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Trajet */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="text-[13px] font-medium text-[var(--tx-1)] flex items-center gap-1">
                          <span>{from}</span>
                          <ArrowRightIcon size={11} className="text-[var(--tx-3)] flex-shrink-0" />
                          <span>{to}</span>
                        </div>
                      </td>

                      {/* Mode */}
                      <td className="px-3 py-3.5 align-middle">
                        <span
                          className="inline-flex items-center px-2 py-[3px] rounded-[6px] text-[11px] font-semibold"
                          style={{ background: mod.bg, color: mod.color }}
                        >
                          {mod.label}
                        </span>
                      </td>

                      {/* Mini stepper */}
                      <td className="px-3 py-3.5 align-middle">
                        <MiniStepper etape={d.etape} />
                      </td>

                      {/* Marge */}
                      <td className="px-3 py-3.5 align-middle">
                        <MargeBadge marge={margeVal} isEstim={isEstim} />
                      </td>

                      {/* Statut */}
                      <td className="px-3 py-3.5 align-middle">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap"
                          style={{ background: st.bg, color: st.text }}
                        >
                          <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="pr-4 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={e => { e.stopPropagation(); router.push(`/${locale}/page/transport/${d.id}`); }}
                            className="w-[28px] h-[28px] rounded-[6px] border border-[var(--bd-def)] bg-white flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
                            title="Ouvrir"
                          >
                            <ArrowRightIcon size={12} />
                          </button>
                          <button
                            onClick={e => e.stopPropagation()}
                            className="w-[28px] h-[28px] rounded-[6px] border border-[var(--bd-def)] bg-white flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
                            title="Exporter"
                          >
                            <DownloadSimpleIcon size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && (
        <div className="mt-6 pt-4 border-t border-[var(--bd-def)] flex items-center justify-between text-[11px] text-[var(--tx-3)]">
          <span>W-02 · Liste dossiers transport · {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          <span>PortaLis MVP V1.0 · INOV Consulting · INOV–PGH–PC–2026</span>
        </div>
      )}
    </div>
  );
}
