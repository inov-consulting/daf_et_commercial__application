'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  XIcon, CircleNotchIcon, MagnifyingGlassIcon, ArrowRightIcon,
  WarningIcon, FolderOpenIcon, CheckIcon, ArrowsClockwiseIcon, ArrowArcRightIcon,
} from '@phosphor-icons/react';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import {
  type Shipment, type ShipmentListResponse, type ShipmentDetail,
  type TransportDashboard, SHIPMENT_STATE_CONFIG, SHIPMENT_MODE_CONFIG,
} from '@/types/transport_type';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { KpiCard } from '@/components/ui/kpi-card';
import ApercuSection from './apercu-section';
import VoyagesSection from './voyages-section';
import ChargesSection from './charges-section';
import ImmobilisationsSection from './immobilisation-section';
import WorkflowSection from './workfow-section';
import { NextStepModal } from './next-step-modal';
import type { NextStepResponse } from '@/types/transport_type';

/* ── Types locaux ─────────────────────────────────────────────────────────── */

type StateFilter = 'all' | 'draft' | 'confirmed' | 'in_transit' | 'in_progress' | 'done' | 'cancelled';
type DrawerTab = 'apercu' | 'voyages' | 'charges' | 'immobilisations' | 'workflow';

const STATE_PILLS: { key: StateFilter; label: string }[] = [
  { key: 'all',         label: 'Tous' },
  { key: 'in_transit',  label: 'En transit' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'confirmed',   label: 'Confirmés' },
  { key: 'done',        label: 'Livrés' },
  { key: 'draft',       label: 'Brouillons' },
  { key: 'cancelled',   label: 'Annulés' },
];

const DRAWER_TABS: { key: DrawerTab; label: string }[] = [
  { key: 'apercu', label: 'Résumé' },
  { key: 'voyages', label: 'Voyages' },
  { key: 'charges', label: 'Charges' },
  { key: 'immobilisations', label: 'Immobilisations' },
  { key: 'workflow', label: 'Workflow' },
];

function fmtDate(iso?: string) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtAmount(amount: number, currency?: string) {
  return `${amount.toLocaleString('fr-FR')} ${currency ?? 'XOF'}`;
}

/* ── Info field helper ────────────────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">{label}</span>
      <div className="px-3 py-2 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-lg text-[12px] text-[var(--tx-1)] font-medium min-h-[34px] flex items-center">
        {value}
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */

