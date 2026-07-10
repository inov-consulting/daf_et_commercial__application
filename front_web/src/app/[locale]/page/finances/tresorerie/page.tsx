'use client';

import { FinSectionHeader } from '@/components/finance/fin-section-header';
import { FinKpiRow } from '@/components/finance/fin-kpi-row';
import { FinBarChart, FinLineChart } from '@/components/finance/fin-chart';
import { FinCard, FinCardHeader, SectionLabel } from '@/components/finance/fin-card';
import { Button } from '@/components/ui/button';
import { ArrowUpIcon, ArrowDownIcon, DownloadSimpleIcon, PlusIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { FinKpi, CompteBancaire, EcheanceItem } from '@/types/finance_type';

/* ── Mock data ─────────────────────────────────────────────────── */

const KPI_DATA: FinKpi[] = [
  { label: 'Solde global net',      value: '34,8M FCFA', sub: '5 comptes consolidés',         trend: 'up', trendVal: '+17%',  accent: 'success' },
  { label: 'Flux entrants · Juin',  value: '73,2M FCFA', sub: 'vs 87,7M en mai',              trend: 'up', trendVal: '+12%',  accent: 'success' },
  { label: 'Flux sortants · Juin',  value: '59,8M FCFA', sub: 'dont 17,2M masse salariale',   trend: 'up', trendVal: '+8%',   accent: 'warning' },
  { label: 'Projection solde J+30', value: '34,1M FCFA', sub: 'Seuil min · 20M — ✓ Respecté', trend: 'neutral', trendVal: '≈ stable', accent: 'primary' },
];

const EVOLUTION_DATA = [
  { mois: 'Jan', solde: 24.4, prev: 20 },
  { mois: 'Fév', solde: 31.2, prev: 24 },
  { mois: 'Mar', solde: 10.4, prev: 28 },
  { mois: 'Avr', solde: 33.4, prev: 30 },
  { mois: 'Mai', solde: 29.7, prev: 32 },
  { mois: 'Jun', solde: 38.6, prev: 34 },
];

const FLUX_DATA = [
  { mois: 'Jan', entrant: 68, sortant: 52 },
  { mois: 'Fév', entrant: 72, sortant: 55 },
  { mois: 'Mar', entrant: 58, sortant: 70 },
  { mois: 'Avr', entrant: 80, sortant: 58 },
  { mois: 'Mai', entrant: 88, sortant: 63 },
  { mois: 'Jun', entrant: 96, sortant: 63 },
];

const COMPTES: CompteBancaire[] = [
  { id: 1, banque: 'SGBCI · Sénégal',       pays: 'SN', ref: 'SN-SGBCI-001-4892', solde: 18_720_000, trend:  5.2 },
  { id: 2, banque: 'BICICI · Côte d\'Ivoire', pays: 'CI', ref: 'CI-BICICI-002-7341', solde:  8_940_000, trend:  1.8 },
  { id: 3, banque: 'ECOBANK · Sénégal',      pays: 'SN', ref: 'SN-ECOB-001-2241',   solde:  3_180_000, trend: -12  },
  { id: 4, banque: 'BOA · Côte d\'Ivoire',   pays: 'CI', ref: 'CI-BOA-003-5588',    solde:  2_460_000, trend:  0.4 },
  { id: 5, banque: 'UBA · Sénégal',          pays: 'SN', ref: 'SN-UBA-001-8823',    solde:  1_500_000, trend:  0   },
];

const ECHEANCES: EcheanceItem[] = [
  { id: 1, date: '10 juil.',  label: 'Loyers bureaux Dakar',     sub: 'Virement fournisseur',        montant: -4_200_000, status: 'urgent'   },
  { id: 2, date: '15 juil.',  label: 'Masse salariale',           sub: 'Paie Juin 2026',              montant: -17_200_000, status: 'planifie' },
  { id: 3, date: '18 juil.',  label: 'SONACOS · Règlement',       sub: 'FAC-2026-0089',               montant:  14_200_000, status: 'confirme' },
  { id: 4, date: '20 juil.',  label: 'Impôts & taxes DGI',        sub: 'Acompte IS T3',               montant: -6_800_000, status: 'planifie' },
  { id: 5, date: '25 juil.',  label: 'PETROCI · Solde mission',   sub: 'FAC-2026-0104',               montant:  9_800_000, status: 'attente'  },
  { id: 6, date: '31 juil.',  label: 'Assurances NSIA',           sub: 'Prime annuelle',              montant: -2_100_000, status: 'planifie' },
];

const PROJECTION_J90 = [
  { label: "Aujourd'hui", montant: '34,8 M', bar: 100 },
  { label: 'J+30 · 5 août', montant: '34,1 M', bar: 98 },
  { label: 'J+60 · 4 sep.', montant: '28,6 M', bar: 82 },
  { label: 'J+90 · 4 oct.', montant: '31,4 M', bar: 90 },
];

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  urgent:   { dot: 'bg-[#EF4444]', label: 'Urgent' },
  planifie: { dot: 'bg-[var(--p500)]', label: 'Planifié' },
  confirme: { dot: 'bg-[var(--ok500)]', label: 'Confirmé' },
  attente:  { dot: 'bg-[var(--warn500)]', label: 'En attente' },
};

