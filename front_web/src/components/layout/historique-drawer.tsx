'use client';

import { useEffect } from 'react';
import {
  XIcon, ClockIcon, UserIcon, DatabaseIcon, TagIcon,
  CircleNotchIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchApiLogDetails } from '@/redux/features/api-logs/apiLogsSlice';
import { type ApiLog, METHOD_COLORS, logStatus, fmtLogDate } from '@/types/api_log_type';

interface HistoriqueDrawerProps {
  log: ApiLog | null;
  onClose: () => void;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--p500)]">{icon}</span>
        <h3 className="text-[12px] font-semibold text-[var(--tx-3)] uppercase tracking-[.06em]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-[12px] text-[var(--tx-3)] shrink-0">{label}</span>
      <span className="text-[12px] text-[var(--tx-1)] font-medium text-right break-all">{value}</span>
    </div>
  );
}

export function HistoriqueDrawer({ log, onClose }: HistoriqueDrawerProps) {
  const dispatch = useAppDispatch();
  const details        = useAppSelector(s => log ? s.apiLogs.details[log.id] : undefined);
  const detailsLoading = useAppSelector(s => log ? !!s.apiLogs.detailsLoading[log.id] : false);

  /* Keyboard close */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Fetch details when a log is selected */
  useEffect(() => {
    if (log && details === undefined) {
      dispatch(fetchApiLogDetails(log.id));
    }
  }, [dispatch, log, details]);

  const st  = log ? logStatus(log) : null;
  const mc  = log ? (METHOD_COLORS[log.method] ?? { bg: '#F3F4F6', color: '#374151' }) : null;

  return (
    <>
      {/* Backdrop */}
      {log && (
        <div
          className="fixed inset-0 z-[70] bg-black/50"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-[71] w-full max-w-md flex flex-col bg-[var(--bg-surf)] border-l border-[var(--bd-def)] shadow-2xl transition-transform duration-300 ease-in-out ${log ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Gradient header */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4"
          style={{ background: 'var(--grad)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white/70 text-[10px] font-semibold uppercase tracking-[.08em] mb-1">
                Détail du log
              </p>
              {log && mc && (
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                  >
                    {log.method}
                  </span>
                  <span className="text-white text-[13px] font-mono truncate">{log.path}</span>
                </div>
              )}
              <p className="text-white/60 text-[11px] font-mono">
                {log ? fmtLogDate(log.created_at) : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <XIcon size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          {log && st && (
            <>
              {/* Identification */}
              <Section icon={<ClockIcon size={14} />} title="Identification">
                <Row label="ID" value={<span className="font-mono text-[11px]">{log.id}</span>} />
                <Row label="Adresse IP" value={<span className="font-mono">{log.ip_address}</span>} />
                <Row label="Durée" value={`${log.duration_ms} ms`} />
                <Row label="Code HTTP" value={
                  <span
                    className="font-mono font-bold px-2 py-0.5 rounded text-[12px]"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {log.status_code}
                  </span>
                } />
                <Row label="Statut" value={
                  <span
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                } />
                {log.error_message && (
                  <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
                    <WarningCircleIcon size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-700 leading-relaxed">{log.error_message}</p>
                  </div>
                )}
              </Section>

              {/* Utilisateur */}
              <Section icon={<UserIcon size={14} />} title="Utilisateur">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--bd-def)]">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: 'var(--grad)' }}
                  >
                    {log.user_email ? log.user_email.slice(0, 2).toUpperCase() : 'SY'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--tx-1)] truncate">
                      {log.user_email ?? 'Système / non authentifié'}
                    </p>
                    {log.user_id && (
                      <p className="text-[10px] font-mono text-[var(--tx-3)] truncate">{log.user_id}</p>
                    )}
                  </div>
                </div>
              </Section>

              {/* Paramètres de requête */}
              {log.query_params && Object.keys(log.query_params).length > 0 && (
                <Section icon={<DatabaseIcon size={14} />} title="Paramètres (query)">
                  <pre className="rounded-lg bg-[var(--bg-sink)] border border-[var(--bd-def)] p-3 text-[11px] font-mono text-[var(--tx-1)] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(log.query_params, null, 2)}
                  </pre>
                </Section>
              )}

              {/* Détails complets (body / headers) */}
              <Section icon={<DatabaseIcon size={14} />} title="Détails complets">
                {detailsLoading ? (
                  <div className="flex items-center gap-2 text-[12px] text-[var(--tx-3)] py-3">
                    <CircleNotchIcon size={13} className="animate-spin" />
                    Chargement…
                  </div>
                ) : details ? (
                  <pre className="rounded-lg bg-[var(--bg-sink)] border border-[var(--bd-def)] p-3 text-[11px] font-mono text-[var(--tx-1)] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-64">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                ) : (
                  <p className="text-[12px] text-[var(--tx-3)]">Aucun détail disponible.</p>
                )}
              </Section>

              {/* Métadonnées */}
              <Section icon={<TagIcon size={14} />} title="Métadonnées">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Méthode',    value: log.method },
                    { label: 'Horodatage', value: fmtLogDate(log.created_at) },
                    { label: 'IP source',  value: log.ip_address },
                    { label: 'Durée',      value: `${log.duration_ms} ms` },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border border-[var(--bd-def)] p-2.5">
                      <p className="text-[10px] text-[var(--tx-3)] font-semibold uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-[12px] font-mono font-medium text-[var(--tx-1)] truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
