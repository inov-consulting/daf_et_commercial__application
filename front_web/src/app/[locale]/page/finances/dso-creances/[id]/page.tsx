'use client';

import { useParams, useRouter } from 'next/navigation';
import { FinCard, FinCardHeader, SectionLabel } from '@/components/finance/fin-card';
import { BalanceAgee } from '@/components/finance/balance-agee';
import { FinLineChart } from '@/components/finance/fin-chart';
import {
  ArrowLeftIcon, DownloadSimpleIcon, EnvelopeIcon, PhoneIcon,
  WarningIcon, ClockIcon, CheckCircleIcon, CircleDashedIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { FactureCreance, BalanceAgeeItem } from '@/types/finance_type';

/* ── Mock data ─────────────────────────────────────────────────── */

const FACTURES: FactureCreance[] = [
  { ref: 'FAC-2026-0089', objet: 'Transport marchandises · Dakar–Abidjan', emission: '15/04/2026', echeance: '15/05/2026', montant: 8_200_000, age: 68, statut: 'retard'   },
  { ref: 'FAC-2026-0104', objet: 'Affrètement navire · Terminal Dakar',    emission: '01/05/2026', echeance: '01/06/2026', montant: 4_600_000, age: 54, statut: 'retard'   },
  { ref: 'FAC-2026-0112', objet: 'Consignation portuaire · Juin 2026',      emission: '10/05/2026', echeance: '10/06/2026', montant: 1_400_000, age: 45, statut: 'retard'   },
  { ref: 'FAC-2026-0127', objet: 'Transport international · Abidjan–Dakar', emission: '25/05/2026', echeance: '25/07/2026', montant: 5_900_000, age: 15, statut: 'a_echoir' },
];

const HISTORIQUE_PAIEMENTS = [
  { date: '12/12/2025', ref: 'FAC-2025-0198', montant: 6_800_000, delai: 35, statut: 'normal'   },
  { date: '08/09/2025', ref: 'FAC-2025-0167', montant: 4_200_000, delai: 62, statut: 'retard'   },
  { date: '14/06/2025', ref: 'FAC-2025-0134', montant: 9_100_000, delai: 41, statut: 'a_risque' },
  { date: '20/02/2025', ref: 'FAC-2025-0098', montant: 3_800_000, delai: 28, statut: 'normal'   },
];

const BALANCE_AGEE: BalanceAgeeItem[] = [
  { tranche: '0 – 30 jours',  montant: 5_900_000,  pct: 29 },
  { tranche: '31 – 45 jours', montant: 1_400_000,  pct:  7 },
  { tranche: '46 – 60 jours', montant: 4_600_000,  pct: 22 },
  { tranche: '> 60 jours',    montant: 8_200_000,  pct: 42 },
];

const DSO_HISTORY = [
  { mois: 'Jan', dso: 28 },
  { mois: 'Mar', dso: 62 },
  { mois: 'Jun', dso: 41 },
  { mois: 'Sep', dso: 35 },
  { mois: 'Déc', dso: 28 },
  { mois: 'Jun', dso: 68 },
];

const STATUT_STYLE: Record<FactureCreance['statut'], { bg: string; text: string; border: string; label: string }> = {
  retard:   { bg: 'rgba(239,68,68,.08)',   text: '#DC2626', border: 'rgba(239,68,68,.25)',   label: 'En retard'  },
  a_echoir: { bg: 'rgba(249,115,22,.08)', text: '#EA580C', border: 'rgba(249,115,22,.25)', label: 'À échoir'   },
  regle:    { bg: 'rgba(16,185,129,.08)', text: '#1B6B45', border: 'rgba(16,185,129,.25)', label: 'Réglée'     },
  partiel:  { bg: 'rgba(245,158,11,.08)', text: '#B45309', border: 'rgba(245,158,11,.25)', label: 'Partiel'    },
};

const RELANCES = [
  { date: '28/06/2026', canal: 'Email',     auteur: 'Système IA',   objet: 'Relance automatique · 60 jours' },
  { date: '14/06/2026', canal: 'Téléphone', auteur: 'A. Diallo',    objet: 'Contact direct · engagement paiement 10 juil.' },
  { date: '30/05/2026', canal: 'Email',     auteur: 'Système IA',   objet: 'Relance automatique · 45 jours' },
  { date: '16/05/2026', canal: 'Email',     auteur: 'Système IA',   objet: 'Première relance · 30 jours' },
];

function fmtMontant(v: number) {
  return v.toLocaleString('fr-FR') + ' FCFA';
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function FicheCreancePage() {
  const router = useRouter();
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr';

  const totalCreance = FACTURES.filter(f => f.statut !== 'regle').reduce((s, f) => s + f.montant, 0);
  const totalRetard  = FACTURES.filter(f => f.statut === 'retard').reduce((s, f) => s + f.montant, 0);

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-lg border border-[var(--bd-def)] flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors"
        >
          <ArrowLeftIcon size={16} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-xl text-[var(--tx-1)]">Transcont SARL</h1>
          <p className="text-[12px] text-[var(--tx-3)]">Dakar, Sénégal · Client depuis 2020 · Créance active</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded-lg border border-[var(--bd-def)] flex items-center gap-1.5 text-[12px] text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors">
            <DownloadSimpleIcon size={14} /> Fiche PDF
          </button>
          <button className="h-8 px-3 rounded-lg bg-[var(--p500)] text-white flex items-center gap-1.5 text-[12px] font-semibold hover:opacity-90 transition-opacity">
            <EnvelopeIcon size={14} /> Envoyer relance
          </button>
        </div>
      </div>

      {/* KPI top row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total créance', value: fmtMontant(totalCreance), sub: '4 factures actives',     accent: '#DC2626' },
          { label: 'Montant en retard', value: fmtMontant(totalRetard), sub: '3 factures · > 45j',  accent: '#EF4444' },
          { label: 'DSO actuel',     value: '68 jours',              sub: 'Objectif 45j · +23j',    accent: '#F97316' },
          { label: 'Risque client',  value: 'Critique',              sub: 'Score 38/100',            accent: '#DC2626' },
        ].map(k => (
          <FinCard key={k.label}>
            <p className="text-[11px] text-[var(--tx-3)] mb-1">{k.label}</p>
            <p className="font-display font-bold text-lg leading-tight" style={{ color: k.accent }}>{k.value}</p>
            <p className="text-[11px] text-[var(--tx-3)] mt-1">{k.sub}</p>
          </FinCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Factures */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader
                title="Factures en cours"
                badge={<span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(239,68,68,.08)] px-2 py-0.5 rounded-full">3 en retard</span>}
              />
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
                  {['Référence', 'Objet', 'Émission', 'Échéance', 'Montant', 'Âge', 'Statut'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bd-def)]">
                {FACTURES.map(f => {
                  const s = STATUT_STYLE[f.statut];
                  return (
                    <tr key={f.ref} className="hover:bg-[var(--bg-sink)] transition-colors">
                      <td className="px-4 py-3 font-mono text-[var(--p500)]">{f.ref}</td>
                      <td className="px-4 py-3 text-[var(--tx-1)] max-w-[200px] truncate">{f.objet}</td>
                      <td className="px-4 py-3 text-[var(--tx-3)]">{f.emission}</td>
                      <td className="px-4 py-3 text-[var(--tx-3)]">{f.echeance}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-[var(--tx-1)]">{fmtMontant(f.montant)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('font-semibold', f.age > 60 ? 'text-[#DC2626]' : f.age > 45 ? 'text-[#F97316]' : 'text-[var(--tx-2)]')}>{f.age}j</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--bd-def)] bg-[var(--bg-sink)] font-bold">
                  <td colSpan={4} className="px-4 py-3">Total créance</td>
                  <td className="px-4 py-3 font-mono text-[#DC2626]">{fmtMontant(totalCreance)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </FinCard>

          {/* Historique de paiement */}
          <FinCard padding={false}>
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <FinCardHeader title="Historique des paiements" />
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
                  {['Date règlement', 'Référence', 'Montant', 'Délai de paiement', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bd-def)]">
                {HISTORIQUE_PAIEMENTS.map(p => {
                  const isNormal = p.statut === 'normal';
                  const isRetard = p.statut === 'retard';
                  return (
                    <tr key={p.ref} className="hover:bg-[var(--bg-sink)] transition-colors">
                      <td className="px-4 py-3 text-[var(--tx-3)]">{p.date}</td>
                      <td className="px-4 py-3 font-mono text-[var(--p500)]">{p.ref}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-[var(--tx-1)]">{fmtMontant(p.montant)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('font-semibold', isNormal ? 'text-[var(--ok600)]' : isRetard ? 'text-[#DC2626]' : 'text-[#F97316]')}>{p.delai} jours</span>
                      </td>
                      <td className="px-4 py-3">
                        {isNormal ? <CheckCircleIcon size={14} className="text-[var(--ok600)]" /> : isRetard ? <WarningIcon size={14} className="text-[#EF4444]" /> : <ClockIcon size={14} className="text-[#F97316]" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FinCard>

          <FinLineChart
            title="Historique DSO · Transcont SARL"
            subtitle="Sur 12 mois glissants · Jours"
            data={DSO_HISTORY}
            series={[{ yKey: 'dso', yName: 'DSO', stroke: '#F97316', type: 'line' }]}
            height={180}
            yFormatter={v => `${v}j`}
          />
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Coordonnées */}
          <FinCard>
            <SectionLabel className="mb-3">Contact client</SectionLabel>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-sink)] border border-[var(--bd-def)] flex items-center justify-center text-[11px] font-bold text-[var(--tx-2)]">MT</div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--tx-1)]">Mamadou Touré</p>
                  <p className="text-[11px] text-[var(--tx-3)]">Directeur Financier</p>
                </div>
              </div>
              <div className="pt-2 space-y-1.5 border-t border-[var(--bd-def)]">
                <a href="mailto:m.toure@transcont.sn" className="flex items-center gap-2 text-[12px] text-[var(--tx-2)] hover:text-[var(--p500)] transition-colors">
                  <EnvelopeIcon size={13} /> m.toure@transcont.sn
                </a>
                <a href="tel:+221338201540" className="flex items-center gap-2 text-[12px] text-[var(--tx-2)] hover:text-[var(--p500)] transition-colors">
                  <PhoneIcon size={13} /> +221 33 820 15 40
                </a>
              </div>
              <div className="pt-2 border-t border-[var(--bd-def)]">
                <p className="text-[11px] text-[var(--tx-3)]">Conditions habituelles</p>
                <p className="text-[12px] text-[var(--tx-1)] font-medium">Net 30 · Virement bancaire</p>
              </div>
            </div>
          </FinCard>

          {/* Balance âgée */}
          <BalanceAgee total={totalCreance} lignes={BALANCE_AGEE} />

          {/* Relances */}
          <FinCard padding={false}>
            <div className="px-4 pt-4 pb-2">
              <FinCardHeader
                title="Historique relances"
                badge={<span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">{RELANCES.length} relances</span>}
              />
            </div>
            <div className="divide-y divide-[var(--bd-def)]">
              {RELANCES.map((r, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-[12px] font-medium text-[var(--tx-1)]">{r.objet}</p>
                    <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] px-1.5 py-0.5 rounded flex-shrink-0">{r.canal}</span>
                  </div>
                  <p className="text-[11px] text-[var(--tx-3)]">{r.date} · {r.auteur}</p>
                </div>
              ))}
            </div>
          </FinCard>
        </div>
      </div>
    </div>
  );
}