export function TransportShipmentsSection() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<TransportDashboard | null>(null);

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ShipmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('apercu');
  const [showNextStep, setShowNextStep] = useState(false);

  /* ── Fetch shipments + dashboard ── */
  const fetchTransportData = async (signal: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);

    try {
      const [shipmentsRes, dashRes] = await Promise.all([
        GetData<ShipmentListResponse>({ url: ApiRoutes.TRANSPORT_SHIPMENTS, protected: true }),
        GetData<TransportDashboard>({ url: ApiRoutes.TRANSPORT_DASHBOARD, protected: true }),
      ]);

      if (signal.cancelled) return;

      setLoading(false);

      if (shipmentsRes.ok && shipmentsRes.data) {
        setShipments(shipmentsRes.data.items);
      } else {
        setError(shipmentsRes.error ?? 'Erreur de chargement');
      }

      if (dashRes.ok && dashRes.data) {
        setDashboard(dashRes.data);
      }
    } catch (err) {
      if (!signal.cancelled) {
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Erreur inattendue');
      }
    }
  };

  useEffect(() => {
    const signal = { cancelled: false };

    fetchTransportData(signal);

    return () => {
      signal.cancelled = true;
    };
  }, []);

  /* ── Fetch detail when shipment selected ── */
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    setDrawerTab('apercu');
    (async () => {
      setDetailLoading(true);
      const res = await GetData<ShipmentDetail>({
        url: ApiRoutes.TRANSPORT_SHIPMENT(String(selectedId)),
        protected: true,
      });
      if (cancelled) return;
      setDetailLoading(false);
      if (res.ok && res.data) setDetail(res.data);
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    let list = shipments;
    if (stateFilter !== 'all') list = list.filter(s => s.state === stateFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.partner ?? '').toLowerCase().includes(q) ||
        (s.origin_location ?? '').toLowerCase().includes(q) ||
        (s.destination_location ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [shipments, stateFilter, search]);

  /* ── KPI values ── */
  const kpi = useMemo(() => ({
    totalShipments: dashboard?.total_shipments ?? shipments.length,
    totalVoyages:   dashboard?.total_voyages ?? 0,
    totalRevenue:   dashboard?.total_revenue ?? null,
    totalMargin:    dashboard?.total_margin  ?? null,
    totalCharges:   dashboard?.total_charges ?? null,
    currency: (shipments[0]?.currency ?? 'XOF'),
    byMode: dashboard?.by_mode ?? [],
  }), [dashboard, shipments]);

  /* ── Next-step success: refresh detail + update list state ── */
  function handleNextStepSuccess(result: NextStepResponse) {
    // Re-fetch detail to get updated workflow
    if (selectedId) {
      (async () => {
        const res = await GetData<ShipmentDetail>({
          url: ApiRoutes.TRANSPORT_SHIPMENT(String(selectedId)),
          protected: true,
        });
        if (res.ok && res.data) setDetail(res.data);
      })();
    }
    // Update state in the list too
    setShipments(prev => prev.map(s =>
      s.id === result.shipment_id
        ? { ...s, state: result.workflow_state as typeof s.state }
        : s,
    ));
  }

  /* ── Render ── */
  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <KpiCard
          icon={<FolderOpenIcon size={16} className="text-[#0E86E8] bg-white" />}
          label="Envois"
          value={loading ? '–' : String(kpi.totalShipments)}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#0E86E8,#6B35C9)"
          trendValue="Expéditions totales"
          trend="neutral"
        />
        <KpiCard
          icon={<ArrowRightIcon size={16} className="text-[#D97706] bg-white" />}
          label="Voyages"
          value={loading ? '–' : String(kpi.totalVoyages)}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#F59E0B,#D97706)"
          trendValue="Trajets effectués"
          trend="neutral"
        />
        <KpiCard
          icon={<CheckIcon size={16} className="text-[#059669] bg-white" />}
          label="Chiffre d'affaires"
          value={loading ? '–' : kpi.totalRevenue != null ? kpi.totalRevenue.toLocaleString('fr-FR') : '–'}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#10B981,#059669)"
          trendValue={kpi.currency}
          trend="up"
        />
        <KpiCard
          icon={<WarningIcon size={16} className="text-[#6B35C9] bg-white" />}
          label="Marge"
          value={loading ? '–' : kpi.totalMargin != null ? kpi.totalMargin.toLocaleString('fr-FR') : '–'}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#6B35C9,#A01D65)"
          trendValue={kpi.totalRevenue && kpi.totalMargin != null
            ? `${((kpi.totalMargin / kpi.totalRevenue) * 100).toFixed(1)}% de marge`
            : kpi.currency}
          trend={kpi.totalMargin != null && kpi.totalMargin >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* By-mode breakdown */}
      {!loading && kpi.byMode.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {kpi.byMode.map(m => {
            const modeCfg = SHIPMENT_MODE_CONFIG[m.transport_mode];
            return (
              <div
                key={m.transport_mode}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--bd-def)] bg-white text-[11px]"
              >
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold"
                  style={modeCfg ? { background: modeCfg.bg, color: modeCfg.color } : { background: '#F3F4F6', color: '#374151' }}
                >
                  {modeCfg?.label ?? m.transport_mode}
                </span>
                <span className="text-[var(--tx-2)] font-medium">
                  {m.shipment_count} envoi{m.shipment_count > 1 ? 's' : ''}
                  {m.voyage_count != null && ` · ${m.voyage_count} voyage${m.voyage_count > 1 ? 's' : ''}`}
                </span>
                {m.revenue != null && (
                  <span className="text-[var(--tx-3)]">
                    · {m.revenue.toLocaleString('fr-FR')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-[220px] flex-shrink-0">
          <MagnifyingGlassIcon
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full h-[34px] pl-8 pr-3 border border-[var(--bd-def)] rounded-lg bg-white text-[13px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-primary-500 transition-colors shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
              title="Effacer la recherche"
            >
              <XIcon size={11} weight="bold" />
            </button>
          )}
        </div>
        {STATE_PILLS.map(p => {
          const cfg = p.key !== 'all' ? SHIPMENT_STATE_CONFIG[p.key as keyof typeof SHIPMENT_STATE_CONFIG] : null;
          const count = p.key === 'all'
            ? shipments.length
            : shipments.filter(s => s.state === p.key).length;
          return (
            <button
              key={p.key}
              onClick={() => setStateFilter(p.key)}
              className={cn(
                'h-[30px] px-3 border rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap',
                stateFilter === p.key
                  ? 'bg-[#EBF5FD] text-[#085499] border-[#A1D3F7] font-semibold'
                  : 'bg-white text-[var(--tx-2)] border-[var(--bd-def)] hover:bg-[var(--bg-sink)]',
              )}
            >
              {p.label}
              {count > 0 && (
                <span
                  className="min-w-[18px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: cfg ? cfg.dot : '#0E86E8' }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="text-[11px]"
          onClick={() => fetchTransportData({ cancelled: false })}
        >
          <ArrowsClockwiseIcon size={13} className={`${loading ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      {/* Shipments table */}
      <div className="bg-white border border-[var(--bd-def)] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-[var(--tx-3)]">
            <CircleNotchIcon size={20} className="animate-spin" />
            <span className="text-[13px]">Chargement des envois…</span>
          </div>
        ) : error ? (
          <div className="p-6">
            <Alert type="error" title="Erreur de chargement">{error}</Alert>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpenIcon size={28} className="text-[var(--tx-3)] mx-auto mb-2 opacity-40" />
            <p className="text-[12px] text-[var(--tx-3)]">
              {shipments.length === 0
                ? 'Aucun envoi enregistré.'
                : 'Aucun envoi ne correspond aux filtres.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-sink)] border-b-2 border-[var(--bd-def)]">
                  {['Référence', 'Partenaire', 'Trajet', 'Mode', 'Statut', 'Période', 'CA / Marge', ''].map((h, i) => (
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
                {filtered.map(s => {
                  const stCfg = s.state ? SHIPMENT_STATE_CONFIG[s.state] : null;
                  const modCfg = s.transport_mode ? SHIPMENT_MODE_CONFIG[s.transport_mode] : null;
                  const marginPct = s.revenue && s.margin != null
                    ? ((s.margin / s.revenue) * 100).toFixed(0)
                    : null;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className="border-b border-[#F0F4F8] hover:bg-[#F7FBFF] cursor-pointer transition-colors last:border-b-0"
                    >
                      {/* Référence */}
                      <td className="pl-5 pr-3 py-3.5 align-middle">
                        <span className="font-mono text-[12px] font-semibold text-[#085499]">
                          {s.name}
                        </span>
                      </td>

                      {/* Partenaire */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="text-[13px] font-semibold text-[var(--tx-1)] leading-tight">
                          {s.partner ?? '–'}
                        </div>
                        {s.company && (
                          <div className="text-[11px] text-[var(--tx-3)] mt-0.5">{s.company}</div>
                        )}
                      </td>

                      {/* Trajet */}
                      <td className="px-3 py-3.5 align-middle max-w-[200px]">
                        <div className="text-[12px] text-[var(--tx-1)] flex items-start gap-1">
                          <span className="truncate">{s.origin_location ?? '–'}</span>
                          <ArrowRightIcon size={11} className="text-[var(--tx-3)] flex-shrink-0 mt-0.5" />
                          <span className="truncate">{s.destination_location ?? '–'}</span>
                        </div>
                      </td>

                      {/* Mode */}
                      <td className="px-3 py-3.5 align-middle">
                        {modCfg ? (
                          <span
                            className="inline-flex items-center px-2 py-[3px] rounded-[6px] text-[11px] font-semibold"
                            style={{ background: modCfg.bg, color: modCfg.color }}
                          >
                            {modCfg.label}
                          </span>
                        ) : (
                          <span className="text-[12px] text-[var(--tx-3)]">{s.transport_mode ?? '–'}</span>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="px-3 py-3.5 align-middle">
                        {stCfg ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap"
                            style={{ background: stCfg.bg, color: stCfg.color }}
                          >
                            <span
                              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                              style={{ background: stCfg.dot }}
                            />
                            {stCfg.label}
                          </span>
                        ) : (
                          <span className="text-[12px] text-[var(--tx-3)]">{s.state ?? '–'}</span>
                        )}
                      </td>

                      {/* Période */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="text-[11px] text-[var(--tx-3)] whitespace-nowrap">
                          {s.date_start ? fmtDate(s.date_start) : '–'}
                          {s.date_end && (
                            <>
                              <span className="mx-1 text-[var(--bd-def)]">→</span>
                              {fmtDate(s.date_end)}
                            </>
                          )}
                        </div>
                      </td>

                      {/* CA / Marge */}
                      <td className="px-3 py-3.5 align-middle">
                        {s.revenue != null ? (
                          <div>
                            <div className="font-mono text-[12px] font-semibold text-[var(--tx-1)] whitespace-nowrap">
                              {s.revenue.toLocaleString('fr-FR')}
                              <span className="text-[var(--tx-3)] font-normal ml-0.5 text-[10px]">{s.currency ?? 'XOF'}</span>
                            </div>
                            {s.margin != null && (
                              <div className={`text-[10px] font-semibold mt-0.5 whitespace-nowrap ${s.margin >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                                {s.margin >= 0 ? '+' : ''}{s.margin.toLocaleString('fr-FR')}
                                {marginPct && <span className="ml-1 opacity-70">({marginPct}%)</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[12px] text-[var(--tx-3)]">–</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="pr-4 py-3.5 align-middle text-right">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedId(s.id); }}
                          className="w-[28px] h-[28px] rounded-[6px] border border-[var(--bd-def)] bg-white flex items-center justify-center ml-auto text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
                          title="Voir le détail"
                        >
                          <ArrowRightIcon size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Shipment detail drawer ── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSelectedId(null)}
          />
          <div
            className="relative w-full max-w-[640px] h-full bg-white shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--tx-3)]">
                <button
                  onClick={() => setSelectedId(null)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-sink)] transition-colors"
                >
                  <XIcon size={15} />
                </button>
                {detailLoading
                  ? <><CircleNotchIcon size={24} className="animate-spin" /><span className="text-[13px]">Chargement…</span></>
                  : <span className="text-[13px]">Erreur de chargement</span>
                }
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="h-[3px] w-full" style={{ background: 'var(--grad)' }} />
                <div className="px-5 py-4 border-b border-[var(--bd-def)] bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-[12px] font-semibold text-[#085499] bg-[#EBF5FD] px-2.5 py-1 rounded-[6px]">
                      {detail.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {detail.state !== 'cancelled' && detail.state !== 'done' && (
                        <button
                          onClick={() => detail.workflow && setShowNextStep(true)}
                          disabled={!detail.workflow}
                          className={cn(
                            'h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-semibold transition-all',
                            detail.workflow
                              ? 'text-white hover:opacity-90'
                              : 'text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] cursor-not-allowed',
                          )}
                          style={detail.workflow ? { background: 'linear-gradient(135deg,#1B6B45,#8B6914)' } : {}}
                          title={detail.workflow ? 'Avancer le workflow' : 'Aucun workflow actif sur ce dossier'}
                        >
                          <ArrowArcRightIcon size={12} weight="bold" />
                          Étape suivante
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedId(null)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
                      >
                        <XIcon size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {detail.state && SHIPMENT_STATE_CONFIG[detail.state] && (() => {
                      const cfg = SHIPMENT_STATE_CONFIG[detail.state];
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          <span className="w-[5px] h-[5px] rounded-full" style={{ background: cfg.dot }} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                    {detail.transport_mode && SHIPMENT_MODE_CONFIG[detail.transport_mode] && (() => {
                      const cfg = SHIPMENT_MODE_CONFIG[detail.transport_mode];
                      return (
                        <span
                          className="inline-flex items-center px-2 py-[3px] rounded-[6px] text-[11px] font-semibold"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      );
                    })()}
                    {detail.partner && (
                      <span className="text-[12px] font-semibold text-[var(--tx-2)]">{detail.partner}</span>
                    )}
                    {(detail.origin_location || detail.destination_location) && (
                      <span className="text-[12px] text-[var(--tx-3)] flex items-center gap-1">
                        <span className="max-w-[120px] truncate">{detail.origin_location}</span>
                        <ArrowRightIcon size={10} className="flex-shrink-0" />
                        <span className="max-w-[120px] truncate">{detail.destination_location}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--bd-def)] bg-[var(--bg-sink)] overflow-x-auto flex-shrink-0">
                  {DRAWER_TABS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setDrawerTab(t.key)}
                      className={cn(
                        'px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors flex-shrink-0',
                        drawerTab === t.key
                          ? 'border-[#0E86E8] text-[#085499] font-semibold bg-white'
                          : 'border-transparent text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-white/50',
                      )}
                    >
                      {t.label}
                      {t.key === 'voyages' && detail.voyages?.length ? (
                        <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#EBF5FD] text-[#085499] text-[9px] font-bold">
                          {detail.voyages.length}
                        </span>
                      ) : null}
                      {t.key === 'charges' && detail.charges?.length ? (
                        <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#EBF5FD] text-[#085499] text-[9px] font-bold">
                          {detail.charges.length}
                        </span>
                      ) : null}
                      {t.key === 'immobilisations' && detail.immobilizations?.length ? (
                        <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#FFFBEB] text-[#D97706] text-[9px] font-bold">
                          {detail.immobilizations.length}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto p-5">
                  {drawerTab === 'apercu' && <ApercuSection detail={detail} />}
                  {drawerTab === 'voyages' && <VoyagesSection detail={detail} />}
                  {drawerTab === 'charges' && <ChargesSection detail={detail} />}
                  {drawerTab === 'immobilisations' && <ImmobilisationsSection detail={detail} />}
                  {drawerTab === 'workflow' && <WorkflowSection workflow={detail.workflow} />}
                </div>

                {/* Next-step modal */}
                {showNextStep && (
                  <NextStepModal
                    shipmentId={detail.id}
                    shipmentName={detail.name}
                    currentStep={detail.workflow?.current_step}
                    onClose={() => setShowNextStep(false)}
                    onSuccess={result => {
                      handleNextStepSuccess(result);
                      setShowNextStep(false);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
