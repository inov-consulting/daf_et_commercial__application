'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileTextIcon, DownloadSimpleIcon, SparkleIcon, CircleNotchIcon,
} from '@phosphor-icons/react';
import { GetData, PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { type ProspectCR, type CRListResponse, type GenerateCRBody } from '@/types/prospect_note_type';
import { Button } from '@/components/ui/button';

interface ProspectCRSectionProps {
  prospectId: string;
}

const STATUS_CR: Record<string, { label: string; bg: string; color: string }> = {
  draft:      { label: 'Brouillon',   bg: '#F3F4F6', color: '#374151' },
  final:      { label: 'Finalisé',    bg: '#ECFDF5', color: '#059669' },
  processing: { label: 'En cours…',  bg: '#FFF3E0', color: '#D97706' },
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

export function ProspectCRSection({ prospectId }: ProspectCRSectionProps) {
  const [crs, setCrs] = useState<ProspectCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

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
    setGenerating(true);
    setGenError(null);
    const res = await PostData<ProspectCR, GenerateCRBody>({
      url: ApiRoutes.PROSPECT_CRS(prospectId),
      data: { note_ids: [], template: 'standard' },
      protected: true,
    });
    if (res.ok && res.data) {
      setCrs(prev => [res.data!, ...prev]);
    } else {
      setGenError(res.error ?? 'Erreur lors de la génération');
    }
    setGenerating(false);
  }

  async function downloadCR(crId: string, downloadUrl: string) {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      return;
    }
    const res = await GetData<{ url?: string }>({
      url: ApiRoutes.PROSPECT_CR_DOWNLOAD(prospectId, crId),
      protected: true,
    });
    if (res.ok && res.data?.url) {
      window.open(res.data.url, '_blank');
    }
  }

  return (
    <div className="bg-[var(--bg-surf)] border border-[var(--bd-def)] rounded-2xl overflow-hidden">
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
        <p className="text-[12px] text-[var(--tx-3)] flex-1">Générer un CR PDF via IA à partir des notes du prospect.</p>
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
          crs.map(cr => {
            const st = STATUS_CR[cr.status] ?? STATUS_CR.draft;
            return (
              <div key={cr.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-sink)] transition-colors">
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
                <button
                  onClick={() => downloadCR(cr.id, cr.download_url)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--p500)] hover:bg-[rgba(27,107,69,0.08)] transition-colors flex-shrink-0"
                  title="Télécharger"
                >
                  <DownloadSimpleIcon size={15} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
