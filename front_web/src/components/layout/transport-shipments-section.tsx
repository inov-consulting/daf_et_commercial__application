'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  XIcon, CircleNotchIcon, MagnifyingGlassIcon, ArrowRightIcon,
  WarningIcon, FolderOpenIcon, CheckIcon, ArrowsClockwiseIcon,
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

/* ── Types locaux ─────────────────────────────────────────────────────────── */

type StateFilter = 'all' | 'draft' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
type DrawerTab = 'apercu' | 'voyages' | 'charges' | 'immobilisations' | 'workflow';

const STATE_PILLS: { key: StateFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'in_transit', label: 'En transit' },
  { key: 'confirmed', label: 'Confirmés' },
  { key: 'delivered', label: 'Livrés' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'cancelled', label: 'Annulés' },
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

/* ── Drawer tab sections ──────────────────────────────────────────────────── */

function ApercuSection({ detail }: { detail: ShipmentDetail }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <InfoRow label="Partenaire" value={detail.partner_name ?? detail.partner_id ?? '–'} />
        <InfoRow label="Mode" value={
          detail.transport_mode
            ? (SHIPMENT_MODE_CONFIG[detail.transport_mode]?.label ?? detail.transport_mode)
            : '–'
        } />
        <InfoRow label="Origine" value={detail.origin ?? '–'} />
        <InfoRow label="Destination" value={detail.destination ?? '–'} />
        <InfoRow label="Date départ" value={fmtDate(detail.date_from)} />
        <InfoRow label="Date arrivée" value={fmtDate(detail.date_to)} />
        <InfoRow label="Type véhicule" value={detail.vehicle_subtype_name ?? detail.vehicle_subtype_id ?? '–'} />
        <InfoRow label="Créé le" value={fmtDate(detail.created_at)} />
      </div>
      {detail.notes && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">Notes</span>
          <div className="px-3 py-2 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-lg text-[12px] text-[var(--tx-1)] leading-relaxed">
            {detail.notes}
          </div>
        </div>
      )}
    </div>
  );
}

