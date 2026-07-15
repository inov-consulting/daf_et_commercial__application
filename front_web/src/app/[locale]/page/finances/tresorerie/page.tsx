'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchLatestSnapshot, fetchSnapshots } from '@/redux/features/daf/dafSlice';
import { FinSectionHeader } from '@/components/finance/fin-section-header';
import { FinBarChart, FinLineChart, FR_MONTHS_SHORT } from '@/components/finance/fin-chart';
import { FinCard, FinCardHeader, SectionLabel } from '@/components/finance/fin-card';
import { FloatingToast } from '@/components/ui/toast';
import { DownloadSimpleIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { CompteBancaire, EcheanceItem } from '@/types/finance_type';

/* ── Données mock sans équivalent API ───────────────────────────────── */

const FLUX_DATA = [
  { mois: 'Jan', entrant: 68, sortant: 52 },
  { mois: 'Fév', entrant: 72, sortant: 55 },
  { mois: 'Mar', entrant: 58, sortant: 70 },
  { mois: 'Avr', entrant: 80, sortant: 58 },
  { mois: 'Mai', entrant: 88, sortant: 63 },
  { mois: 'Jun', entrant: 96, sortant: 63 },
];

const COMPTES: CompteBancaire[] = [
  { id: 1, banque: 'SGBCI · Sénégal',        pays: 'SN', ref: 'SN-SGBCI-001-4892', solde: 18_720_000, trend:  5.2 },
  { id: 2, banque: 'BICICI · Côte d\'Ivoire', pays: 'CI', ref: 'CI-BICICI-002-7341', solde:  8_940_000, trend:  1.8 },
  { id: 3, banque: 'ECOBANK · Sénégal',       pays: 'SN', ref: 'SN-ECOB-001-2241',   solde:  3_180_000, trend: -12  },
  { id: 4, banque: 'BOA · Côte d\'Ivoire',    pays: 'CI', ref: 'CI-BOA-003-5588',    solde:  2_460_000, trend:  0.4 },
  { id: 5, banque: 'UBA · Sénégal',           pays: 'SN', ref: 'SN-UBA-001-8823',    solde:  1_500_000, trend:  0   },
];

const ECHEANCES: EcheanceItem[] = [
  { id: 1, date: '10 juil.', label: 'Loyers bureaux Dakar',   sub: 'Virement fournisseur', montant: -4_200_000,  status: 'urgent'   },
  { id: 2, date: '15 juil.', label: 'Masse salariale',         sub: 'Paie Juin 2026',       montant: -17_200_000, status: 'planifie' },
  { id: 3, date: '18 juil.', label: 'SONACOS · Règlement',     sub: 'FAC-2026-0089',        montant:  14_200_000, status: 'confirme' },
  { id: 4, date: '20 juil.', label: 'Impôts & taxes DGI',      sub: 'Acompte IS T3',        montant: -6_800_000,  status: 'planifie' },
  { id: 5, date: '25 juil.', label: 'PETROCI · Solde mission', sub: 'FAC-2026-0104',        montant:  9_800_000,  status: 'attente'  },
  { id: 6, date: '31 juil.', label: 'Assurances NSIA',         sub: 'Prime annuelle',       montant: -2_100_000,  status: 'planifie' },
];

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  urgent:   { dot: 'bg-[#EF4444]',        label: 'Urgent'     },
  planifie: { dot: 'bg-[var(--p500)]',    label: 'Planifié'   },
  confirme: { dot: 'bg-[var(--ok500)]',   label: 'Confirmé'   },
  attente:  { dot: 'bg-[var(--warn500)]', label: 'En attente' },
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtM(v: number) {
  const m = v / 1_000_000;
  return `${m.toFixed(1)}M FCFA`;
}

function fmtSolde(v: number) {
  return `${(v / 1_000_000).toFixed(3).replace('.', ',')} 000 FCFA`;
}

function fmtMontant(v: number) {
  const abs = Math.abs(v / 1_000_000);
  return `${v < 0 ? '−' : '+'}${abs.toFixed(1)} M FCFA`;
}

/* ── Skeleton KPI ────────────────────────────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 sm:p-5 animate-pulse">
          <div className="h-3 w-24 bg-[#EEF2F7] rounded mb-3" />
          <div className="h-7 w-16 bg-[#EEF2F7] rounded mb-2" />
          <div className="h-2.5 w-32 bg-[#EEF2F7] rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function TresoreriePage() {
  const dispatch = useAppDispatch();

  const {
    latestSnapshot,        latestSnapshotLoading, latestSnapshotError,
    snapshots,             snapshotsLoading,      snapshotsError,
  } = useAppSelector(s => s.daf);

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
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
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

  // Évolution depuis les snapshots (oldest → newest)
  const evoData = [...snapshots]
    .sort((a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime())
    .map(s => ({ mois: FR_MONTHS_SHORT[new Date(s.snapshot_at).getMonth()], solde: +(s.cash_position / 1_000_000).toFixed(2) }));

  // Projection J+90 calculée depuis la position réelle
  const cashM = +(cashPos / 1_000_000).toFixed(1);
  const projectionData = snap
    ? [
        { label: "Aujourd'hui",   montant: `${cashM} M`,                       bar: 100 },
        { label: 'J+30 · 5 août', montant: `${(cashM * 0.98).toFixed(1)} M`,   bar: 98  },
        { label: 'J+60 · 4 sep.', montant: `${(cashM * 0.82).toFixed(1)} M`,   bar: 82  },
        { label: 'J+90 · 4 oct.', montant: `${(cashM * 0.90).toFixed(1)} M`,   bar: 90  },
      ]
    : [
        { label: "Aujourd'hui",   montant: '—', bar: 100 },
        { label: 'J+30 · 5 août', montant: '—', bar: 98  },
        { label: 'J+60 · 4 sep.', montant: '—', bar: 82  },
        { label: 'J+90 · 4 oct.', montant: '—', bar: 90  },
      ];

  const soldeTotal = COMPTES.reduce((s, c) => s + c.solde, 0);

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
      {isKpiLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {kpiCards.map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-4 sm:p-5">
              <p className="text-[11px] text-[var(--tx-3)] mb-1">{k.label}</p>
              <p className="font-display font-bold text-lg leading-tight" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[11px] text-[var(--tx-3)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

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

          {/* Flux entrants vs sortants (mock — pas de route API) */}
          <FinBarChart
            title="Flux entrants vs sortants"
            subtitle="Jan – Juin 2026 · Millions FCFA · Estimation"
            data={FLUX_DATA}
            series={[
              { yKey: 'entrant', yName: 'Entrants', fill: '#1E5B3C' },
              { yKey: 'sortant', yName: 'Sortants', fill: '#FCA5A5' },
            ]}
            height={200}
          />          
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
            <p className="mt-3 pt-3 border-t border-[var(--bd-def)] text-[10px] text-[var(--warn600)] leading-relaxed">
              ⚠ Projection estimée à partir de la position de trésorerie réelle. Les flux entrants/sortants ne sont pas encore disponibles via l&apos;API.
            </p>
          </FinCard>
        </div>
      </div>

      <FloatingToast message={toast?.msg ?? null} type={toast?.type ?? 'error'} />
    </div>
  );
}
