'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeftIcon, CaretRightIcon, PencilSimpleIcon, ArrowsClockwiseIcon,
  CircleNotchIcon, WarningIcon, CheckIcon, LockSimpleIcon,
  ArrowRightIcon, WarningCircleIcon, XIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { GetData, PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import {
  type DossierTransportDetail, type DossierEtape,
  type CostLine,
  MODE_CONFIG, STATUT_CONFIG, DOSSIER_ETAPES, ETAPE_LABELS,
} from '@/types/transport_type';
import { cn } from '@/lib/utils';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function InfoField({ label, children, mono = false, wide = false }: {
  label: string; children: React.ReactNode; mono?: boolean; wide?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-1', wide && 'col-span-2 sm:col-span-2')}>
      <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">{label}</span>
      <div className={cn(
        'px-3 py-[7px] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-lg text-[13px] text-[var(--tx-1)] font-medium leading-relaxed min-h-[36px] flex items-center flex-wrap gap-1.5',
        mono && 'font-mono text-[12px]',
      )}>
        {children}
      </div>
    </div>
  );
}

function SectionCard({ icon, title, action, children }: {
  icon: string; title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--bd-def)] rounded-2xl shadow-sm overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F4F8] bg-[#FAFBFD]">
        <div className="flex items-center gap-2 font-display text-[14px] font-bold text-[var(--tx-1)]">
          <div
            className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[11px] text-white font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#0E86E8,#6B35C9)' }}
          >{icon}</div>
          {title}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function fmtXOF(n: number | null | undefined): string {
  if (n == null) return '–';
  return n.toLocaleString('fr-FR') + ' XOF';
}

/* ── Cost table ──────────────────────────────────────────────────────────── */

function CostTable({ lines, taux_usd, taux_eur }: { lines: CostLine[]; taux_usd?: number; taux_eur?: number }) {
  const revenus = lines.filter(l => l.type === 'revenu');
  const couts   = lines.filter(l => l.type === 'cout');
  const totalCA    = revenus.reduce((s, l) => s + l.xof, 0);
  const totalCouts = couts.reduce((s, l) => s + l.xof, 0);
  const marge  = totalCA + totalCouts;
  const tauxM  = totalCA > 0 ? (marge / totalCA) * 100 : 0;
  const showFx = taux_usd || taux_eur;

  function CostRow({ l }: { l: CostLine }) {
    const neg = l.type === 'cout';
    return (
      <tr className="border-b border-[#F0F4F8] hover:bg-[#FAFCFF]">
        <td className="px-3 py-2.5 text-[12px] font-medium" style={{ color: neg ? '#7691A8' : 'var(--tx-1)' }}>{l.prestation}</td>
        <td className="px-3 py-2.5 text-right font-mono text-[12px]" style={{ color: neg ? '#DC2626' : '#2E3D4C' }}>
          {neg ? '-' : ''}{l.xof.toLocaleString('fr-FR')}
        </td>
        {showFx && <>
          <td className="px-3 py-2.5 text-right font-mono text-[12px] text-[var(--tx-2)]">{l.usd != null ? `${neg ? '-' : ''}${l.usd.toLocaleString('fr-FR')}` : '–'}</td>
          <td className="px-3 py-2.5 text-right font-mono text-[12px] text-[var(--tx-2)]">{l.eur != null ? `${neg ? '-' : ''}${l.eur.toLocaleString('fr-FR')}` : '–'}</td>
        </>}
        <td className="px-3 py-2.5 text-[11px] text-[var(--tx-3)]">{l.notes ?? ''}</td>
      </tr>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[var(--bd-def)]">
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-[var(--bg-sink)] border-b-2 border-[var(--bd-def)]">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] w-[38%]">Prestation</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] whitespace-nowrap">
                <span className="inline-block px-1.5 py-[1px] rounded text-[9px] font-bold bg-[#EBF5FD] text-[#085499]">XOF</span>
              </th>
              {showFx && <>
                <th className="px-3 py-2 text-right">
                  <span className="inline-block px-1.5 py-[1px] rounded text-[9px] font-bold bg-primary-100 text-primary">USD</span>
                </th>
                <th className="px-3 py-2 text-right">
                  <span className="inline-block px-1.5 py-[1px] rounded text-[9px] font-bold bg-[#FFFBEB] text-[#D97706]">EUR</span>
                </th>
              </>}
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)]">Notes</th>
            </tr>
          </thead>
          <tbody>
            {revenus.length > 0 && <>
              <tr><td colSpan={showFx ? 5 : 3} className="px-3 py-[5px] text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] bg-[#F0F4F8]">Revenus</td></tr>
              {revenus.map(l => <CostRow key={l.id} l={l} />)}
            </>}
            {couts.length > 0 && <>
              <tr><td colSpan={showFx ? 5 : 3} className="px-3 py-[5px] text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] bg-[#F0F4F8]">Coûts</td></tr>
              {couts.map(l => <CostRow key={l.id} l={l} />)}
            </>}
          </tbody>
          <tfoot className="border-t-2 border-[var(--bd-def)] bg-[var(--bg-sink)] font-bold">
            <tr>
              <td className="px-3 py-2.5 text-[13px] text-primary">CA Total</td>
              <td className="px-3 py-2.5 text-right font-mono text-primary">{totalCA.toLocaleString('fr-FR')}</td>
              {showFx && <><td /><td /></>}<td />
            </tr>
            <tr>
              <td className="px-3 py-2.5 text-[13px] text-[#DC2626]">Coûts Total</td>
              <td className="px-3 py-2.5 text-right font-mono text-[#DC2626]">-{Math.abs(totalCouts).toLocaleString('fr-FR')}</td>
              {showFx && <><td /><td /></>}<td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Marge calc */}
      <div
        className="flex items-center gap-6 rounded-xl px-5 py-4 mt-4 flex-wrap"
        style={{ background: 'linear-gradient(135deg,rgba(14,134,232,.04),rgba(16,185,129,.04))', border: '1px solid rgba(16,185,129,.2)' }}
      >
        {[
          { label: 'CA estimé', value: `${totalCA.toLocaleString('fr-FR')} XOF` },
          { label: 'Coûts', value: `${Math.abs(totalCouts).toLocaleString('fr-FR')} XOF` },
          { label: 'Marge brute', value: `${marge.toLocaleString('fr-FR')} XOF`, color: marge > 0 ? '#059669' : '#DC2626' },
          { label: 'Taux de marge', value: `${tauxM.toFixed(1)}%`, color: tauxM >= 20 ? '#059669' : tauxM >= 10 ? '#D97706' : '#DC2626' },
        ].map((k, i, arr) => (
          <div key={i} className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] mb-1">{k.label}</div>
              <div className="font-display text-[18px] font-bold" style={{ color: k.color ?? 'var(--tx-1)' }}>{k.value}</div>
            </div>
            {i < arr.length - 1 && <div className="w-px h-10 bg-[var(--bd-def)]" />}
          </div>
        ))}
        {showFx && (
          <div className="ml-auto text-[10px] text-[var(--tx-3)] text-right leading-5">
            {taux_usd && <div>1 USD = {taux_usd} XOF</div>}
            {taux_eur && <div>1 EUR = {taux_eur} XOF</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stepper ─────────────────────────────────────────────────────────────── */

function Stepper({ current, dossierEtape, onChange }: {
  current: DossierEtape; dossierEtape: DossierEtape; onChange: (s: DossierEtape) => void;
}) {
  const steps = DOSSIER_ETAPES;
  const ci = steps.indexOf(current);
  const di = steps.indexOf(dossierEtape);

  const subLabels: Record<DossierEtape, string> = {
    A: 'Informations', B: 'Estimation', C: 'En transit', D: 'À saisir', E: 'Verrouillé',
  };

  return (
    <div className="bg-white border border-[var(--bd-def)] rounded-2xl shadow-sm px-5 py-4 mb-5">
      <div className="flex items-center">
        {steps.map((s, i) => {
          const isDone    = i < ci;
          const isCurrent = i === ci;
          const isLocked  = i > di;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => !isLocked && onChange(s)}
                disabled={isLocked}
                className={cn('flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed group')}
              >
                <div className={cn(
                  'w-9 h-9 rounded-[10px] flex items-center justify-center font-display text-[13px] font-bold flex-shrink-0 border-2 transition-all',
                  isDone    ? 'bg-primary-100 border-primary-400 text-primary' :
                  isCurrent ? 'text-white border-transparent shadow-[0_2px_12px_rgba(107,53,201,.35)]' :
                  isLocked  ? 'bg-[#F0F4F8] border-[var(--bd-def)] text-[#C3D0DF]' :
                  'bg-white border-[var(--bd-def)] text-neutral group-hover:border-[#0E86E8]',
                )}
                style={isCurrent ? { background: 'linear-gradient(135deg,#0E86E8,#6B35C9)' } : {}}>
                  {isDone ? <CheckIcon size={14} weight="bold" /> : isLocked ? <LockSimpleIcon size={12} weight="bold" /> : s}
                </div>
                <div className="hidden sm:block">
                  <div className={cn(
                    'text-[12px] font-semibold leading-none',
                    isDone ? 'text-primary' : isCurrent ? 'text-[#085499]' : 'text-[var(--tx-2)]',
                  )}>{ETAPE_LABELS[s]}</div>
                  <div className="text-[10px] text-[var(--tx-3)] mt-0.5">{subLabels[s]}</div>
                </div>
              </button>
              {i < steps.length - 1 && (
                <div className={cn('flex-1 h-[2px] mx-3', i < ci ? 'bg-primary-400' : 'bg-[var(--bd-def)]')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step panes ──────────────────────────────────────────────────────────── */

function StepA({ d, onNext }: { d: DossierTransportDetail; onNext: () => void }) {
  const dateOuv = d.created_at
    ? new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '–';
  return (
    <div>
      <SectionCard icon="A" title="Informations dossier" action={
        <Button variant="ghost" size="xs" className="gap-1 text-[11px]">
          <PencilSimpleIcon size={12} /> Modifier
        </Button>
      }>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <InfoField label="Client">{d.client_name}</InfoField>
          <InfoField label="Interlocuteur">{d.contact_name ?? d.client_meta ?? '–'}</InfoField>
          <InfoField label="Référence offre" mono>
            {d.offre_ref ?? '–'}
            {d.offre_ref && <Badge color="neutral" variant="subtle" className="text-[9px] py-[1px] px-1.5">IA</Badge>}
          </InfoField>
          <InfoField label="Entité facturation">
            {d.entite === 'SN' ? '🇸🇳 PortaLis Sénégal' : "🇨🇮 PortaLis Côte d'Ivoire"}
          </InfoField>
          <InfoField label="Commercial responsable">{d.commercial ?? '–'}</InfoField>
          <InfoField label="Date d'ouverture">{dateOuv}</InfoField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <InfoField label="Mode transport">{MODE_CONFIG[d.mode].label}</InfoField>
          <InfoField label="Incoterm">
            {d.incoterm ?? '–'}
            {d.incoterm && <Badge color="neutral" variant="subtle" className="text-[9px] py-[1px] px-1.5">IA</Badge>}
          </InfoField>
          <InfoField label="Devise">{d.devise ?? 'XOF (FCFA)'}</InfoField>
          <InfoField label="Origine">{d.origine ?? '–'}</InfoField>
          <InfoField label="Destination">{d.destination ?? '–'}</InfoField>
          <InfoField label="Volume / Marchandise">{d.volume ?? '–'}</InfoField>
        </div>
        {d.notes && (
          <InfoField label="Notes" wide>
            <span className="leading-relaxed">{d.notes}</span>
          </InfoField>
        )}
      </SectionCard>
      <div className="flex justify-end mt-2">
        <Button variant="gradient" size="md" onClick={onNext} style={{ boxShadow: '0 2px 8px rgba(107,53,201,.2)' }}>
          Coûts estimés <ArrowRightIcon size={13} />
        </Button>
      </div>
    </div>
  );
}

function StepB({ d, onPrev, onNext }: { d: DossierTransportDetail; onPrev: () => void; onNext: () => void }) {
  const lines = d.lignes_estimees ?? [];
  return (
    <div>
      <SectionCard icon="B" title="Chiffre d'affaires estimé — C-09 Multi-devises" action={
        d.taux_usd || d.taux_eur
          ? <span className="font-mono text-[11px] text-[var(--tx-3)]">
              {d.taux_usd && `1 USD = ${d.taux_usd} XOF`}
              {d.taux_usd && d.taux_eur && ' · '}
              {d.taux_eur && `1 EUR = ${d.taux_eur} XOF`}
            </span>
          : undefined
      }>
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--tx-3)]">
            <span className="text-[13px]">Aucune ligne de coût saisie</span>
            <Button variant="ghost" size="sm">+ Ajouter des lignes</Button>
          </div>
        ) : (
          <CostTable lines={lines} taux_usd={d.taux_usd} taux_eur={d.taux_eur} />
        )}
      </SectionCard>
      <div className="flex items-center justify-between mt-2">
        <Button variant="ghost" size="md" onClick={onPrev}><ArrowLeftIcon size={13} /> Ouverture</Button>
        <Button variant="gradient" size="md" onClick={onNext} style={{ boxShadow: '0 2px 8px rgba(107,53,201,.2)' }}>
          Passer à l&apos;exécution <ArrowRightIcon size={13} />
        </Button>
      </div>
    </div>
  );
}

function StepC({ d, onPrev, onNext }: { d: DossierTransportDetail; onPrev: () => void; onNext: () => void }) {
  const portOri = d.port_origine;
  const portDst = d.port_destination;
  const voyage  = d.voyage;
  return (
    <div>
      <SectionCard icon="C" title="Itinéraire & exécution" action={
        <Button variant="ghost" size="xs" className="gap-1 text-[11px]">
          <ArrowsClockwiseIcon size={12} /> Actualiser
        </Button>
      }>
        {/* Port grid */}
        <div className="grid grid-cols-[1fr_64px_1fr] items-center gap-0 mb-4">
          {/* Port origine */}
          <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-4">
            <div className="font-mono text-[20px] font-bold text-[#085499]">
              {portOri?.code ?? (d.origine?.slice(0, 3).toUpperCase() ?? 'ORI')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--tx-1)] mt-1">{portOri?.name ?? d.origine ?? '–'}</div>
            <div className="text-[11px] text-[var(--tx-3)] mt-0.5">{portOri?.country ?? ''}</div>
            {portOri?.date && (
              <div className="text-[11px] text-[#0E86E8] font-semibold mt-2 pt-2 border-t border-[var(--bd-def)]">
                {portOri.date_label ?? 'Départ'} : {portOri.date}
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-[2px] h-8" style={{ background: 'linear-gradient(180deg,#0E86E8,#6B35C9)' }} />
            <span className="text-lg" style={{ color: '#6B35C9' }}>▽</span>
            <div className="text-[10px] font-bold text-[var(--tx-3)] font-display">
              {voyage?.transit_time ?? '–'}
            </div>
            <div className="w-[2px] h-8" style={{ background: 'linear-gradient(180deg,#6B35C9,#C2257A)' }} />
          </div>
          {/* Port destination */}
          <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-4">
            <div className="font-mono text-[20px] font-bold text-[#085499]">
              {portDst?.code ?? (d.destination?.slice(0, 3).toUpperCase() ?? 'DST')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--tx-1)] mt-1">{portDst?.name ?? d.destination ?? '–'}</div>
            <div className="text-[11px] text-[var(--tx-3)] mt-0.5">{portDst?.country ?? ''}</div>
            {portDst?.date && (
              <div className="text-[11px] text-[#0E86E8] font-semibold mt-2 pt-2 border-t border-[var(--bd-def)]">
                {portDst.date_label ?? 'Arrivée ETA'} : {portDst.date}
              </div>
            )}
          </div>
        </div>

        {/* Voyage card */}
        {voyage ? (
          <div className="rounded-xl p-4 mb-4"
               style={{ background: 'linear-gradient(135deg,rgba(14,134,232,.04),rgba(107,53,201,.04))', border: '1px solid rgba(107,53,201,.15)' }}>
            <div className="font-mono text-[12px] font-semibold" style={{ color: '#5829A8' }}>{voyage.ref}</div>
            <div className="text-[14px] font-bold text-[var(--tx-1)] mt-1">{voyage.compagnie}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
              {[
                { label: 'Mode', value: MODE_CONFIG[d.mode].label },
                { label: 'Incoterm', value: d.incoterm ?? '–' },
                { label: 'Volume', value: d.volume ?? '–' },
                voyage.bl_number ? { label: 'BL n°', value: voyage.bl_number, mono: true } : null,
                voyage.transit_time ? { label: 'Transit', value: voyage.transit_time } : null,
                voyage.temperature ? { label: 'Température', value: voyage.temperature } : null,
              ].filter(Boolean).map((m, i) => (
                <div key={i} className="text-[11px] text-[var(--tx-3)] flex items-center gap-1">
                  {m!.label} : <span className={cn('font-semibold text-[var(--tx-1)]', (m as { mono?: boolean }).mono && 'font-mono')}>{m!.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-[var(--tx-3)] text-[13px] bg-[var(--bg-sink)] rounded-xl border border-dashed border-[var(--bd-def)] mb-4">
            Informations de voyage non encore saisies
          </div>
        )}

        {/* Customs & delivery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoField label="Déclarant douane">{d.declarant_douane ?? '–'}</InfoField>
          <InfoField label="Transport terrestre final">{d.transport_final ?? '–'}</InfoField>
          <InfoField label="Réf. douane" mono>
            {d.ref_douane ?? '–'}
            {d.ref_douane && <Badge color="neutral" variant="subtle" className="text-[9px] py-[1px] px-1.5">IA</Badge>}
          </InfoField>
          <InfoField label="Statut livraison">
            {d.statut_livraison
              ? <span style={{ color: '#F59E0B', fontWeight: 600 }}>{d.statut_livraison}</span>
              : '–'}
          </InfoField>
        </div>
      </SectionCard>

      <div className="flex items-center justify-between mt-2">
        <Button variant="ghost" size="md" onClick={onPrev}><ArrowLeftIcon size={13} /> Coûts estimés</Button>
        <Button variant="gradient" size="md" onClick={onNext} style={{ boxShadow: '0 2px 8px rgba(107,53,201,.2)' }}>
          Saisir coûts réels <ArrowRightIcon size={13} />
        </Button>
      </div>
    </div>
  );
}

function StepD({ d, onPrev, onNext }: { d: DossierTransportDetail; onPrev: () => void; onNext: () => void }) {
  const linesEst  = d.lignes_estimees  ?? [];
  const linesReel = d.lignes_reelles   ?? [];
  const totalEst  = linesEst.filter(l => l.type === 'cout').reduce((s, l) => s + Math.abs(l.xof), 0);
  const totalReel = linesReel.filter(l => l.type === 'cout').reduce((s, l) => s + Math.abs(l.xof), 0);
  const ecartAbs  = totalReel - totalEst;
  const ecartPct  = totalEst > 0 ? (ecartAbs / totalEst) * 100 : 0;
  const hasEcart  = !!d.alerte;

  const caReel  = linesReel.filter(l => l.type === 'revenu').reduce((s, l) => s + l.xof, 0) || d.ca_estime;
  const margeReel = caReel > 0 && totalReel > 0 ? ((caReel - totalReel) / caReel) * 100 : d.marge_reel;

  return (
    <div>
      {hasEcart && (
        <Alert type="warning" title="Écart coûts détecté — vérification recommandée" className="mb-4">
          {d.alerte === 'critique'
            ? 'La marge réelle est passée sous le seuil critique (10%). Vérifiez les lignes de coûts avant de clôturer.'
            : 'Les coûts réels dépassent l\'estimation. Vérifiez les lignes affectées avant de procéder à la clôture.'}
        </Alert>
      )}

      {/* Compare grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Estimés */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.06em] px-3 py-2.5 rounded-lg mb-2 flex items-center gap-1.5"
               style={{ background: '#F3EFFE', color: '#5829A8' }}>
            ✦ Coûts estimés
          </div>
          <div className="bg-white border border-[var(--bd-def)] rounded-xl p-4">
            {linesEst.filter(l => l.type === 'cout').length === 0
              ? <div className="text-center py-4 text-[var(--tx-3)] text-[13px]">Aucun coût estimé</div>
              : linesEst.filter(l => l.type === 'cout').map(l => (
                <div key={l.id} className="flex justify-between items-center py-1.5 border-b border-[#F0F4F8] last:border-0 text-[12px]">
                  <span className="text-[var(--tx-2)]">{l.prestation}</span>
                  <span className="font-mono font-semibold text-[var(--tx-1)]">{Math.abs(l.xof).toLocaleString('fr-FR')} XOF</span>
                </div>
              ))
            }
            <div className="flex justify-between items-center py-2 mt-1 border-t-2 border-[var(--bd-def)] text-[13px] font-bold">
              <span className="text-[var(--tx-1)]">Total estimé</span>
              <span className="font-mono">{totalEst.toLocaleString('fr-FR')} XOF</span>
            </div>
          </div>
        </div>

        {/* Réels */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.06em] px-3 py-2.5 rounded-lg mb-2 flex items-center gap-1.5"
               style={{ background: '#FDF0F7', color: '#A01D65' }}>
            ◈ Coûts réels
          </div>
          <div className="bg-white border border-[var(--bd-def)] rounded-xl p-4">
            {linesReel.filter(l => l.type === 'cout').length === 0
              ? <div className="text-center py-4 text-[var(--tx-3)] text-[13px]">Aucun coût réel saisi</div>
              : linesReel.filter(l => l.type === 'cout').map(l => {
                  const estLine  = linesEst.find(e => e.prestation === l.prestation && e.type === 'cout');
                  const over = estLine ? l.xof > Math.abs(estLine.xof) : false;
                  return (
                    <div key={l.id} className="flex justify-between items-center py-1.5 border-b border-[#F0F4F8] last:border-0 text-[12px]">
                      <span className="text-[var(--tx-2)]">{l.prestation}</span>
                      <span className={cn('font-mono font-semibold', over ? 'text-[#DC2626]' : 'text-[var(--tx-1)]')}>
                        {l.xof.toLocaleString('fr-FR')} XOF
                      </span>
                    </div>
                  );
                })
            }
            <div className="flex justify-between items-center py-2 mt-1 border-t-2 border-[var(--bd-def)] text-[13px] font-bold">
              <span className="text-[var(--tx-1)]">Total réel</span>
              <span className={cn('font-mono', ecartAbs > 0 ? 'text-[#DC2626]' : 'text-primary')}>
                {totalReel.toLocaleString('fr-FR')} XOF
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analyse écarts */}
      {(totalEst > 0 || totalReel > 0) && (
        <SectionCard icon="≈" title="Analyse écarts">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Écart total */}
            <div className={cn('rounded-xl p-4 text-center', ecartAbs > 0 ? 'bg-[#FEF2F2]' : 'bg-primary-100')}>
              <div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] mb-1">Écart total</div>
              <div className="font-display text-[20px] font-bold" style={{ color: ecartAbs > 0 ? '#DC2626' : '#059669' }}>
                {ecartAbs > 0 ? '+' : ''}{ecartAbs.toLocaleString('fr-FR')} XOF
              </div>
              <div className="text-[11px] mt-1" style={{ color: ecartAbs > 0 ? '#EF4444' : '#10B981' }}>
                {ecartAbs > 0 ? '+' : ''}{ecartPct.toFixed(1)}% vs estimation
              </div>
            </div>
            {/* Marge réelle */}
            <div className={cn('rounded-xl p-4 text-center', (margeReel ?? 0) < 10 ? 'bg-[#FEF2F2]' : (margeReel ?? 0) < 20 ? 'bg-[#FFFBEB]' : 'bg-primary-100')}>
              <div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] mb-1">Marge réelle</div>
              <div className="font-display text-[20px] font-bold"
                   style={{ color: (margeReel ?? 0) < 10 ? '#DC2626' : (margeReel ?? 0) < 20 ? '#D97706' : '#059669' }}>
                {margeReel != null ? `${margeReel.toFixed(1)}%` : '–'}
              </div>
              {d.marge_est != null && <div className="text-[11px] text-[var(--tx-3)] mt-1">vs {d.marge_est.toFixed(1)}% estimé</div>}
            </div>
            {/* AI note */}
            <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-4">
              <div className="text-[11px] font-semibold text-[var(--tx-3)] mb-2">Analyse IA</div>
              <div className="text-[12px] text-[var(--tx-2)] leading-relaxed">
                {ecartAbs <= 0
                  ? 'Coûts réels conformes à l\'estimation. Marge maintenue dans les objectifs.'
                  : 'Dérive détectée. Vérifiez les lignes en rouge avant la clôture.'}
              </div>
              <div className="text-[10px] font-semibold mt-2 flex items-center gap-1" style={{ color: '#6B35C9' }}>
                ✦ Agent DAF · Sonnet 4.6
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      <div className="flex items-center justify-between mt-2">
        <Button variant="ghost" size="md" onClick={onPrev}><ArrowLeftIcon size={13} /> Exécution</Button>
        <Button variant="gradient" size="md" onClick={onNext} style={{ boxShadow: '0 2px 8px rgba(107,53,201,.2)' }}>
          Procéder à la clôture <ArrowRightIcon size={13} />
        </Button>
      </div>
    </div>
  );
}

function StepE({ d, onPrev, onClose, closing, closeError }: {
  d: DossierTransportDetail; onPrev: () => void;
  onClose: () => void; closing: boolean; closeError: string | null;
}) {
  const [confirm, setConfirm] = useState(false);
  const isClosed = d.statut === 'clos';

  const linesEst  = d.lignes_estimees  ?? [];
  const linesReel = d.lignes_reelles   ?? [];
  const caReel    = linesReel.filter(l => l.type === 'revenu').reduce((s, l) => s + l.xof, 0) || d.ca_estime;
  const coutsReel = linesReel.filter(l => l.type === 'cout').reduce((s, l) => s + Math.abs(l.xof), 0);
  const coutsEst  = linesEst.filter(l => l.type === 'cout').reduce((s, l) => s + Math.abs(l.xof), 0);
  const margeB    = caReel - coutsReel;
  const ecartAbs  = coutsReel > 0 && coutsEst > 0 ? ((coutsReel - coutsEst) / coutsEst) * 100 : null;

  return (
    <div>
      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <KpiCard label="CA réel (XOF)" value={caReel > 0 ? `${(caReel / 1_000_000).toFixed(1)} M` : fmtXOF(d.ca_estime)} accent="success" styleValue="text-success" />
        <KpiCard label="Coûts réels (XOF)" value={coutsReel > 0 ? `${(coutsReel / 1_000_000).toFixed(1)} M` : '–'} accent="warning" styleValue="text-[#DC2626]" />
        <KpiCard label="Marge nette réelle" value={d.marge_reel != null ? `${d.marge_reel.toFixed(1)}%` : '–'} accent="success" styleValue={d.marge_reel != null ? (d.marge_reel >= 15 ? 'text-success' : 'text-[#D97706]') : undefined} />
        <KpiCard label="Marge brute (XOF)" value={margeB > 0 ? `${(margeB / 1_000_000).toFixed(2)} M` : '–'} accent="primary" />
        <KpiCard label="Écart coûts vs est." value={ecartAbs != null ? `${ecartAbs > 0 ? '+' : ''}${ecartAbs.toFixed(1)}%` : '–'} accent={ecartAbs != null && ecartAbs > 5 ? 'warning' : 'success'} />
        <KpiCard label="Dossier" value={d.reference} accent="primary" />
      </div>

      {isClosed ? (
        <Alert type="success" title="Dossier clôturé">
          Ce dossier a été clôturé. Les données sont archivées et transmises à Odoo.
        </Alert>
      ) : (
        <div className="rounded-2xl p-6 text-center border-2 border-[rgba(239,68,68,.3)]"
             style={{ background: '#FEF2F2' }}>
          <div className="text-[32px] mb-3">🔒</div>
          <div className="font-display text-[18px] font-bold text-[var(--tx-1)] mb-2">
            Clôturer le dossier {d.reference}
          </div>
          <div className="text-[13px] text-[var(--tx-3)] max-w-[440px] mx-auto mb-5 leading-relaxed">
            Cette action est <strong className="text-[var(--tx-1)]">irréversible</strong>. Le dossier sera archivé, les coûts réels figés et les données transmises à Odoo pour facturation et reporting P&L.
          </div>

          <div className="bg-white border border-[var(--bd-def)] rounded-xl p-4 text-left max-w-[400px] mx-auto mb-5">
            <div className="text-[11px] font-bold uppercase tracking-[.06em] text-[var(--tx-3)] mb-2.5">Impacts de la clôture</div>
            {[
              'Dossier verrouillé — aucune modification possible',
              'Facture client générée automatiquement dans Odoo',
              'P&L dossier archivé dans les rapports mensuels',
              'KPIs DAF mis à jour en temps réel',
              'Synthèse mensuelle IA actualisée',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-[var(--tx-1)] py-1.5 border-b border-[#F0F4F8] last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          {closeError && <Alert type="error" className="mb-4 max-w-[400px] mx-auto text-left">{closeError}</Alert>}

          {!confirm ? (
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" size="md" onClick={onPrev}><ArrowLeftIcon size={13} /> Retour coûts réels</Button>
              <Button variant="danger" size="md" onClick={() => setConfirm(true)}>🔒 Confirmer la clôture</Button>
            </div>
          ) : (
            <div className="space-y-3 max-w-[400px] mx-auto">
              <Alert type="warning" title="Confirmation requise">
                Êtes-vous sûr de vouloir clôturer définitivement ce dossier ? Cette action ne peut pas être annulée.
              </Alert>
              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" size="md" onClick={() => setConfirm(false)}>
                  <XIcon size={13} /> Annuler
                </Button>
                <Button variant="danger" size="md" onClick={onClose} disabled={closing}>
                  {closing ? <><CircleNotchIcon size={14} className="animate-spin" /> Clôture…</> : 'Oui, clôturer définitivement'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!isClosed && (
        <div className="mt-4 pt-4 border-t border-[var(--bd-def)] flex items-center justify-between text-[11px] text-[var(--tx-3)]">
          <span>W-07 · Clôture dossier</span>
          <span>PortaLis MVP V1.0 · INOV Consulting</span>
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function DossierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';
  const id     = params?.id as string;

  const [dossier,    setDossier]    = useState<DossierTransportDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [step,       setStep]       = useState<DossierEtape>('A');
  const [closing,    setClosing]    = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchError(null);
      const res = await GetData<DossierTransportDetail>({
        url: ApiRoutes.TRANSPORT_DOSSIER(id),
        protected: true,
      });
      if (cancelled) return;
      setLoading(false);
      if (res.ok && res.data) {
        setDossier(res.data);
        const stepMap: Record<string, DossierEtape> = {
          ouvert: 'A', estim: 'B', exec: 'C', reel: 'D', clos: 'E',
        };
        setStep(stepMap[res.data.statut] ?? 'A');
      } else {
        setFetchError(res.error ?? 'Erreur de chargement');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handleClose() {
    if (!dossier) return;
    setClosing(true);
    setCloseError(null);
    const res = await PostData<{ status: string }, Record<string, never>>({
      url: ApiRoutes.TRANSPORT_DOSSIER_CLOSE(id),
      data: {},
      protected: true,
    });
    setClosing(false);
    if (res.ok) router.push(`/${locale}/page/transport`);
    else setCloseError(res.error ?? 'Erreur lors de la clôture');
  }

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="p-5 sm:p-7 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton width="80px" height="16px" rounded="md" />
          <Skeleton width="12px" height="12px" rounded="full" />
          <Skeleton width="120px" height="16px" rounded="md" />
        </div>
        <Skeleton height="110px" rounded="lg" className="mb-4" />
        <Skeleton height="80px" rounded="lg" className="mb-5" />
        <Skeleton height="320px" rounded="lg" />
      </div>
    );
  }

  /* ── Error ── */
  if (fetchError || !dossier) {
    return (
      <div className="p-5 sm:p-7 max-w-xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/page/transport`)} className="mb-6">
          <ArrowLeftIcon size={13} /> Retour
        </Button>
        <Alert type="error" title="Impossible de charger le dossier">
          {fetchError ?? 'Dossier introuvable'}
        </Alert>
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <ArrowsClockwiseIcon size={13} /> Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const st  = STATUT_CONFIG[dossier.statut];
  const mod = MODE_CONFIG[dossier.mode];
  const [from, to] = dossier.trajet.split('→').map(s => s.trim());
  const createdAt = new Date(dossier.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-5 sm:p-7 pb-16 max-w-5xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-5">
        <Button
          variant="link" size="xs"
          onClick={() => router.push(`/${locale}/page/transport`)}
          className="gap-1 !text-[12px]"
        >
          <ArrowLeftIcon size={12} /> Dossiers transport
        </Button>
        <CaretRightIcon size={10} className="text-[var(--tx-3)]" />
        <span className="font-mono text-[12px] text-[var(--tx-3)]">{dossier.reference}</span>
      </div>

      {/* Header card */}
      <div className="bg-white border border-[var(--bd-def)] rounded-2xl shadow-sm overflow-hidden mb-5 relative">
        <div className="h-[3px] w-full" style={{ background: 'var(--grad)' }} />
        <div className="p-5 sm:p-6 flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[13px] font-semibold text-[#085499] bg-[#EBF5FD] px-2.5 py-1 rounded-[6px] inline-block mb-2">
              {dossier.reference}
            </span>
            <div className="font-display text-[19px] font-bold text-[var(--tx-1)] leading-tight">
              {dossier.client_name} · Transport {mod.label.toLowerCase()}
            </div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[12px] text-[var(--tx-3)]">
              <span>{from} → {to}</span>
              {dossier.incoterm && <><span className="w-px h-3 bg-[var(--bd-def)]" /><span>{dossier.incoterm}</span></>}
              {dossier.offre_ref && <><span className="w-px h-3 bg-[var(--bd-def)]" /><span>Réf. {dossier.offre_ref}</span></>}
              <span className="w-px h-3 bg-[var(--bd-def)]" />
              <span>{dossier.entite === 'SN' ? '🇸🇳 PortaLis Sénégal' : "🇨🇮 PortaLis Côte d'Ivoire"}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2.5 py-[4px] rounded-[6px] text-[11px] font-semibold"
                style={{ background: mod.bg, color: mod.color }}
              >{mod.label}</span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-[4px] rounded-full text-[11px] font-semibold"
                style={{ background: st.bg, color: st.text }}
              >
                <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: st.dot }} />
                {st.label}
              </span>
              {dossier.alerte && (
                <WarningCircleIcon size={16} className="text-[#EF4444]" aria-label={dossier.alerte === 'critique' ? 'Marge critique' : 'Écart coûts'} />
              )}
            </div>
            <div className="text-[11px] text-[var(--tx-3)] text-right">
              Ouvert le {createdAt} · Commercial :{' '}
              <span className="font-semibold text-[var(--tx-2)]">{dossier.commercial ?? '–'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <Stepper current={step} dossierEtape={st.etape} onChange={setStep} />

      {/* Step panes */}
      {step === 'A' && <StepA d={dossier} onNext={() => setStep('B')} />}
      {step === 'B' && <StepB d={dossier} onPrev={() => setStep('A')} onNext={() => setStep('C')} />}
      {step === 'C' && <StepC d={dossier} onPrev={() => setStep('B')} onNext={() => setStep('D')} />}
      {step === 'D' && <StepD d={dossier} onPrev={() => setStep('C')} onNext={() => setStep('E')} />}
      {step === 'E' && <StepE d={dossier} onPrev={() => setStep('D')} onClose={handleClose} closing={closing} closeError={closeError} />}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-[var(--bd-def)] flex items-center justify-between text-[11px] text-[var(--tx-3)]">
        <span>W-04 · Détail dossier transport · {dateStr}</span>
        <span>PortaLis MVP V1.0 · INOV Consulting · INOV–PGH–PC–2026</span>
      </div>
    </div>
  );
}
