'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileTextIcon, DownloadSimpleIcon, SparkleIcon, CircleNotchIcon,
  ShareNetworkIcon, LinkIcon, CheckIcon, WhatsappLogoIcon,
} from '@phosphor-icons/react';
import { GetData, PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { type ProspectCR, type GlobalCR, type CRListResponse, type GenerateCRBody } from '@/types/prospect_note_type';
import { Button } from '@/components/ui/button';
import { FloatingToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchNotes } from '@/redux/features/notes/notesSlice';
import CRDetailDrawer from './cr-detail-drawer';

interface ProspectCRSectionProps {
  prospectId: string;
  prospectName?: string;
}

const STATUS_CR: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: 'Brouillon', bg: '#F3F4F6', color: '#374151' },
  final: { label: 'Finalisé', bg: '#ECFDF5', color: '#0E86E8' },
  processing: { label: 'En cours…', bg: '#FFF3E0', color: '#D97706' },
};

function fmtSize(bytes: number) {
  if (!bytes) return '–';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ProspectCRSection({ prospectId, prospectName }: ProspectCRSectionProps) {
  const dispatch = useAppDispatch();

  /* Notes depuis le store global — plus de fetch dédié dans ce composant */
  const notes = useAppSelector(s => s.notes.byProspect[prospectId] ?? []);
  const notesReady = useAppSelector(s => s.notes.byProspect[prospectId] !== undefined);

  /* S'assure que les notes sont chargées même si la section notes n'est pas visible */
  useEffect(() => {
    dispatch(fetchNotes(prospectId));
  }, [dispatch, prospectId]);

  const [crs, setCrs] = useState<ProspectCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId]       = useState<string | null>(null);

  /* Construit des GlobalCR synthétiques depuis les ProspectCR locaux */
  const syntheticParent = {
    type: 'prospection', id: prospectId,
    name: prospectName ?? '', company_name: prospectName ?? '',
    status: '', email: '', phone: '',
  };
  const globalCrs: GlobalCR[] = crs.map(cr => ({ ...cr, parent: syntheticParent }));

  function handleClose() { setSelectedId(null); }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* Ferme le popover de partage au clic extérieur */
  useEffect(() => {
    if (!shareOpenId) return;
    function handle(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-share-popover]')) {
        setShareOpenId(null);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [shareOpenId]);

  const fetchCRs = useCallback(async () => {
    setLoading(true);
    const res = await GetData<CRListResponse>({
      url: ApiRoutes.PROSPECT_CRS(prospectId),
      protected: true,
    });
    if (res.ok && res.data) setCrs(res.data.items);
    setLoading(false);
  }, [prospectId]);

  useEffect(() => { fetchCRs(); }, [fetchCRs]);

  async function generateCR() {
    if (!notesReady) {
      showToast('Les notes sont en cours de chargement, veuillez patienter un instant.');
      return;
    }

    if (notes.length === 0) {
      showToast('Ajoutez au moins une note de prospection pour pouvoir générer un compte-rendu.');
      return;
    }

    setGenerating(true);
    setGenError(null);
    const res = await PostData<ProspectCR, GenerateCRBody>({
      url: ApiRoutes.PROSPECT_CRS(prospectId),
      data: { note_ids: notes.map(n => n.id), template: 'standard' },
      protected: true,
    });
    if (res.ok && res.data) {
      setCrs(prev => [res.data!, ...prev]);
    } else {
      setGenError(res.error ?? 'Erreur lors de la génération');
    }
    setGenerating(false);
  }

  async function downloadCR(cr: GlobalCR) {
    setDownloading(cr.id);
    if (cr.download_url) {
      window.open(cr.download_url, '_blank');
      setDownloading(null);
      return;
    }
    const res = await GetData<{ download_url?: string }>({
      url: ApiRoutes.PROSPECT_CR_DOWNLOAD(prospectId, cr.id),
      protected: true,
    });
    if (res.ok && res.data?.download_url) {
      window.open(res.data.download_url, '_blank');
    }
    setDownloading(null);
  }

  async function resolveUrl(cr: GlobalCR): Promise<string | null> {
    if (cr.download_url) return cr.download_url;
    const res = await GetData<{ download_url?: string }>({
      url: ApiRoutes.PROSPECT_CR_DOWNLOAD(prospectId, cr.id),
      protected: true,
    });
    return res.ok ? (res.data?.download_url ?? null) : null;
  }

  async function shareViaWhatsApp(cr: GlobalCR) {
    const url = await resolveUrl(cr);
    setShareOpenId(null);
    if (!url) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
  }

  async function copyLink(cr: GlobalCR) {
    const url = await resolveUrl(cr);
    setShareOpenId(null);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(cr.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <>
      <div className="bg-[var(--bg-surf)] border border-[var(--bd-def)] rounded-2xl">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--bd-def)]">
          <FileTextIcon size={15} className="text-[var(--p500)]" />
          <h2 className="text-[13px] font-semibold text-[var(--tx-1)]">Comptes-rendus générés</h2>
          {!loading && (
            <span className="ml-auto text-[11px] text-[var(--tx-3)] font-mono bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">
              {crs.length}
            </span>
          )}
        </div>

        {/* Generate */}
        <div className="px-4 py-3 border-b border-[var(--bd-def)] bg-[var(--bg-sink)] flex items-center gap-3">
          <p className="text-[12px] text-[var(--tx-3)] flex-1">
            Générer un CR PDF via IA à partir des notes du prospect.
          </p>
          <Button
            variant="gradient"
            size="sm"
            onClick={generateCR}
            disabled={generating}
            style={{ boxShadow: generating ? 'none' : '0 2px 8px rgba(107,53,201,0.2)' }}
          >
            {generating
              ? <><CircleNotchIcon size={13} className="animate-spin" /> Génération…</>
              : <><SparkleIcon size={13} /> Générer PDF</>
            }
          </Button>
        </div>
        {genError && <p className="text-[11px] text-red-500 px-5 py-2">{genError}</p>}

        {/* CR list */}
        <div className="divide-y divide-[var(--bd-def)]">
          {loading ? (
            <div className="py-8 text-center text-[12px] text-[var(--tx-3)]">Chargement…</div>
          ) : crs.length === 0 ? (
            <div className="py-10 text-center">
              <FileTextIcon size={28} className="text-[var(--tx-3)] mx-auto mb-2 opacity-50" />
              <p className="text-[12px] text-[var(--tx-3)]">Aucun compte-rendu généré.</p>
            </div>
          ) : (
            globalCrs.map(cr => {
              const st = STATUS_CR[cr.status] ?? STATUS_CR.draft;
              return (
                <div
                  key={cr.id}
                  className="flex items-center gap-2 px-5 py-3.5 hover:bg-[var(--bg-sink)] transition-colors cursor-pointer"
                  onClick={() => setSelectedId(cr.id)}
                >
                  <div className="w-8 h-8 rounded-lg bg-[rgba(107,53,201,0.08)] flex items-center justify-center flex-shrink-0">
                    <FileTextIcon size={15} className="text-[var(--p500)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-semibold text-[var(--tx-1)]">CR v{cr.version + 1}</span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: st.bg, color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--tx-3)]">
                      {fmtDate(cr.created_at)} · {fmtSize(cr.file_size)}
                    </p>
                  </div>

                  {/* Bouton partage + popover */}
                  <div className="relative flex-shrink-0" data-share-popover onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setShareOpenId(shareOpenId === cr.id ? null : cr.id)}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                        copiedId === cr.id
                          ? 'text-green-500 bg-green-50'
                          : 'text-[var(--tx-3)] hover:text-[var(--p500)] hover:bg-[rgba(107,53,201,0.08)]',
                      )}
                      title="Partager"
                    >
                      {copiedId === cr.id
                        ? <CheckIcon size={15} weight="bold" />
                        : <ShareNetworkIcon size={15} />
                      }
                    </button>

                    {shareOpenId === cr.id && (
                      <div
                        data-share-popover
                        className="absolute right-0 bottom-[calc(100%+6px)] z-50 bg-white border border-[var(--bd-def)] rounded-xl shadow-lg p-1.5 min-w-[172px]"
                      >
                        <p className="text-[10px] text-[var(--tx-3)] font-semibold uppercase tracking-wide px-2.5 pt-1 pb-1.5">
                          Partager le lien
                        </p>

                        <button
                          type="button"
                          onClick={() => shareViaWhatsApp(cr)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
                        >
                          <WhatsappLogoIcon size={15} weight="fill" className="text-[#25D366] flex-shrink-0" />
                          Via WhatsApp
                        </button>

                        <button
                          type="button"
                          onClick={() => copyLink(cr)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
                        >
                          <LinkIcon size={15} className="text-[var(--tx-3)] flex-shrink-0" />
                          Copier le lien
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bouton télécharger */}
                  <button
                    onClick={e => { e.stopPropagation(); downloadCR(cr); }}
                    disabled={downloading === cr.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--p500)] hover:bg-[rgba(27,107,69,0.08)] transition-colors flex-shrink-0 disabled:opacity-50"
                    title="Télécharger"
                  >
                    {downloading === cr.id
                      ? <CircleNotchIcon size={15} className="animate-spin" />
                      : <DownloadSimpleIcon size={15} />
                    }
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <CRDetailDrawer
        crId={selectedId}
        items={globalCrs}
        downloading={downloading}
        onClose={handleClose}
        onDownload={downloadCR}
      />

      <FloatingToast message={toast} />
    </>
  );
}
