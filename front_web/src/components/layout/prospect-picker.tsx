'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, ArrowLeftIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { useInfiniteProspects } from '@/hooks/useInfiniteProspects';
import {
  STATUS_CONFIG, SECTOR_STYLES, PROSPECT_STATUSES,
  hashColor, toInitials, formatFcfa,
  type ApiProspect,
} from '@/types/prospect_type';
import { cn } from '@/lib/utils';

/* ── Public types ───────────────────────────────────────────────────────── */

export type CRContextType = 'prospection' | 'transport' | 'autre';

export interface CRContext {
  type: CRContextType;
  label: string;
  sublabel?: string;
  reference?: string;
  id?: string;
}

/* ── Static config ──────────────────────────────────────────────────────── */

const CR_TYPES: { type: CRContextType; icon: string; label: string; desc: string }[] = [
  { type: 'prospection', icon: '🤝', label: 'Prospection',      desc: 'CR lié à une visite ou un suivi prospect' },
  // { type: 'transport',   icon: '🚚', label: 'Transport',        desc: 'CR lié à une opération de transport' },
  // { type: 'autre',       icon: '📋', label: 'Autre',            desc: 'CR libre, sans dossier lié' },
];

/* ── Props ──────────────────────────────────────────────────────────────── */

interface ProspectPickerProps {
  /** Si le type est déjà connu (ex : provenance page détail prospect),
   *  le picker démarre directement à l'étape correspondante. */
  initialType?: CRContextType | null;
  onSelect: (ctx: CRContext) => void;
  onSkip: () => void;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function ProspectPicker({ initialType, onSelect, onSkip }: ProspectPickerProps) {
  const singleType = CR_TYPES.length === 1;

  const [step, setStep] = useState<'type' | 'prospect'>(
    initialType === 'prospection' || singleType ? 'prospect' : 'type',
  );

  /* Filters */
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('');
  const [sector, setSector]       = useState('');

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 400);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const { items, total, loading, error, hasMore, loadMore } = useInfiniteProspects({ search, status, sector });

  /* IntersectionObserver → infinite scroll */
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  /* Handlers */
  function handleTypeSelect(type: CRContextType) {
    if (type === 'autre') {
      onSelect({ type: 'autre', label: 'CR libre' });
    } else if (type === 'transport') {
      onSelect({ type: 'transport', label: 'Opération Transport' });
    } else {
      setStep('prospect');
    }
  }

  function handleProspectSelect(p: ApiProspect) {
    onSelect({
      type: 'prospection',
      label:    p.company_name || p.lead_name,
      sublabel: p.contact_name || undefined,
      reference: `PROS-${p.id.slice(0, 8).toUpperCase()}`,
      id: p.id,
    });
  }

  /* ── Render ── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        {step === 'prospect' && !singleType && (
          <button
            onClick={() => setStep('type')}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
          >
            <ArrowLeftIcon size={14} />
          </button>
        )}
        <div>
          <h2 className="font-display text-[16px] font-bold text-[var(--tx-1)]">
            {step === 'type' ? 'Type de compte-rendu' : 'Choisissez la prospection'}
          </h2>
          <p className="text-[11px] text-[var(--tx-3)] mt-0.5">
            {step === 'type'
              ? 'Sélectionnez le contexte avant de démarrer la dictée'
              : `${total} prospect${total !== 1 ? 's' : ''} disponibles`}
          </p>
        </div>
      </div>

      {/* ── Step 1 : Type selection ── */}
      {step === 'type' && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {CR_TYPES.map(opt => (
              <button
                key={opt.type}
                onClick={() => handleTypeSelect(opt.type)}
                className="border border-[var(--bd-def)] rounded-xl p-4 text-left hover:border-primary-400 hover:bg-[rgba(14,134,232,0.04)] transition-all group"
              >
                <span className="text-[22px] mb-2 block">{opt.icon}</span>
                <div className="text-[13px] font-bold text-[var(--tx-1)] mb-1 group-hover:text-primary-600">
                  {opt.label}
                </div>
                <div className="text-[11px] text-[var(--tx-3)] leading-snug">{opt.desc}</div>
              </button>
            ))}
          </div>
          {/* <button
            onClick={onSkip}
            className="w-full text-center text-[12px] text-[var(--tx-3)] hover:text-[var(--tx-2)] py-2 transition-colors"
          >
            Continuer sans contexte →
          </button> */}
        </div>
      )}

      {/* ── Step 2 : Prospect picker ── */}
      {step === 'prospect' && (
        <div>
          {/* Filter bar */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <MagnifyingGlassIcon
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
              />
              <input
                type="text"
                value={rawSearch}
                onChange={e => setRawSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--bd-def)] bg-white text-[13px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="h-8 px-2 pr-7 rounded-lg border border-[var(--bd-def)] bg-white text-[12px] text-[var(--tx-2)] focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="">Tous statuts</option>
              {PROSPECT_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            <select
              value={sector}
              onChange={e => setSector(e.target.value)}
              className="h-8 px-2 pr-7 rounded-lg border border-[var(--bd-def)] bg-white text-[12px] text-[var(--tx-2)] focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="">Tous secteurs</option>
              {Object.keys(SECTOR_STYLES).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Prospect list — scrollable with infinite scroll */}
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-0.5">
            {error ? (
              <div className="py-10 text-center text-sm text-red-500">{error}</div>
            ) : items.length === 0 && !loading ? (
              <div className="py-10 text-center text-sm text-[var(--tx-3)]">
                Aucun prospect trouvé
              </div>
            ) : (
              <>
                {items.map(p => {
                  const statusCfg = STATUS_CONFIG[p.status];
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProspectSelect(p)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--bd-def)] bg-white hover:border-primary-400 hover:bg-[rgba(14,134,232,0.03)] transition-all text-left group"
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: hashColor(p.id) }}
                      >
                        {toInitials(p.company_name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--tx-1)] truncate group-hover:text-primary-600">
                          {p.company_name || p.lead_name}
                        </p>
                        {p.contact_name && (
                          <p className="text-[11px] text-[var(--tx-3)] truncate">{p.contact_name}</p>
                        )}
                      </div>

                      {/* Status badge */}
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0"
                        style={{
                          background:   statusCfg.tagBg,
                          color:        statusCfg.tagText,
                          borderColor:  statusCfg.tagBorder,
                        }}
                      >
                        {statusCfg.label}
                      </span>

                      {/* Pipeline */}
                      {p.expected_revenue > 0 && (
                        <span className="text-[11px] text-[var(--tx-3)] font-medium flex-shrink-0 hidden sm:block">
                          {formatFcfa(p.expected_revenue, true)}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Sentinel — triggers loadMore via IntersectionObserver */}
                <div ref={sentinelRef} className="h-2" />

                {loading && (
                  <div className="flex items-center justify-center py-4 gap-2 text-[var(--tx-3)]">
                    <CircleNotchIcon size={14} className="animate-spin" />
                    <span className="text-[12px]">Chargement…</span>
                  </div>
                )}

                {!hasMore && items.length > 0 && (
                  <p className="text-center text-[11px] text-[var(--tx-3)] py-2">
                    {total} résultat{total !== 1 ? 's' : ''} · fin de la liste
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
