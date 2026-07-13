import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FinCard, FinCardHeader } from './fin-card';
import type { CreanceClient, DsoStatus } from '@/types/finance_type';

const STATUS_STYLE: Record<DsoStatus, { bar: string; text: string }> = {
  critique: { bar: '#EF4444', text: 'text-[#DC2626]' },
  a_risque: { bar: '#F97316', text: 'text-[#EA580C]' },
  normal:   { bar: '#10B981', text: 'text-[var(--ok600)]' },
};

function fmtM(v: number) {
  return `${(v / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}M`;
}

function CreanceRow({ c, maxMontant, onClick }: { c: CreanceClient; maxMontant: number; onClick?: () => void }) {
  const s    = STATUS_STYLE[c.status];
  const pct  = Math.round((c.montant / maxMontant) * 100);
  return (
    <div
      className={cn('flex items-center gap-3 py-2.5 border-b border-[var(--bd-def)] last:border-0', onClick && 'cursor-pointer hover:bg-[var(--bg-sink)] rounded-lg px-2 -mx-2 transition-colors')}
      onClick={onClick}
    >
      <span className="text-[11px] text-[var(--tx-3)] font-mono w-4 flex-shrink-0">{c.rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--tx-1)] truncate">{c.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-[4px] bg-[var(--bg-sink)] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.bar }} />
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn('text-xs font-bold', s.text)}>{fmtM(c.montant)}</p>
        <p className="text-[10px] text-[var(--tx-3)] font-mono">{c.dso}j</p>
      </div>
    </div>
  );
}

interface Props {
  creances:   CreanceClient[];
  onVoirTout?: () => void;
}

export function CreancesTop({ creances, onVoirTout }: Props) {
  const router  = useRouter();
  const params  = useParams();
  const locale  = typeof params?.locale === 'string' ? params.locale : 'fr';
  const maxMontant = Math.max(...creances.map(c => c.montant), 1);

  return (
    <FinCard>
      <FinCardHeader title="Créances clients" badge={<span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">Top {creances.length}</span>} action="Voir tout" onAction={onVoirTout} />
      <div>
        {creances.map(c => (
          <CreanceRow
            key={c.id}
            c={c}
            maxMontant={maxMontant}
            onClick={() => router.push(`/${locale}/page/finances/dso-creances/${c.id}`)}
          />
        ))}
      </div>
    </FinCard>
  );
}
