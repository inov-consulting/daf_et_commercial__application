'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeftIcon, ArrowRightIcon, ArrowArcRightIcon, CircleNotchIcon, ArrowsClockwiseIcon,
} from '@phosphor-icons/react';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import {
  type ShipmentDetail,
  SHIPMENT_STATE_CONFIG, SHIPMENT_MODE_CONFIG,
} from '@/types/transport_type';
import { cn } from '@/lib/utils';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import ApercuSection from '@/components/layout/apercu-section';
import VoyagesSection from '@/components/layout/voyages-section';
import ChargesSection from '@/components/layout/charges-section';
import ImmobilisationsSection from '@/components/layout/immobilisation-section';
import WorkflowSection from '@/components/layout/workfow-section';
import { NextStepModal } from '@/components/layout/next-step-modal';

type PageTab = 'apercu' | 'voyages' | 'charges' | 'immobilisations' | 'workflow';

const PAGE_TABS: { key: PageTab; label: string }[] = [
  { key: 'apercu',          label: 'Résumé' },
  { key: 'voyages',         label: 'Voyages' },
  { key: 'charges',         label: 'Charges' },
  { key: 'immobilisations', label: 'Immobilisations' },
  { key: 'workflow',        label: 'Workflow' },
];

export default function ShipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';
  const id     = params?.id as string;

  const [detail,         setDetail]         = useState<ShipmentDetail | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [fetchError,     setFetchError]     = useState<string | null>(null);
  const [tab,            setTab]            = useState<PageTab>('apercu');
  const [showNextStep,   setShowNextStep]   = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    GetData<ShipmentDetail>({ url: ApiRoutes.TRANSPORT_SHIPMENT(id), protected: true })
      .then(res => {
        if (cancelled) return;
        setLoading(false);
        if (res.ok && res.data) setDetail(res.data);
        else setFetchError(res.error ?? 'Erreur de chargement');
      });
    return () => { cancelled = true; };
  }, [id, refreshTrigger]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="p-5 sm:p-7">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton width="80px" height="14px" rounded="md" />
          <Skeleton width="10px" height="10px" rounded="full" />
          <Skeleton width="120px" height="14px" rounded="md" />
        </div>
        <Skeleton height="100px" rounded="lg" className="mb-4" />
        <Skeleton height="44px" rounded="lg" className="mb-5" />
        <Skeleton height="320px" rounded="lg" />
      </div>
    );
  }

  /* ── Error ── */
  if (fetchError || !detail) {
    return (
      <div className="p-5 sm:p-7">
        <button
          onClick={() => router.push(`/${locale}/page/transport`)}
          className="flex items-center gap-1.5 text-[12px] text-[var(--tx-3)] hover:text-[var(--tx-1)] mb-6 transition-colors"
        >
          <ArrowLeftIcon size={13} /> Retour aux expéditions
        </button>
        <Alert type="error" title="Impossible de charger l'expédition">
          {fetchError ?? 'Expédition introuvable'}
        </Alert>
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => setRefreshTrigger(v => v + 1)}
            className="flex items-center gap-1.5 text-[12px] text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors"
          >
            <ArrowsClockwiseIcon size={13} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  const stateCfg = detail.state ? SHIPMENT_STATE_CONFIG[detail.state] : null;
  const modeCfg  = detail.transport_mode ? SHIPMENT_MODE_CONFIG[detail.transport_mode] : null;

  return (
    <div className="p-5 sm:p-7 pb-16">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-5">
        <button
          onClick={() => router.push(`/${locale}/page/transport`)}
          className="flex items-center gap-1.5 text-[12px] text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors"
        >
          <ArrowLeftIcon size={12} /> Expéditions
        </button>
        <span className="text-[var(--tx-3)] text-[11px]">/</span>
        <span className="font-mono text-[12px] text-[var(--tx-3)]">{detail.name}</span>
      </div>

      {/* Header card */}
      <div className="bg-white border border-[var(--bd-def)] rounded-2xl shadow-sm overflow-hidden mb-5">
        <div className="h-[3px] w-full" style={{ background: 'var(--grad)' }} />
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <span className="font-mono text-[13px] font-semibold text-[#085499] bg-[#EBF5FD] px-2.5 py-1 rounded-[6px]">
              {detail.name}
            </span>
            {detail.state !== 'cancelled' && detail.state !== 'done' && (
              <button
                onClick={() => detail.workflow && setShowNextStep(true)}
                disabled={!detail.workflow}
                className={cn(
                  'h-8 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold transition-all flex-shrink-0',
                  detail.workflow
                    ? 'text-white hover:opacity-90'
                    : 'text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] cursor-not-allowed',
                )}
                style={detail.workflow ? { background: 'linear-gradient(135deg,#1B6B45,#8B6914)' } : {}}
                title={detail.workflow ? 'Avancer le workflow' : 'Aucun workflow actif'}
              >
                <ArrowArcRightIcon size={13} weight="bold" />
                Étape suivante
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {stateCfg && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-[4px] rounded-full text-[11px] font-semibold"
                style={{ background: stateCfg.bg, color: stateCfg.color }}
              >
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: stateCfg.dot }} />
                {stateCfg.label}
              </span>
            )}
            {modeCfg && (
              <span
                className="inline-flex items-center px-2 py-[4px] rounded-[6px] text-[11px] font-semibold"
                style={{ background: modeCfg.bg, color: modeCfg.color }}
              >
                {modeCfg.label}
              </span>
            )}
            {detail.partner && (
              <span className="text-[13px] font-semibold text-[var(--tx-1)]">{detail.partner}</span>
            )}
            {(detail.origin_location || detail.destination_location) && (
              <span className="text-[12px] text-[var(--tx-3)] flex items-center gap-1">
                <span>{detail.origin_location}</span>
                <ArrowRightIcon size={10} className="flex-shrink-0" />
                <span>{detail.destination_location}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--bd-def)] overflow-x-auto mb-5 bg-white rounded-t-lg">
        {PAGE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors flex-shrink-0',
              tab === t.key
                ? 'border-[#0E86E8] text-[#085499] font-semibold'
                : 'border-transparent text-[var(--tx-3)] hover:text-[var(--tx-1)]',
            )}
          >
            {t.label}
            {t.key === 'voyages' && (detail.voyages?.length ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#EBF5FD] text-[#085499] text-[9px] font-bold">
                {detail.voyages!.length}
              </span>
            )}
            {t.key === 'charges' && (detail.charges?.length ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#EBF5FD] text-[#085499] text-[9px] font-bold">
                {detail.charges!.length}
              </span>
            )}
            {t.key === 'immobilisations' && (detail.immobilizations?.length ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#FFFBEB] text-[#D97706] text-[9px] font-bold">
                {detail.immobilizations!.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'apercu'          && <ApercuSection detail={detail} />}
      {tab === 'voyages'         && <VoyagesSection detail={detail} />}
      {tab === 'charges'         && <ChargesSection detail={detail} />}
      {tab === 'immobilisations' && <ImmobilisationsSection detail={detail} />}
      {tab === 'workflow'        && <WorkflowSection workflow={detail.workflow} />}

      {/* Next-step modal */}
      {showNextStep && (
        <NextStepModal
          shipmentId={detail.id}
          shipmentName={detail.name}
          currentStep={detail.workflow?.current_step}
          onClose={() => setShowNextStep(false)}
          onSuccess={() => {
            setRefreshTrigger(v => v + 1);
            setShowNextStep(false);
          }}
        />
      )}

      {/* Loader overlay during refresh (next-step) */}
      {loading && detail && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white border border-[var(--bd-def)] rounded-xl px-4 py-2.5 shadow-lg text-[12px] text-[var(--tx-2)]">
          <CircleNotchIcon size={14} className="animate-spin text-[var(--p500)]" />
          Mise à jour…
        </div>
      )}
    </div>
  );
}
