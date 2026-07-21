import { FinCard, FinCardHeader } from './fin-card';
import type { BalanceAgeeItem } from '@/types/finance_type';

function fmtN(v: number) {
  return v.toLocaleString('fr-FR') + ' 000';
}

const ROW_COLOR = ['#10B981', '#0E86E8', '#F59E0B', '#EF4444', '#DC2626'];

interface Props {
  total:   number;
  lignes:  BalanceAgeeItem[];
}

export function BalanceAgee({ total, lignes }: Props) {
  return (
    <FinCard padding={false}>
      <div className="px-4 sm:px-5 pt-4 pb-1">
        <FinCardHeader title="Balance âgée" badge={<span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">{(total / 1_000_000).toFixed(1)}M total</span>} />
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-t border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
            <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)]">Tranche</th>
            <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)]">Montant</th>
            <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tx-3)]">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--bd-def)]">
          {lignes.map((l, i) => (
            <tr key={l.tranche} className="hover:bg-[var(--bg-sink)] transition-colors">
              <td className="px-4 py-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ROW_COLOR[i] ?? '#9CA3AF' }} />
                {l.tranche}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-[var(--tx-1)]">{fmtN(l.montant)}</td>
              <td className="px-4 py-2.5 text-right font-semibold" style={{ color: ROW_COLOR[i] ?? '#9CA3AF' }}>{l.pct}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[var(--bd-def)] font-bold bg-[var(--bg-sink)]">
            <td className="px-4 py-2.5">Total</td>
            <td className="px-4 py-2.5 text-right font-mono text-[var(--tx-1)]">{fmtN(total / 1000)}</td>
            <td className="px-4 py-2.5 text-right">100%</td>
          </tr>
        </tfoot>
      </table>
    </FinCard>
  );
}