function VoyagesSection({ detail }: { detail: ShipmentDetail }) {
  const voyages = detail.voyages ?? [];
  if (voyages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--tx-3)] gap-2">
        <FolderOpenIcon size={24} className="opacity-40" />
        <span className="text-[13px]">Aucun voyage enregistré</span>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {voyages.map((v, i) => (
        <div
          key={v.id ?? i}
          className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-mono text-[12px] font-semibold text-[#085499]">
                {v.reference ?? `Voyage ${i + 1}`}
              </div>
              {v.vessel_name && (
                <div className="text-[13px] font-bold text-[var(--tx-1)] mt-0.5">{v.vessel_name}</div>
              )}
              {v.carrier && (
                <div className="text-[11px] text-[var(--tx-3)]">{v.carrier}</div>
              )}
            </div>
            {v.status && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF5FD] text-[#085499]">
                {v.status}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] mt-2">
            {v.bl_number && (
              <div className="col-span-2 text-[var(--tx-3)]">
                BL n° : <span className="font-mono font-semibold text-[var(--tx-1)]">{v.bl_number}</span>
              </div>
            )}
            {(v.port_origin || v.port_destination) && (
              <div className="col-span-2 text-[var(--tx-3)] flex items-center gap-1">
                <span>{v.port_origin ?? '–'}</span>
                <ArrowRightIcon size={10} className="flex-shrink-0" />
                <span>{v.port_destination ?? '–'}</span>
              </div>
            )}
            {v.etd && (
              <div className="text-[var(--tx-3)]">ETD : <span className="font-semibold text-[var(--tx-1)]">{fmtDate(v.etd)}</span></div>
            )}
            {v.eta && (
              <div className="text-[var(--tx-3)]">ETA : <span className="font-semibold text-[var(--tx-1)]">{fmtDate(v.eta)}</span></div>
            )}
            {v.atd && (
              <div className="text-[var(--tx-3)]">ATD : <span className="font-semibold text-[var(--tx-1)]">{fmtDate(v.atd)}</span></div>
            )}
            {v.ata && (
              <div className="text-[var(--tx-3)]">ATA : <span className="font-semibold text-[var(--tx-1)]">{fmtDate(v.ata)}</span></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChargesSection({ detail }: { detail: ShipmentDetail }) {
  const charges = detail.charges ?? [];
  if (charges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--tx-3)] gap-2">
        <FolderOpenIcon size={24} className="opacity-40" />
        <span className="text-[13px]">Aucune charge enregistrée</span>
      </div>
    );
  }
  const total = charges.reduce((s, c) => s + (c.amount ?? 0), 0);
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[var(--bd-def)]">
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-[var(--bg-sink)] border-b-2 border-[var(--bd-def)]">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)]">Description</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)]">Type</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)]">Montant</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((c, i) => (
              <tr key={c.id ?? i} className="border-b border-[#F0F4F8] hover:bg-[#FAFCFF]">
                <td className="px-3 py-2.5 text-[var(--tx-1)]">{c.description ?? '–'}</td>
                <td className="px-3 py-2.5 text-[var(--tx-3)]">{c.charge_type ?? '–'}</td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-[var(--tx-1)]">
                  {fmtAmount(c.amount, c.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-[var(--bd-def)] bg-[var(--bg-sink)] font-bold">
            <tr>
              <td className="px-3 py-2.5 text-[13px] text-[var(--tx-1)]" colSpan={2}>Total</td>
              <td className="px-3 py-2.5 text-right font-mono text-primary">
                {total.toLocaleString('fr-FR')} XOF
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ImmobilisationsSection({ detail }: { detail: ShipmentDetail }) {
  const items = detail.immobilizations ?? [];
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--tx-3)] gap-2">
        <FolderOpenIcon size={24} className="opacity-40" />
        <span className="text-[13px]">Aucune immobilisation enregistrée</span>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={item.id ?? i}
          className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[var(--tx-1)]">
                {item.reason ?? `Immobilisation ${i + 1}`}
              </div>
              <div className="text-[11px] text-[var(--tx-3)] mt-1">
                {fmtDate(item.start_date)} – {item.end_date ? fmtDate(item.end_date) : 'En cours'}
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              {item.days != null && (
                <div className="text-[15px] font-bold text-[#D97706]">{item.days}j</div>
              )}
              {item.total_cost != null && (
                <div className="text-[11px] font-mono text-[var(--tx-1)]">
                  {fmtAmount(item.total_cost)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkflowSection({ detail }: { detail: ShipmentDetail }) {
  const steps = detail.workflow ?? [];
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--tx-3)] gap-2">
        <FolderOpenIcon size={24} className="opacity-40" />
        <span className="text-[13px]">Aucune étape de workflow</span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl border',
            step.status === 'done' ? 'bg-[#ECFDF5] border-[rgba(16,185,129,.2)]' :
              step.status === 'current' ? 'bg-[#EBF5FD] border-[rgba(14,134,232,.2)]' :
                'bg-[var(--bg-sink)] border-[var(--bd-def)]',
          )}
        >
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
            step.status === 'done' ? 'bg-[#10B981]' :
              step.status === 'current' ? 'bg-[#0E86E8]' :
                'bg-[#D1D5DB]',
          )}>
            {step.status === 'done' ? (
              <CheckIcon size={12} weight="bold" className="text-white" />
            ) : (
              <span className="text-[10px] font-bold text-white">{i + 1}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn(
              'text-[13px] font-semibold',
              step.status === 'done' ? 'text-[#059669]' :
                step.status === 'current' ? 'text-[#085499]' :
                  'text-[var(--tx-2)]',
            )}>
              {step.label ?? step.step}
            </div>
            {step.date && (
              <div className="text-[11px] text-[var(--tx-3)]">{fmtDate(step.date)}</div>
            )}
          </div>
          <span className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
            step.status === 'done' ? 'bg-[#DCFCE7] text-[#059669]' :
              step.status === 'current' ? 'bg-[#EBF5FD] text-[#085499]' :
                'bg-[var(--bg-sink)] text-[var(--tx-3)]',
          )}>
            {step.status === 'done' ? 'Terminé' : step.status === 'current' ? 'En cours' : 'En attente'}
          </span>
        </div>
      ))}
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ShipmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('apercu');

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
        url: ApiRoutes.TRANSPORT_SHIPMENT(selectedId),
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
        s.reference.toLowerCase().includes(q) ||
        (s.partner_name ?? '').toLowerCase().includes(q) ||
        (s.origin ?? '').toLowerCase().includes(q) ||
        (s.destination ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [shipments, stateFilter, search]);

  /* ── KPI values ── */
  const kpi = useMemo(() => ({
    total: dashboard?.total_shipments ?? shipments.length,
    inTransit: dashboard?.in_transit ?? shipments.filter(s => s.state === 'in_transit').length,
    delivered: dashboard?.delivered ?? shipments.filter(s => s.state === 'delivered').length,
    cancelled: dashboard?.cancelled ?? shipments.filter(s => s.state === 'cancelled').length,
  }), [dashboard, shipments]);

  /* ── Render ── */
  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon={<FolderOpenIcon size={16} className="text-[#0E86E8] bg-white" />}
          label="Total envois"
          value={loading ? '–' : String(kpi.total)}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#0E86E8,#6B35C9)"
          trendValue="Tous statuts confondus"
          trend="neutral"
        />
        <KpiCard
          icon={<ArrowRightIcon size={16} className="text-[#D97706] bg-white" />}
          label="En transit"
          value={loading ? '–' : String(kpi.inTransit)}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#F59E0B,#D97706)"
          trendValue="En cours d'acheminement"
          trend="neutral"
        />
        <KpiCard
          icon={<CheckIcon size={16} className="text-[#059669] bg-white" />}
          label="Livrés"
          value={loading ? '–' : String(kpi.delivered)}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#10B981,#059669)"
          trendValue="Envois finalisés"
          trend="up"
        />
        <KpiCard
          icon={<WarningIcon size={16} className="text-[#EF4444] bg-white" />}
          label="Annulés"
          value={loading ? '–' : String(kpi.cancelled)}
          labelPosition="above"
          accentStyle="linear-gradient(135deg,#EF4444,#DC2626)"
          trendValue={kpi.cancelled > 0 ? `${kpi.cancelled} envoi(s) annulé(s)` : 'Aucun annulé'}
          trend={kpi.cancelled > 0 ? 'down' : 'neutral'}
          styleValue={kpi.cancelled > 0 ? 'text-[#DC2626]' : undefined}
        />
      </div>

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
                  {['Référence', 'Partenaire', 'Trajet', 'Mode', 'Statut', 'Dates', ''].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] whitespace-nowrap',
                        i === 0 && 'pl-5',
                        i === 6 && 'pr-4 text-right',
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
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className="border-b border-[#F0F4F8] hover:bg-[#F7FBFF] cursor-pointer transition-colors last:border-b-0"
                    >
                      {/* Référence */}
                      <td className="pl-5 pr-3 py-3.5 align-middle">
                        <span className="font-mono text-[12px] font-semibold text-[#085499]">
                          {s.reference}
                        </span>
                      </td>

                      {/* Partenaire */}
                      <td className="px-3 py-3.5 align-middle">
                        <span className="text-[13px] font-semibold text-[var(--tx-1)]">
                          {s.partner_name ?? '–'}
                        </span>
                      </td>

                      {/* Trajet */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="text-[13px] text-[var(--tx-1)] flex items-center gap-1">
                          <span className="max-w-[90px] truncate">{s.origin ?? '–'}</span>
                          <ArrowRightIcon size={11} className="text-[var(--tx-3)] flex-shrink-0" />
                          <span className="max-w-[90px] truncate">{s.destination ?? '–'}</span>
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

                      {/* Dates */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="text-[11px] text-[var(--tx-3)]">
                          {s.date_from ? fmtDate(s.date_from) : '–'}
                          {s.date_to && (
                            <>
                              <span className="mx-1 text-[var(--bd-def)]">→</span>
                              {fmtDate(s.date_to)}
                            </>
                          )}
                        </div>
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

      {/* Footer */}
      {!loading && !error && (
        <div className="mt-6 pt-4 border-t border-[var(--bd-def)] flex items-center justify-between text-[11px] text-[var(--tx-3)]">
          <span>W-02 · Envois transport · {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          <span>PortaLis MVP V1.0 · INOV Consulting · INOV–PGH–PC–2026</span>
        </div>
      )}

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
                      {detail.reference}
                    </span>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
                    >
                      <XIcon size={15} />
                    </button>
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
                    {detail.partner_name && (
                      <span className="text-[12px] font-semibold text-[var(--tx-2)]">{detail.partner_name}</span>
                    )}
                    {(detail.origin || detail.destination) && (
                      <span className="text-[12px] text-[var(--tx-3)] flex items-center gap-1">
                        {detail.origin} <ArrowRightIcon size={10} /> {detail.destination}
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
                  {drawerTab === 'workflow' && <WorkflowSection detail={detail} />}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
