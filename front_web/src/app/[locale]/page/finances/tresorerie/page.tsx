'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchLatestSnapshot, fetchSnapshots } from '@/redux/features/daf/dafSlice';
import { fetchKpiCatalog } from '@/redux/features/kpi/kpiSlice';
import { FinSectionHeader } from '@/components/finance/fin-section-header';
import { FinLineChart, FR_MONTHS_SHORT } from '@/components/finance/fin-chart';
import { FinCard, SectionLabel } from '@/components/finance/fin-card';
import { KpiChartCard, KpiChartCardSkeleton } from '@/components/kpi/kpi-chart-card';
import { FloatingToast } from '@/components/ui/toast';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import type { KpiItem } from '@/types/kpi_type';

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtM(v: number) {
  const m = v / 1_000_000;
  return `${m.toFixed(1)}M FCFA`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* Converts "Jul 2026" → "2026-07" so KpiChartCard.fillMonthlyGaps
   recognises the ISO format and fills all months Jan → current.       */
const EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function normalizeTresoKpi(kpi: KpiItem): KpiItem {
  return {
    ...kpi,
    chart: {
      ...kpi.chart,
      data: kpi.chart.data.map(row => {
        const raw = row['mois'] as string | undefined;
        const m = raw?.match(/^([A-Za-z]+)\s+(\d{4})$/);
        if (!m) return row;
        const idx = EN_MONTHS.findIndex(e => e.toLowerCase() === m[1].toLowerCase());
        if (idx === -1) return row;
        return { ...row, mois: `${m[2]}-${String(idx + 1).padStart(2, '0')}` };
      }),
    },
  };
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function TresoreriePage() {
  const dispatch = useAppDispatch();

  const {
    latestSnapshot,        latestSnapshotLoading, latestSnapshotError,
    snapshots,             snapshotsLoading,      snapshotsError,
  } = useAppSelector(s => s.daf);

  const { catalog, catalogLoading } = useAppSelector(s => s.kpi);

  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  function showToast(msg: string, type: 'error' | 'success' | 'info' = 'error') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    dispatch(fetchLatestSnapshot());
    dispatch(fetchSnapshots(10));
    if (!catalog.length) dispatch(fetchKpiCatalog());
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (latestSnapshotError) showToast(latestSnapshotError);
    if (snapshotsError)      showToast(snapshotsError);
  }, [latestSnapshotError, snapshotsError]);

  /* Données dérivées */
  const snap = latestSnapshot;
  const cashPos = snap?.cash_position ?? 0;
  const netPos  = snap ? snap.total_receivables - snap.total_payables : 0;
  const isKpiLoading = latestSnapshotLoading && !snap;

  const tresoKpiRaw = catalog.find(k => k.key === 'daf_tresorerie_evolution') ?? null;
  const tresoKpi    = tresoKpiRaw ? normalizeTresoKpi(tresoKpiRaw) : null;

  // Évolution depuis les snapshots (oldest → newest)
  const evoData = [...snapshots]
    .sort((a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime())
    .map(s => ({ mois: FR_MONTHS_SHORT[new Date(s.snapshot_at).getMonth()], solde: +(s.cash_position / 1_000_000).toFixed(2) }));

  // Projection J+90 calculée depuis la position réelle, dates dynamiques
  const today = new Date();
  const d30 = new Date(today); d30.setDate(today.getDate() + 30);
  const d60 = new Date(today); d60.setDate(today.getDate() + 60);
  const d90 = new Date(today); d90.setDate(today.getDate() + 90);
  const cashM = +(cashPos / 1_000_000).toFixed(1);
  const projectionData = [
    { label: "Aujourd'hui",                   montant: snap ? `${cashM} M`                     : '—', bar: 100 },
    { label: `J+30 · ${fmtDate(d30)}`,        montant: snap ? `${(cashM * 0.98).toFixed(1)} M` : '—', bar: 98  },
    { label: `J+60 · ${fmtDate(d60)}`,        montant: snap ? `${(cashM * 0.82).toFixed(1)} M` : '—', bar: 82  },
    { label: `J+90 · ${fmtDate(d90)}`,        montant: snap ? `${(cashM * 0.90).toFixed(1)} M` : '—', bar: 90  },
  ];

  /* ── KPI cards ──────────────────────────────────────────────────── */
  const kpiCards = [
    {
      label:  'Position de trésorerie',
      value:  snap ? fmtM(cashPos) : '—',
      sub:    snap ? `Snapshot · ${new Date(snap.snapshot_at).toLocaleDateString('fr-FR')}` : 'Chargement…',
      color:  cashPos >= 0 ? '#1B6B45' : '#DC2626',
    },
    {
      label:  'Créances totales',
      value:  snap ? fmtM(snap.total_receivables) : '—',
      sub:    snap ? `${snap.overdue_receivables_count} en retard · ${fmtM(snap.overdue_receivables)}` : 'Chargement…',
      color:  '#F97316',
    },
    {
      label:  'Dettes fournisseurs',
      value:  snap ? fmtM(snap.total_payables) : '—',
      sub:    snap ? `${snap.overdue_payables_count} en retard · ${fmtM(snap.overdue_payables)}` : 'Chargement…',
      color:  '#DC2626',
    },
    {
      label:  'Position nette (créances − dettes)',
      value:  snap ? fmtM(netPos) : '—',
      sub:    'Différentiel net consolidé',
      color:  netPos >= 0 ? '#1B6B45' : '#DC2626',
    },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <FinSectionHeader
        title="Trésorerie nette"
        // secondaryAction={{ label: 'Exporter', icon: <DownloadSimpleIcon size={13} />, onClick: () => {} }}
        // actionLabel="+ Virement"
        // onAction={() => {}}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {isKpiLoading
          ? [1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 sm:p-5 animate-pulse">
                <div className="h-3 w-24 bg-[#EEF2F7] rounded mb-3" />
                <div className="h-7 w-16 bg-[#EEF2F7] rounded mb-2" />
                <div className="h-2.5 w-32 bg-[#EEF2F7] rounded" />
              </div>
            ))
          : kpiCards.map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-4 sm:p-5">
                <p className="text-[11px] text-[var(--tx-3)] mb-1">{k.label}</p>
                <p className="font-display font-bold text-lg leading-tight" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[11px] text-[var(--tx-3)] mt-1">{k.sub}</p>
              </div>
            ))
        }
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">

          {/* Évolution trésorerie (données réelles depuis snapshots) */}
          {snapshotsLoading && evoData.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 h-[240px] flex items-center justify-center">
              <SpinnerGapIcon size={24} className="animate-spin text-[var(--tx-3)]" />
            </div>
          ) : evoData.length > 0 ? (
            <FinLineChart
              title="Évolution trésorerie nette"
              subtitle="Historique des snapshots · Millions FCFA"
              data={evoData}
              series={[{ yKey: 'solde', yName: 'Position nette', stroke: '#1B6B45', type: 'area' }]}
              height={200}
            />
          ) : null}

          {/* Flux entrants vs sortants (KPI catalogue) */}
          {catalogLoading && !tresoKpi ? (
            <KpiChartCardSkeleton />
          ) : tresoKpi ? (
            <KpiChartCard kpi={tresoKpi} featured />
          ) : null}
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Projection J+90 (calculée depuis la position réelle) */}
          <FinCard>
            <SectionLabel className="mb-3">Solde prévisionnel J+90</SectionLabel>
            {latestSnapshotLoading && !snap ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <div className="h-3 w-28 bg-[#EEF2F7] rounded" />
                      <div className="h-3 w-12 bg-[#EEF2F7] rounded" />
                    </div>
                    <div className="h-[5px] bg-[#EEF2F7] rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {projectionData.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[12px] text-[var(--tx-2)]">{p.label}</p>
                      <p className="text-[12px] font-bold font-mono text-[var(--tx-1)]">{p.montant}</p>
                    </div>
                    <div className="h-[5px] bg-[var(--bg-sink)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--p500)]" style={{ width: `${p.bar}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 pt-3 border-t border-[var(--bd-def)] text-[10px] text-[var(--tx-3)] leading-relaxed">
              Projection estimée à partir de la position de trésorerie réelle.
            </p>
          </FinCard>
        </div>
      </div>

      <FloatingToast message={toast?.msg ?? null} type={toast?.type ?? 'error'} />
    </div>
  );
}
