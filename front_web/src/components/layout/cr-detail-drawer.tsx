import { fetchCompteRenduDetail } from '@/redux/features/compte-rendus/compteRendusSlice';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { GlobalCR, GlobalCRDetail } from '@/types/prospect_note_type';
import { CircleNotchIcon, FileIcon, DownloadSimpleIcon, XIcon } from '@phosphor-icons/react';
import React, { useEffect } from 'react'

/* ── Drawer responsive override ─────────────────────────────────── */
const DRAWER_CSS = `
<style id="drawer-overrides">
  .shell { padding: 16px 16px 40px !important; max-width: 100% !important; }
  .status-bar { flex-wrap: wrap !important; gap: 8px 12px !important; padding: 10px 14px !important; }
  .status-bar-left { flex: 1 1 100% !important; min-width: 0; }
  .status-steps { flex-wrap: wrap !important; gap: 2px !important; }
  .doc-meta-sm { margin-left: 0 !important; }
  .toolbar { flex-wrap: wrap !important; gap: 8px !important; }
  .toolbar-right { flex-wrap: wrap !important; }
  .doc-cover { padding: 24px 20px !important; border-radius: 8px 8px 0 0 !important; }
  .cover-meta-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
  .doc-inner { padding: 24px 20px !important; }
  .sig-grid { grid-template-columns: 1fr !important; }
  @media (max-width: 600px) {
    .cover-meta-grid { grid-template-columns: 1fr !important; }
    .cover-title { font-size: 18px !important; }
    .cover-subtitle { font-size: 13px !important; }
    .status-steps { display: none !important; }
  }
</style>
`;

/* Override exportPDF() dans l'iframe → postMessage vers le parent React */
const DRAWER_BRIDGE = `
<script id="drawer-bridge">
  window.exportPDF = function() {
    window.parent.postMessage({ type: 'cr-export-pdf' }, '*');
  };
</script>
`;

function injectDrawerStyles(html: string): string {
  let result = html.includes('</head>') ? html.replace('</head>', `${DRAWER_CSS}</head>`) : DRAWER_CSS + html;
  result = result.includes('</body>') ? result.replace('</body>', `${DRAWER_BRIDGE}</body>`) : result + DRAWER_BRIDGE;
  return result;
}

/* ── Status config ──────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  final: {
    label: 'Finalisé', bg: 'rgba(16,185,129,0.10)', text: '#0E86E8',
    border: 'rgba(16,185,129,0.25)', dot: '#10B981',
  },
  draft: {
    label: 'Brouillon', bg: 'rgba(245,158,11,0.10)', text: '#92400E',
    border: 'rgba(245,158,11,0.25)', dot: '#F59E0B',
  },
  processing: {
    label: 'En cours…', bg: 'rgba(107,53,201,0.10)', text: '#5829A8',
    border: 'rgba(107,53,201,0.20)', dot: '#6B35C9',
  },
};

const FALLBACK_STATUS = { label: '–', bg: '#F3F4F6', text: '#374151', border: '#E5E7EB', dot: '#9CA3AF' };

/* ── Helpers ────────────────────────────────────────────────────── */
function fmtSize(bytes: number) {
  if (!bytes) return '–';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function displayName(cr: GlobalCR): string {
  return cr.parent.company_name || cr.parent.name || '–';
}

const CRDetailDrawer = ({ crId, items, downloading, onClose, onDownload }: {
  crId: string | null;
  items: GlobalCR[];
  downloading: string | null;
  onClose: () => void;
  onDownload: (cr: GlobalCR) => void;
}) => {
  const dispatch = useAppDispatch();
  const detail        = useAppSelector(s => crId ? s.compteRendus.detail[crId] : undefined);
  const detailLoading = useAppSelector(s => crId ? !!s.compteRendus.detailLoading[crId] : false);

  const cr = crId ? items.find(x => x.id === crId) : undefined;
  const st = cr ? (STATUS_CFG[cr.status] ?? FALLBACK_STATUS) : FALLBACK_STATUS;

  useEffect(() => {
    if (crId && detail === undefined && !detailLoading) {
      dispatch(fetchCompteRenduDetail(crId));
    }
  }, [crId, detail, detailLoading, dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Écoute le postMessage envoyé par exportPDF() dans l'iframe */
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'cr-export-pdf' && cr) onDownload(cr);
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [cr, onDownload]);

  const open = !!crId;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/50"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-[71] w-full max-w-3xl flex flex-col bg-[var(--bg-surf)] border-l border-[var(--bd-def)] shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-6 pt-5 pb-4"
          style={{ background: 'var(--grad)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-white/70 text-[10px] font-semibold uppercase tracking-[.08em] mb-1">
                Compte-rendu · {cr ? `v${cr.version + 1}` : ''}
              </p>
              <h2 className="text-white text-[16px] font-bold leading-snug truncate">
                {cr ? displayName(cr) : ''}
              </h2>
              {cr && (
                <div className="flex items-center gap-3 mt-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}
                  >
                    {st.label}
                  </span>
                  <span className="text-white/60 text-[11px]">{fmtDate(cr.created_at)}</span>
                  <span className="text-white/60 text-[11px]">{fmtSize(cr.file_size)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {cr && (
                <button
                  type="button"
                  onClick={() => onDownload(cr)}
                  disabled={downloading === cr.id}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-60"
                  title="Télécharger le PDF"
                >
                  {downloading === cr.id
                    ? <CircleNotchIcon size={14} className="animate-spin" />
                    : <DownloadSimpleIcon size={15} />
                  }
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <XIcon size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-[var(--tx-3)]">
              <CircleNotchIcon size={22} className="animate-spin text-[var(--p500)]" />
              <p className="text-[13px]">Chargement du contenu…</p>
            </div>
          ) : (detail as GlobalCRDetail | undefined)?.content ? (
            <iframe
              srcDoc={injectDrawerStyles((detail as GlobalCRDetail).content)}
              className="flex-1 w-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title="Contenu du compte-rendu"
            />
          ) : detail && !(detail as GlobalCRDetail).content ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[var(--tx-3)]">
              <FileIcon size={28} className="opacity-40" />
              <p className="text-[13px]">Aucun contenu disponible pour ce CR.</p>
            </div>
          ) : null}
        </div>

        {/* Footer méta */}
        {cr && (
          <div className="flex-shrink-0 border-t border-[var(--bd-def)] px-6 py-3 bg-[var(--bg-sink)] flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-[10px] text-[var(--tx-3)] font-semibold uppercase tracking-wide">Parent</p>
              <p className="text-[12px] font-medium text-[var(--tx-1)] capitalize">{cr.parent_type} · {cr.parent.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--tx-3)] font-semibold uppercase tracking-wide">Notes utilisées</p>
              <p className="text-[12px] font-medium text-[var(--tx-1)]">{cr.note_ids === null ? 0 : cr.note_ids.length}</p>
            </div>
            {cr.parent.email && (
              <div>
                <p className="text-[10px] text-[var(--tx-3)] font-semibold uppercase tracking-wide">Email</p>
                <p className="text-[12px] font-medium text-[var(--tx-1)]">{cr.parent.email}</p>
              </div>
            )}
            {cr.parent.phone && (
              <div>
                <p className="text-[10px] text-[var(--tx-3)] font-semibold uppercase tracking-wide">Téléphone</p>
                <p className="text-[12px] font-medium text-[var(--tx-1)]">{cr.parent.phone}</p>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default CRDetailDrawer
