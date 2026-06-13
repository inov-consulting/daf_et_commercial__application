'use client';

import { useEffect } from 'react';
import { XIcon, ClockIcon, UserIcon, DatabaseIcon, TagIcon } from '@phosphor-icons/react';
import { type Activity, MODULE_STYLES, STATUS_STYLES } from '@/types/activity_type';

interface HistoriqueDrawerProps {
  activity: Activity | null;
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
    <div className="flex items-start justify-between gap-3 py-1.5 ">
      <span className="text-[12px] text-[var(--tx-3)] shrink-0">{label}</span>
      <span className="text-[12px] text-[var(--tx-1)] font-medium text-right">{value}</span>
    </div>
  );
}

export function HistoriqueDrawer({ activity: a, onClose }: HistoriqueDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${a ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-[71] w-full max-w-md flex flex-col bg-[var(--bg-surf)] border-l border-[var(--bd-def)] shadow-2xl transition-transform duration-300 ease-in-out ${a ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Gradient header */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4"
          style={{ background: 'var(--grad)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white/70 text-[10px] font-semibold uppercase tracking-[.08em] mb-1">
                Détail de l&apos;activité
              </p>
              <h2 className="text-white text-[15px] font-bold leading-snug line-clamp-2">
                {a?.action ?? ''}
              </h2>
              <p className="text-white/60 text-[11px] font-mono mt-1">{a?.ts ?? ''}</p>
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
          {a && (
            <>
              {/* Identification */}
              <Section icon={<ClockIcon size={14} />} title="Identification">
                <div className="overflow-hidden">
                  <Row label="ID transaction" value={<span className="font-mono">{a.txId}</span>} />
                  <Row label="Session" value={<span className="font-mono text-[11px]">{a.sess}</span>} />
                  <Row label="Adresse IP" value={<span className="font-mono">{a.ip}</span>} />
                  <Row label="Durée" value={a.duration} />
                  <Row
                    label="Statut"
                    value={
                      <span
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: STATUS_STYLES[a.status].bg, color: STATUS_STYLES[a.status].color }}
                      >
                        {a.status}
                      </span>
                    }
                  />
                </div>
              </Section>

              {/* Responsable */}
              <Section icon={<UserIcon size={14} />} title="Responsable">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--bd-def)]">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: 'var(--grad)' }}
                  >
                    {a.user.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--tx-1)]">{a.user}</p>
                    <p className="text-[11px] text-[var(--tx-3)]">{a.userRole}</p>
                  </div>
                  <span
                    className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: MODULE_STYLES[a.module].bg, color: MODULE_STYLES[a.module].color }}
                  >
                    {a.module}
                  </span>
                </div>
              </Section>

              {/* Données échangées */}
              <Section icon={<DatabaseIcon size={14} />} title="Données échangées">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--tx-3)] mb-1.5">Requête envoyée</p>
                    <pre className="rounded-lg bg-[var(--bg-sink)] border border-[var(--bd-def)] p-3 text-[11px] font-mono text-[var(--tx-1)] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                      {a.sent}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--tx-3)] mb-1.5">Réponse reçue</p>
                    <pre className="rounded-lg bg-[var(--bg-sink)] border border-[var(--bd-def)] p-3 text-[11px] font-mono text-[var(--tx-1)] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                      {a.received}
                    </pre>
                  </div>
                </div>
              </Section>

              {/* Métadonnées */}
              <Section icon={<TagIcon size={14} />} title="Métadonnées">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Module', value: a.module },
                    { label: 'Horodatage', value: a.ts },
                    { label: 'IP source', value: a.ip },
                    { label: 'Durée', value: a.duration },
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
