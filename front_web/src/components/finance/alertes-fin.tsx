import { cn } from '@/lib/utils';
import { WarningIcon, InfoIcon, ClockIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { FinCard, FinCardHeader } from './fin-card';
import { Badge } from '@/components/ui/badge';
import type { AlerteFinance, AlerteLevel } from '@/types/finance_type';

const LEVEL_STYLE: Record<AlerteLevel, { border: string; bg: string; icon: React.ReactNode; badge: React.ReactNode }> = {
  critique: {
    border: '#EF4444',
    bg: 'rgba(239,68,68,.05)',
    icon: <WarningCircleIcon size={14} weight="fill" style={{ color: '#EF4444' }} />,
    badge: <Badge color="error" variant="subtle" className="text-[9px] !px-1.5 !py-0.5">Critique</Badge>,
  },
  urgent: {
    border: '#F97316',
    bg: 'rgba(249,115,22,.05)',
    icon: <WarningIcon size={14} weight="fill" style={{ color: '#F97316' }} />,
    badge: <Badge color="warning" variant="subtle" className="text-[9px] !px-1.5 !py-0.5">Urgent</Badge>,
  },
  demain: {
    border: '#F59E0B',
    bg: 'rgba(245,158,11,.05)',
    icon: <ClockIcon size={14} style={{ color: '#F59E0B' }} />,
    badge: <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(245,158,11,.1)] text-[var(--warn600)]">Demain</span>,
  },
  info: {
    border: '#1B6B45',
    bg: 'rgba(27,107,69,.04)',
    icon: <span className="text-[13px] leading-none" style={{ color: '#1B6B45' }}>✦</span>,
    badge: <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(27,107,69,.1)] text-[var(--p600)]">Info</span>,
  },
};

function AlerteRow({ alerte }: { alerte: AlerteFinance }) {
  const s = LEVEL_STYLE[alerte.level];
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-l-[3px]"
      style={{ borderLeftColor: s.border, backgroundColor: s.bg }}
    >
      <div className="flex-shrink-0 mt-0.5">{s.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <p className="text-xs font-medium text-[var(--tx-1)] flex-1 min-w-0">{alerte.title}</p>
          {s.badge}
          {alerte.tag && (
            <span className="text-[9px] font-mono text-[var(--tx-3)] bg-[var(--bg-sink)] px-1 py-0.5 rounded">{alerte.tag}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-[var(--tx-3)]">{alerte.sub}</p>
          {alerte.date && <p className="text-[10px] text-[var(--tx-3)] flex-shrink-0">{alerte.date}</p>}
        </div>
      </div>
    </div>
  );
}

interface Props {
  alertes:   AlerteFinance[];
  onDetail?: () => void;
}

export function AlertesFin({ alertes, onDetail }: Props) {
  return (
    <FinCard>
      <FinCardHeader
        title="Alertes actives"
        badge={<Badge color="error" variant="subtle" className="text-[10px]">{alertes.length}</Badge>}
        action="Détail"
        onAction={onDetail}
      />
      <div className="flex flex-col gap-2">
        {alertes.map(a => <AlerteRow key={a.id} alerte={a} />)}
      </div>
    </FinCard>
  );
}
