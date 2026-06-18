'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon, PencilSimpleIcon, FileTextIcon,
  BuildingsIcon, EnvelopeIcon, PhoneIcon, CurrencyCircleDollarIcon,
} from '@phosphor-icons/react';
import { type ApiProspect, STATUS_CONFIG, SECTOR_STYLES, ProspectStatus, PROSPECT_STATUSES } from '@/types/prospect_type';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProspectDetailHeaderProps {
  prospect: ApiProspect;
  locale: string;
  onEdit: () => void;
  onMove?: (id: string, newStatus: ProspectStatus) => void;
}

function fmt(n: number | null) {
  if (!n) return '–';
  return n.toLocaleString('fr-FR') + ' FCFA';
}

export function ProspectDetailHeader({ prospect, locale, onEdit, onMove }: ProspectDetailHeaderProps) {
  const [statusOpen, setStatusOpen] = useState<string | null>(null);
  const [statusPos, setStatusPos] = useState<{ top: number; left: number } | null>(null);
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, ProspectStatus>>({});

  const router = useRouter();
  const displayStatus = (pendingStatuses[prospect.id] ?? prospect.status) as ProspectStatus;
  const statusCfg = STATUS_CONFIG[displayStatus];
  const sectorStyle = SECTOR_STYLES[prospect.portalis_sector] ?? { bg: 'rgba(100,116,139,0.1)', text: '#475569', border: 'rgba(100,116,139,0.2)' };

  const initials = prospect.company_name
    .trim().split(/\s+/)
    .map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const crUrl = `/${locale}/page/comptes-rendus/nouveau?prospect_id=${prospect.id}&company=${encodeURIComponent(prospect.company_name)}&contact=${encodeURIComponent(prospect.contact_name ?? '')}`;

  const handleClickNewReport = () => {
    router.push(crUrl);
  }

  /* Vide les overrides dès que Redux livre l'état final (succès ou rollback) */
  useEffect(() => {
    if (Object.keys(pendingStatuses).length === 0) return;
    setPendingStatuses({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect.status]);

  useEffect(() => {
    if (!statusOpen) return;
    function close() { setStatusOpen(null); setStatusPos(null); }
    document.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [statusOpen]);

  return (
    <div className="bg-[var(--bg-surf)] border border-[var(--bd-def)] rounded-2xl overflow-hidden">
      {/* Gradient top bar */}
      <div className="h-[3px]" style={{ background: 'var(--grad)' }} />

      <div className="p-5">
        {/* Back + actions row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link
            href={`/${locale}/page/prospects`}
            className="flex items-center gap-1.5 text-[12px] text-[var(--tx-3)] hover:text-[var(--p500)] transition-colors"
          >
            <ArrowLeftIcon size={13} />
            Retour aux prospects
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <PencilSimpleIcon size={13} />
              Modifier
            </Button>
            <Button variant="gradient" size="sm" onClick={handleClickNewReport}>
              <FileTextIcon size={13} />
              Nouveau CR
            </Button>
          </div>
        </div>

        {/* Main info */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0"
            style={{ background: 'var(--grad)' }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-[17px] font-bold text-[var(--tx-1)]">{prospect.company_name}</h1>
              {/* Status */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (!onMove) return;
                  if (statusOpen === prospect.id) { setStatusOpen(null); setStatusPos(null); return; }
                  const rect = e.currentTarget.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const top = spaceBelow < 220 ? rect.top - 220 : rect.bottom + 4;
                  setStatusPos({ top, left: rect.left });
                  setStatusOpen(prospect.id);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-semibold border whitespace-nowrap transition-opacity',
                  onMove ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                )}
                style={{ background: statusCfg.tagBg, color: statusCfg.tagText, borderColor: statusCfg.tagBorder }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusCfg.dotColor }} />
                {statusCfg.label}
                {onMove && <span className="ml-0.5 opacity-50">▾</span>}
              </button>

              {/* Status dropdown portal */}
              {statusOpen && statusPos && onMove && (
                <div
                  className="fixed z-[200] bg-white border border-[var(--bd-def)] rounded-xl shadow-lg py-1 min-w-[160px]"
                  style={{ top: statusPos.top, left: statusPos.left }}
                  onClick={e => e.stopPropagation()}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)] px-3 pt-1.5 pb-1">
                    Changer le statut
                  </p>
                  {PROSPECT_STATUSES.filter(s => s !== 'nouveau').map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const isCurrent = (pendingStatuses[statusOpen] ?? prospect.status) === s;
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          setPendingStatuses(prev => ({ ...prev, [statusOpen]: s }));
                          onMove(prospect.id, s);
                          setStatusOpen(null);
                          setStatusPos(null);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors',
                          isCurrent ? 'bg-[var(--bg-sink)]' : 'hover:bg-[var(--bg-sink)]',
                        )}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dotColor }} />
                        <span className={cn('flex-1', isCurrent && 'font-semibold')} style={{ color: cfg.tagText }}>
                          {cfg.label}
                        </span>
                        {isCurrent && <span className="text-[10px] text-[var(--tx-3)]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sector */}
              {prospect.portalis_sector && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                  style={{ background: sectorStyle.bg, color: sectorStyle.text, borderColor: sectorStyle.border }}
                >
                  {prospect.portalis_sector}
                </span>
              )}
            </div>

            {/* Contact */}
            {prospect.contact_name && (
              <p className="text-[13px] text-[var(--tx-2)] mb-2">
                {prospect.contact_name}
                {prospect.email && <> · <a href={`mailto:${prospect.email}`} className="hover:text-[var(--p500)]">{prospect.email}</a></>}
              </p>
            )}

            {/* Quick stats */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {prospect.expected_revenue > 0 && (
                <div className="flex items-center gap-1 text-[12px] text-[var(--tx-3)]">
                  <CurrencyCircleDollarIcon size={13} />
                  <span>{fmt(prospect.expected_revenue)}</span>
                </div>
              )}
              {prospect.phone && (
                <div className="flex items-center gap-1 text-[12px] text-[var(--tx-3)]">
                  <PhoneIcon size={13} />
                  <span>{prospect.phone}</span>
                </div>
              )}
              {prospect.team_name && (
                <div className="flex items-center gap-1 text-[12px] text-[var(--tx-3)]">
                  <BuildingsIcon size={13} />
                  <span>{prospect.team_name}</span>
                </div>
              )}
              {prospect.email && (
                <div className="flex items-center gap-1 text-[12px] text-[var(--tx-3)]">
                  <EnvelopeIcon size={13} />
                  <span>{prospect.email}</span>
                </div>
              )}
              {prospect.pipeline_age_days > 0 && (
                <span className={`text-[12px] font-medium ${prospect.pipeline_age_days >= 60 ? 'text-red-500' : prospect.pipeline_age_days >= 30 ? 'text-amber-500' : 'text-[var(--tx-3)]'}`}>
                  J+{prospect.pipeline_age_days} en pipeline
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
