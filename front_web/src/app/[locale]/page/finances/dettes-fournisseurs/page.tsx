'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchLatestSnapshot, fetchSnapshots } from '@/redux/features/daf/dafSlice';
import { FinSectionHeader } from '@/components/finance/fin-section-header';
import { FinLineChart, FinBarChart, FR_MONTHS_SHORT } from '@/components/finance/fin-chart';
import { FinCard, FinCardHeader, SectionLabel } from '@/components/finance/fin-card';
import { FloatingToast } from '@/components/ui/toast';
import { DownloadSimpleIcon, SpinnerGapIcon, WarningIcon, CheckCircleIcon, ClockIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/* ── Types locaux ────────────────────────────────────────────────────── */

interface FournisseurRow {
  id:      number;
  rank:    number;
  name:    string;
  ref:     string;
  montant: number;
  echeance: string;
  retard:  number; // jours de retard (0 = pas en retard)
  status:  'critique' | 'retard' | 'a_echoir' | 'regle';
}

interface BalanceAgeeRow {
  tranche: string;
  montant: number;
  pct:     number;
  color:   string;
}

/* ── Données mock sans équivalent API ───────────────────────────────── */

const FOURNISSEURS_MOCK: FournisseurRow[] = [
  { id: 1, rank: 1, name: 'TOTAL Sénégal',          ref: 'F-SN-2026-0412', montant: 8_400_000,  echeance: '25/06/2026', retard: 15, status: 'retard'   },
  { id: 2, rank: 2, name: 'MAERSK Line Afrique',    ref: 'F-SN-2026-0389', montant: 6_200_000,  echeance: '01/07/2026', retard: 0,  status: 'a_echoir' },
  { id: 3, rank: 3, name: 'BOLLORÉ Logistics CI',   ref: 'F-CI-2026-0221', montant: 5_800_000,  echeance: '18/06/2026', retard: 22, status: 'critique'  },
  { id: 4, rank: 4, name: 'COLAS Afrique de l\'Ouest', ref: 'F-SN-2026-0401', montant: 4_100_000, echeance: '30/07/2026', retard: 0,  status: 'a_echoir' },
  { id: 5, rank: 5, name: 'SOTELMA Telecom',        ref: 'F-SN-2026-0188', montant: 1_900_000,  echeance: '10/06/2026', retard: 30, status: 'critique'  },
];

const BALANCE_AGEE_MOCK: BalanceAgeeRow[] = [
  { tranche: '0 – 30 jours',  montant: 8_200_000, pct: 37, color: '#10B981' },
  { tranche: '31 – 60 jours', montant: 5_400_000, pct: 25, color: '#F59E0B' },
  { tranche: '61 – 90 jours', montant: 4_800_000, pct: 22, color: '#F97316' },
  { tranche: '> 90 jours',    montant: 3_300_000, pct: 16, color: '#EF4444' },
];

const STATUS_STYLE: Record<FournisseurRow['status'], { dot: string; label: string; text: string }> = {
  critique: { dot: 'bg-[#EF4444]', label: 'Critique',   text: 'text-[#DC2626]'        },
  retard:   { dot: 'bg-[#F97316]', label: 'En retard',  text: 'text-[#EA580C]'        },
  a_echoir: { dot: 'bg-[#10B981]', label: 'À échoir',   text: 'text-[var(--ok600)]'   },
  regle:    { dot: 'bg-[var(--tx-3)]', label: 'Réglé',  text: 'text-[var(--tx-3)]'   },
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtM(v: number, digits = 1) {
  return `${(v / 1_000_000).toFixed(digits)}M FCFA`;
}

function fmtSolde(v: number) {
  return v.toLocaleString('fr-FR') + ' FCFA';
}

/* ── Skeleton KPI ────────────────────────────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 sm:p-5 animate-pulse">
          <div className="h-3 w-24 bg-[#EEF2F7] rounded mb-3" />
          <div className="h-7 w-20 bg-[#EEF2F7] rounded mb-2" />
          <div className="h-2.5 w-32 bg-[#EEF2F7] rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function DettesFournisseursPage() {
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
  const snap    = latestSnapshot;
  const isKpiLoading = latestSnapshotLoading && !snap;

  // KPI cards
  const kpiCards = snap
    ? [
        {
          label:  'Dettes fournisseurs totales',
          value:  fmtM(snap.total_payables),
          sub:    `Snapshot · ${snap.period_label}`,
          color:  '#DC2626',
          icon:   <WarningIcon size={14} className="inline mr-0.5" />,
        },
        {
          label:  'Dettes en retard',
          value:  fmtM(snap.overdue_payables),
          sub:    `${snap.overdue_payables_count} fournisseur${snap.overdue_payables_count > 1 ? 's' : ''} en retard`,
          color:  '#F97316',
          icon:   <ClockIcon size={14} className="inline mr-0.5" />,
        },
        {
          label:  'Fournisseurs en retard',
          value:  `${snap.overdue_payables_count}`,
          sub:    `sur ${FOURNISSEURS_MOCK.length} fournisseurs actifs`,
          color:  snap.overdue_payables_count > 2 ? '#DC2626' : '#F59E0B',
          icon:   null,
        },
        {
          label:  'Ratio créances / dettes',
          value:  snap.total_payables > 0
            ? `${(snap.total_receivables / snap.total_payables).toFixed(2)}x`
            : '—',
          sub:    snap.total_payables > 0 && snap.total_receivables > snap.total_payables
            ? 'Créances > Dettes — situation saine'
            : 'Dettes > Créances — surveiller',
          color:  snap.total_receivables >= snap.total_payables ? '#1B6B45' : '#DC2626',
          icon:   snap.total_receivables >= snap.total_payables
            ? <CheckCircleIcon size={14} className="inline mr-0.5" />
            : <WarningIcon size={14} className="inline mr-0.5" />,
        },
      ]
    : null;

  // Évolution dettes (oldest → newest)
  const evoData = [...snapshots]
    .sort((a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime())
    .map(s => ({
      mois:   FR_MONTHS_SHORT[new Date(s.snapshot_at).getMonth()],
      dettes: +(s.total_payables   / 1_000_000).toFixed(2),
      retard: +(s.overdue_payables / 1_000_000).toFixed(2),
    }));

  // Balance âgée : utilise le total réel si disponible, sinon mock
  const balanceMock = BALANCE_AGEE_MOCK;
  const balanceTotal = snap?.total_payables ?? balanceMock.reduce((s, r) => s + r.montant, 0);

  // Données bar chart balance âgée
  const balanceBarData = balanceMock.map(r => ({ tranche: r.tranche.split(' ')[0] + 'j', montant: +(r.montant / 1_000_000).toFixed(2) }));

  const maxMontant = Math.max(...FOURNISSEURS_MOCK.map(f => f.montant), 1);

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <FinSectionHeader
        title="Dettes fournisseurs"
        secondaryAction={{ label: 'Exporter', icon: <DownloadSimpleIcon size={13} />, onClick: () => {} }}
        actionLabel="+ Règlement"
        onAction={() => {}}
      />

      {/* KPI row */}
      {isKpiLoading ? (
        <KpiSkeleton />
      ) : kpiCards ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {kpiCards.map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] p-4 sm:p-5">
              <p className="text-[11px] text-[var(--tx-3)] mb-1">{k.label}</p>
              <p className="font-display font-bold text-lg leading-tight" style={{ color: k.color }}>
                {k.icon}{k.value}
              </p>
              <p className="text-[11px] text-[var(--tx-3)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">

          {/* Évolution dettes (données réelles depuis snapshots) */}
          {snapshotsLoading && evoData.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--bd-def)] p-4 h-[240px] flex items-center justify-center">
              <SpinnerGapIcon size={24} className="animate-spin text-[var(--tx-3)]" />
            </div>
          ) : evoData.length > 0 ? (
            <FinLineChart
              title="Évolution des dettes fournisseurs"
              subtitle="Historique des snapshots · Millions FCFA"
              data={evoData}
              series={[
                { yKey: 'dettes', yName: 'Total dettes',  stroke: '#1E5B3C', type: 'area' },
                { yKey: 'retard', yName: 'En retard',     stroke: '#F97316', type: 'line' },
              ]}
              height={200}
            />
          ) : null}

          {/* Balance âgée fournisseurs (mock — pas de route API par tranche) */}
          <FinBarChart
            title="Balance âgée fournisseurs"
            subtitle="Répartition par ancienneté · Millions FCFA · Estimation"
            data={balanceBarData}
            xKey="tranche"
            series={[{ yKey: 'montant', yName: 'Montant dû (M FCFA)', fill: '#1E5B3C' }]}
            height={180}
          />

          {/* Liste fournisseurs (mock — pas de route API par fournisseur) */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader
                title="Fournisseurs — encours"
                badge={
                  <span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(239,68,68,.1)] px-2 py-0.5 rounded-full">
                    {FOURNISSEURS_MOCK.filter(f => f.status === 'critique' || f.status === 'retard').length} en retard
                  </span>
                }
                action="Exporter"
                onAction={() => {}}
              />
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
                  {['#', 'Fournisseur', 'Référence', 'Montant dû', 'Échéance', 'Retard', 'Statut'].map(h => (
                    <th key={h} className={cn('px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)]', h === 'Fournisseur' || h === '#' ? 'text-left' : 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bd-def)]">
                {FOURNISSEURS_MOCK.map(f => {
                  const s = STATUS_STYLE[f.status];
                  const pct = Math.round((f.montant / maxMontant) * 100);
                  return (
                    <tr key={f.id} className="hover:bg-[var(--bg-sink)] transition-colors">
                      <td className="px-4 py-3 text-[var(--tx-3)] font-mono">{f.rank}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-[var(--tx-1)]">{f.name}</p>
                          <div className="mt-1 h-[3px] bg-[var(--bg-sink)] rounded-full overflow-hidden w-24">
                            <div className="h-full rounded-full bg-[#DC2626]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--tx-3)] text-[11px]">{f.ref}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--tx-1)]">{fmtSolde(f.montant)}</td>
                      <td className="px-4 py-3 text-right text-[var(--tx-2)]">{f.echeance}</td>
                      <td className={cn('px-4 py-3 text-right font-semibold', f.retard > 0 ? 'text-[#DC2626]' : 'text-[var(--tx-3)]')}>
                        {f.retard > 0 ? `+${f.retard}j` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full')}>
                          <span className={cn('w-[6px] h-[6px] rounded-full flex-shrink-0', s.dot)} />
                          <span className={s.text}>{s.label}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--bd-def)] bg-[var(--bg-sink)] font-bold">
                  <td colSpan={3} className="px-4 py-3 text-sm">Total encours</td>
                  <td className="px-4 py-3 text-right font-mono text-[#DC2626]">
                    {snap ? fmtM(snap.total_payables) : fmtSolde(FOURNISSEURS_MOCK.reduce((s, f) => s + f.montant, 0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </FinCard>
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4">

          {/* Balance âgée détail (mock) */}
          <FinCard>
            <SectionLabel className="mb-3">Balance âgée fournisseurs</SectionLabel>
            {balanceMock.map((r, i) => {
              const realPct = snap
                ? Math.round((r.montant / balanceTotal) * 100)
                : r.pct;
              return (
                <div key={i} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] text-[var(--tx-2)]">{r.tranche}</p>
                    <p className="text-[12px] font-bold font-mono" style={{ color: r.color }}>
                      {fmtM(r.montant, 1)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-[5px] bg-[var(--bg-sink)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${realPct}%`, backgroundColor: r.color }} />
                    </div>
                    <span className="text-[10px] text-[var(--tx-3)] w-8 text-right font-mono">{realPct}%</span>
                  </div>
                </div>
              );
            })}
            <div className="mt-3 pt-3 border-t border-[var(--bd-def)] flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[var(--tx-2)]">Total</p>
              <p className="text-[12px] font-bold font-mono text-[#DC2626]">
                {fmtM(balanceTotal)}
              </p>
            </div>
            <p className="mt-2 text-[10px] text-[var(--warn600)]">
              ⚠ Répartition par tranche estimée. Total consolidé depuis l&apos;API snapshot.
            </p>
          </FinCard>

          {/* Résumé snapshot */}
          {snap && (
            <FinCard className="border-[rgba(220,38,38,.2)] bg-[rgba(220,38,38,.02)]">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-md bg-[rgba(220,38,38,.15)] flex items-center justify-center">
                  <WarningIcon size={13} className="text-[#DC2626]" />
                </span>
                <p className="text-[12px] font-semibold text-[var(--tx-1)]">Synthèse snapshot</p>
              </div>
              <div className="space-y-2 text-[12px] text-[var(--tx-2)] leading-relaxed">
                <div className="flex justify-between">
                  <span className="text-[var(--tx-3)]">Total dettes</span>
                  <span className="font-semibold font-mono text-[#DC2626]">{fmtM(snap.total_payables)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tx-3)]">Dettes en retard</span>
                  <span className="font-semibold font-mono text-[#F97316]">{fmtM(snap.overdue_payables)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tx-3)]">Fournisseurs en retard</span>
                  <span className="font-semibold">{snap.overdue_payables_count}</span>
                </div>
                <div className="flex justify-between border-t border-[rgba(220,38,38,.15)] pt-2 mt-2">
                  <span className="text-[var(--tx-3)]">Créances / Dettes</span>
                  <span className={cn('font-bold', snap.total_receivables >= snap.total_payables ? 'text-[var(--ok600)]' : 'text-[#DC2626]')}>
                    {snap.total_payables > 0 ? `${(snap.total_receivables / snap.total_payables).toFixed(2)}x` : '—'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-[var(--tx-3)] mt-3 pt-2 border-t border-[rgba(220,38,38,.15)]">
                Snapshot · {new Date(snap.snapshot_at).toLocaleDateString('fr-FR')} · {snap.period_label}
              </p>
            </FinCard>
          )}

          {/* Actions rapides */}
          <FinCard>
            <SectionLabel className="mb-3">Actions rapides</SectionLabel>
            <div className="space-y-2">
              {[
                { label: 'Préparer virements urgents',     sub: `${snap?.overdue_payables_count ?? 0} fournisseurs en retard`, color: '#DC2626' },
                { label: 'Exporter balance âgée',           sub: 'PDF · Excel · CSV',                                          color: 'var(--tx-2)' },
                { label: 'Planifier règlements du mois',    sub: 'Créer calendrier de paiements',                              color: 'var(--p500)' },
              ].map(a => (
                <button
                  key={a.label}
                  className="w-full flex items-start gap-3 p-2.5 rounded-lg border border-[var(--bd-def)] hover:bg-[var(--bg-sink)] transition-colors text-left"
                >
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: a.color }} />
                  <div>
                    <p className="text-[12px] font-medium text-[var(--tx-1)]">{a.label}</p>
                    <p className="text-[10px] text-[var(--tx-3)]">{a.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </FinCard>
        </div>
      </div>

      <FloatingToast message={toast?.msg ?? null} type={toast?.type ?? 'error'} />
    </div>
  );
}
