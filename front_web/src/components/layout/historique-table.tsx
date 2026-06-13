'use client';

import { EyeIcon } from '@phosphor-icons/react';
import {
  type Activity,
  MODULE_STYLES,
  STATUS_STYLES,
  METHOD_STYLES,
} from '@/types/activity_type';

interface HistoriqueTableProps {
  activities: Activity[];
  onSelect: (a: Activity) => void;
}

function Avatar({ name }: { name: string }) {
  const initials = name === 'Système' || name === 'Inconnu'
    ? name.slice(0, 2).toUpperCase()
    : name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
      style={{ background: 'var(--grad)' }}
    >
      {initials}
    </div>
  );
}

export function HistoriqueTable({ activities, onSelect }: HistoriqueTableProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--tx-3)]">
        <p className="text-[13px]">Aucune activité ne correspond aux filtres.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--bd-def)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[13px]">
          <colgroup>
            <col style={{ width: 148 }} />
            <col style={{ width: 220 }} />
            <col />
            <col style={{ width: 160 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr className="bg-[var(--bg-sink)] border-b border-[var(--bd-def)]">
              {['Horodatage', 'Action / Module', 'Requête', 'Responsable', 'Statut', ''].map(h => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left text-[11px] font-semibold text-[var(--tx-3)] tracking-[.04em] uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bd-def)]">
            {activities.map(a => {
              const mod = MODULE_STYLES[a.module];
              const st = STATUS_STYLES[a.status];
              return (
                <tr
                  key={a.id}
                  className="bg-[var(--bg-surf)] hover:bg-[var(--bg-sink)] transition-colors cursor-pointer"
                  onClick={() => onSelect(a)}
                >
                  {/* Horodatage */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[12px] text-[var(--tx-2)] whitespace-nowrap">{a.ts}</span>
                  </td>

                  {/* Action + Module */}
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1"
                      style={{ background: mod.bg, color: mod.color }}
                    >
                      {a.module}
                    </span>
                    <p className="text-[var(--tx-1)] font-medium leading-tight truncate">{a.action}</p>
                  </td>

                  {/* Requête */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                        style={{ background: METHOD_STYLES[a.method].bg, color: METHOD_STYLES[a.method].color }}
                      >
                        {a.method}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--tx-2)] truncate">{a.endpoint}</span>
                    </div>
                  </td>

                  {/* Responsable */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={a.user} />
                      <div className="min-w-0">
                        <p className="text-[var(--tx-1)] font-medium truncate leading-tight">{a.user}</p>
                        <p className="text-[10px] text-[var(--tx-3)] truncate">{a.userRole}</p>
                      </div>
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {a.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-2 py-2.5 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); onSelect(a); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--p500)] hover:bg-[rgba(27,107,69,0.08)] transition-colors mx-auto"
                    >
                      <EyeIcon size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