function fmtMontant(v: number) {
  const abs = Math.abs(v / 1_000_000);
  return `${v < 0 ? '−' : '+'}${abs.toFixed(1)} M FCFA`;
}

function fmtSolde(v: number) {
  return `${(v / 1_000_000).toFixed(3).replace('.', ',')} 000 FCFA`;
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function TresoreriePage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <FinSectionHeader
        title="Trésorerie nette"
        secondaryAction={{ label: 'Exporter', icon: <DownloadSimpleIcon size={13} />, onClick: () => {} }}
        actionLabel="+ Virement"
        onAction={() => {}}
      />

      <FinKpiRow kpis={KPI_DATA} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <FinLineChart
            title="Évolution trésorerie nette"
            subtitle="Jan – Juin 2026 · FCFA consolidé"
            data={EVOLUTION_DATA}
            series={[
              { yKey: 'solde', yName: 'Solde net', stroke: '#1B6B45', type: 'area' },
              { yKey: 'prev',  yName: 'Prévision',  stroke: '#1B6B45', type: 'line' },
            ]}
            height={200}
          />
          <FinBarChart
            title="Flux entrants vs sortants"
            subtitle="Jan – Juin 2026 · Millions FCFA"
            data={FLUX_DATA}
            series={[
              { yKey: 'entrant', yName: 'Entrants', fill: '#1E5B3C' },
              { yKey: 'sortant', yName: 'Sortants', fill: '#FCA5A5' },
            ]}
            height={200}
          />

          {/* Comptes bancaires */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader
                title="Comptes bancaires"
                badge={<span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">{COMPTES.length} comptes</span>}
                action="Rapprochement"
                onAction={() => {}}
              />
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-[var(--bd-def)]">
                {COMPTES.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--bg-sink)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[var(--bg-sink)] border border-[var(--bd-def)] flex items-center justify-center text-[9px] font-bold text-[var(--tx-3)]">{c.pays}</span>
                        <div>
                          <p className="font-medium text-[var(--tx-1)]">{c.banque}</p>
                          <p className="text-[10px] text-[var(--tx-3)] font-mono">{c.ref}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--tx-1)]">{fmtSolde(c.solde)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('text-[11px] font-semibold', c.trend > 0 ? 'text-[var(--ok600)]' : c.trend < 0 ? 'text-[#DC2626]' : 'text-[var(--tx-3)]')}>
                        {c.trend > 0 ? '▲' : c.trend < 0 ? '▼' : ''}  {Math.abs(c.trend)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--bd-def)] bg-[var(--bg-sink)] font-bold">
                  <td className="px-4 py-3">Total consolidé</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--tx-1)]">34 800 000 FCFA</td>
                  <td className="px-4 py-3 text-right text-[var(--ok600)]">▲ +17%</td>
                </tr>
              </tfoot>
            </table>
          </FinCard>
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Échéances */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader
                title="Échéances · Juillet"
                badge={<span className="text-[11px] font-semibold text-[var(--ok600)] bg-[rgba(16,185,129,.1)] px-2 py-0.5 rounded-full">{ECHEANCES.length} à venir</span>}
                action="Calendrier"
                onAction={() => {}}
              />
            </div>
            <div className="divide-y divide-[var(--bd-def)]">
              {ECHEANCES.map(e => {
                const s = STATUS_STYLE[e.status];
                return (
                  <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-sink)] transition-colors">
                    <p className="text-[11px] text-[var(--tx-3)] font-mono w-14 flex-shrink-0 pt-0.5">{e.date}</p>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn('w-[6px] h-[6px] rounded-full flex-shrink-0', s.dot)} />
                        <p className="text-[12px] font-medium text-[var(--tx-1)] truncate">{e.label}</p>
                      </div>
                      <p className="text-[10px] text-[var(--tx-3)] truncate">{e.sub}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn('text-[12px] font-semibold', e.montant < 0 ? 'text-[#DC2626]' : 'text-[var(--ok600)]')}>
                        {fmtMontant(e.montant)}
                      </p>
                      <span className="text-[9px] text-[var(--tx-3)] bg-[var(--bg-sink)] px-1.5 py-0.5 rounded">{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </FinCard>

          {/* Solde prévisionnel J+90 */}
          <FinCard>
            <SectionLabel>Solde prévisionnel J+90</SectionLabel>
            <div className="space-y-3">
              {PROJECTION_J90.map((p, i) => (
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
            <p className="mt-3 pt-3 border-t border-[var(--bd-def)] text-[10px] text-[var(--warn600)] leading-relaxed">
              ⚠ Attention : passage sous 30M prévu mi-septembre si les créances TRANSCONT (18,3M) ne sont pas encaissées avant le 5 sept.
            </p>
          </FinCard>
        </div>
      </div>
    </div>
  );
}
