'use client';

import { EyeIcon } from '@phosphor-icons/react';
import { type ApiLog, METHOD_COLORS, logStatus, fmtLogDate } from '@/types/api_log_type';
import { cn } from '@/lib/utils';

interface HistoriqueTableProps {
  logs: ApiLog[];
  loading: boolean;
  onSelect: (log: ApiLog) => void;
}

function MethodBadge({ method }: { method: string }) {
  const c = METHOD_COLORS[method] ?? { bg: '#F3F4F6', color: '#374151' };
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0"
      style={{ background: c.bg, color: c.color }}
    >
      {method}
    </span>
  );
}

function Avatar({ email }: { email: string | null }) {
  const label = email ? email.slice(0, 2).toUpperCase() : 'SY';
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
      style={{ background: 'var(--grad)' }}
    >
      {label}
    </div>
  );
}

export function HistoriqueTable({ logs, loading, onSelect }: HistoriqueTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--bd-def)] bg-[var(--bg-surf)]">
        <div className="py-16 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--p500)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--bd-def)] bg-[var(--bg-surf)] py-16 flex items-center justify-center">
        <p className="text-[13px] text-[var(--tx-3)]">Aucune entrée ne correspond aux filtres.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--bd-def)] overflow-hidden">
      <div style={{ overflowX: 'auto', overflowY: 'clip' }}>
        <table className="w-full table-fixed text-[13px]" style={{ minWidth: 860 }}>
          <colgroup>
            <col style={{ width: 160 }} />
            <col />
            <col style={{ width: 120 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[var(--bg-sink)]">
            <tr className="bg-[var(--bg-sink)] border-b border-[var(--bd-def)]">
              {['Horodatage', 'Requête', 'Code · Durée', 'Utilisateur', 'Statut', ''].map(h => (
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
            {logs.map(log => {
              const st = logStatus(log);
              return (
                <tr
                  key={log.id}
                  className="bg-[var(--bg-surf)] hover:bg-[var(--bg-sink)] transition-colors cursor-pointer"
                  onClick={() => onSelect(log)}
                >
                  {/* Horodatage */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] text-[var(--tx-2)] whitespace-nowrap">
                      {fmtLogDate(log.created_at)}
                    </span>
                  </td>

                  {/* Méthode + chemin */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <MethodBadge method={log.method} />
                      <span className="font-mono text-[11px] text-[var(--tx-2)] truncate">{log.path}</span>
                    </div>
                    {log.error_message && (
                      <p className="text-[10px] text-red-500 truncate mt-0.5">{log.error_message}</p>
                    )}
                  </td>

                  {/* Code + durée */}
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-block font-mono font-bold text-[12px] px-1.5 py-0.5 rounded',
                        log.status_code >= 500 ? 'bg-red-50 text-red-600' :
                        log.status_code >= 400 ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-700',
                      )}
                    >
                      {log.status_code}
                    </span>
                    <p className="text-[10px] text-[var(--tx-3)] font-mono mt-0.5">{log.duration_ms} ms</p>
                  </td>

                  {/* Utilisateur */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar email={log.user_email} />
                      <div className="min-w-0">
                        <p className="text-[var(--tx-1)] text-[12px] font-medium truncate">
                          {log.user_email ?? 'Système'}
                        </p>
                        <p className="font-mono text-[10px] text-[var(--tx-3)] truncate">{log.ip_address}</p>
                      </div>
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-2 py-2.5 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); onSelect(log); }}
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
