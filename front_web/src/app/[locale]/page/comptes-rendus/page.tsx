'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  MicrophoneIcon, MagnifyingGlassIcon, DownloadSimpleIcon,
  ClockIcon, FileTextIcon, WarningIcon,
  CircleNotchIcon,ShareNetworkIcon, CheckIcon, 
  WhatsappLogoIcon, LinkIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchCompteRendus,
  setParentType,
  setOffset,
} from '@/redux/features/compte-rendus/compteRendusSlice';
import { type GlobalCR, type GlobalCRDetail } from '@/types/prospect_note_type';
import CRDetailDrawer from '@/components/layout/cr-detail-drawer';

/* ── Status config ──────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  final: {
    label: 'Finalisé', bg: 'rgba(16,185,129,0.10)', text: '#065F46',
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

type TabKey = 'tous' | 'draft' | 'processing' | 'final';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'tous',       label: 'Tous' },
  { key: 'draft',      label: 'Brouillons' },
  { key: 'processing', label: 'En cours' },
  { key: 'final',      label: 'Finalisés' },
];

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

function hashColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const colors = ['#0EA5E9','#8B5CF6','#F59E0B','#EF4444','#10B981','#6366F1','#F97316','#22C55E'];
  return colors[Math.abs(h) % colors.length];
}

function toInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '??';
}

function displayName(cr: GlobalCR): string {
  return cr.parent.company_name || cr.parent.name || '–';
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function ComptesRendusPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  const dispatch = useAppDispatch();
  const { items, total, loading, error, parentType, limit, offset } = useAppSelector(s => s.compteRendus);

  const [activeTab, setActiveTab]   = useState<TabKey>('tous');
  const [search, setSearch]         = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading]  = useState<string | null>(null);
  const [shareOpenId, setShareOpenId]  = useState<string | null>(null);
  const [copiedId, setCopiedId]        = useState<string | null>(null);

  /* Ferme le popover de partage au clic extérieur */
  useEffect(() => {
    if (!shareOpenId) return;
    function handle(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-share-popover]')) setShareOpenId(null);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [shareOpenId]);

  async function resolveUrl(crId: string, downloadUrl: string): Promise<string | null> {
    if (downloadUrl) return downloadUrl;
    const cr = items.find(x => x.id === crId);
    if (!cr) return null;
    const res = await GetData<{ url?: string; download_url?: string }>({
      url: ApiRoutes.PROSPECT_CR_DOWNLOAD(cr.parent_id, crId),
      protected: true,
    });
    return res.ok ? (res.data?.url ?? res.data?.download_url ?? null) : null;
  }

  async function shareViaWhatsApp(crId: string, downloadUrl: string) {
    const url = await resolveUrl(crId, downloadUrl);
    setShareOpenId(null);
    if (!url) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
  }

  async function copyLink(crId: string, downloadUrl: string) {
    const url = await resolveUrl(crId, downloadUrl);
    setShareOpenId(null);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(crId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function downloadCR(cr: GlobalCR) {
    if (downloading === cr.id) return;
    setDownloading(cr.id);
    if (cr.download_url) {
      window.open(cr.download_url, '_blank');
      setDownloading(null);
      return;
    }
    const res = await GetData<{ url?: string; download_url?: string }>({
      url: ApiRoutes.PROSPECT_CR_DOWNLOAD(cr.parent_id, cr.id),
      protected: true,
    });
    if (res.ok && (res.data?.url || res.data?.download_url)) {
      window.open((res.data!.url ?? res.data!.download_url)!, '_blank');
    }
    setDownloading(null);
  }

  /* Fetch on mount + filter change */
  useEffect(() => {
    dispatch(fetchCompteRendus({ parentType, limit, offset }));
  }, [dispatch, parentType, limit, offset]);

  /* Client-side filter by status tab + search */
  const filtered = useMemo(() => {
    let r = items;
    if (activeTab !== 'tous') r = r.filter(cr => cr.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(cr =>
        displayName(cr).toLowerCase().includes(q) ||
        cr.parent.email?.toLowerCase().includes(q) ||
        cr.parent.name?.toLowerCase().includes(q) ||
        cr.parent_type?.toLowerCase().includes(q),
      );
    }
    return r;
  }, [items, activeTab, search]);

  /* Tab counts */
  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: items.length };
    (['draft', 'processing', 'final'] as const).forEach(s => {
      c[s] = items.filter(cr => cr.status === s).length;
    });
    return c;
  }, [items]);

  /* KPIs */
  const kpis = useMemo(() => {
    const now = new Date();
    const thisMo = items.filter(cr => {
      const d = new Date(cr.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const pending = (counts.draft ?? 0) + (counts.processing ?? 0);
    return [
      { label: 'Total CRs',   value: loading ? '…' : String(total), sub: 'tous parents' },
      { label: 'Ce mois',     value: loading ? '…' : String(thisMo), sub: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) },
      { label: 'En attente',  value: loading ? '…' : String(pending), sub: 'brouillons + en cours' },
      { label: 'Finalisés',   value: loading ? '…' : String(counts.final ?? 0), sub: 'prêts à envoyer' },
    ];
  }, [items, total, loading, counts]);

  /* Pagination */
  const totalPages  = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  const handleClose = useCallback(() => setSelectedId(null), []);

  return (
    <div className="p-4 sm:p-7 pb-16">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
            Comptes-rendus
          </h1>
        </div>
        <button
          onClick={() => router.push(`/${locale}/page/comptes-rendus/nouveau`)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-[13px] font-semibold transition-opacity hover:opacity-90 flex-shrink-0 shadow-sm"
          style={{ background: 'var(--grad)', boxShadow: '0 2px 14px rgba(107,53,201,0.30)' }}
        >
          <MicrophoneIcon size={14} weight="bold" />
          Nouveau CR
        </button>
      </div>

      {/* ── KPI row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white border border-[var(--bd-def)] rounded-xl p-4 flex flex-col gap-1">
            <div className="text-[24px] font-bold text-[var(--tx-1)] font-display leading-none">{k.value}</div>
            <div className="text-[12px] font-semibold text-[var(--tx-2)] mt-1">{k.label}</div>
            <div className="text-[11px] text-[var(--tx-3)]">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs + filtres ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        {/* Status tabs */}
        <div className="flex items-center gap-0.5 bg-[var(--bg-sink)] rounded-lg p-1 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-[5px] rounded-md text-[12px] font-medium transition-all duration-150 whitespace-nowrap',
                activeTab === t.key
                  ? 'bg-white text-[var(--tx-1)] shadow-xs font-semibold'
                  : 'text-[var(--tx-3)] hover:text-[var(--tx-2)]',
              )}
            >
              {t.label}
              <span className={cn(
                'text-[10px] font-bold min-w-[16px] text-center',
                activeTab === t.key ? 'text-primary-500' : 'text-[var(--tx-3)]',
              )}>
                {t.key === 'tous' ? counts.tous : (counts[t.key] ?? 0)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          {/* Parent type filter */}
          <select
            value={parentType}
            onChange={e => dispatch(setParentType(e.target.value))}
            className="h-8 px-2 pr-7 rounded-lg border border-[var(--bd-def)] bg-white text-[12px] text-[var(--tx-2)] focus:outline-none focus:border-[var(--p500)] cursor-pointer"
          >
            <option value="">Tous les parents</option>
            <option value="prospect">Prospects</option>
            <option value="service">Services</option>
          </select>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'h-8 pl-8 pr-3 rounded-lg border border-[var(--bd-def)] bg-white',
                'text-[13px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)]',
                'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
                'transition-colors w-44',
              )}
            />
          </div>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <WarningIcon size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── List ────────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--bd-def)] rounded-xl">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1fr)_56px] px-5 py-3 border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
          {['Société / Parent', 'Contact', 'Date', 'Taille', 'Statut', ''].map((h, i) => (
            <span key={i} className="text-[11px] font-semibold text-[var(--tx-3)] uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-[var(--tx-3)]">
            <CircleNotchIcon size={18} className="animate-spin text-[var(--p500)]" />
            <span className="text-[13px]">Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <FileTextIcon size={38} className="text-[var(--tx-3)]" />
            <div>
              <p className="text-[14px] font-semibold text-[var(--tx-2)]">Aucun compte-rendu trouvé</p>
              <p className="text-[12px] text-[var(--tx-3)] mt-1">Modifiez vos filtres ou créez un nouveau CR</p>
            </div>
          </div>
        ) : (
          filtered.map((cr, idx) => {
            const s    = STATUS_CFG[cr.status] ?? FALLBACK_STATUS;
            const name = displayName(cr);
            return (
              <div
                key={cr.id}
                onClick={() => setSelectedId(cr.id)}
                className={cn(
                  'sm:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1fr)_56px]',
                  'flex flex-col gap-2 sm:gap-0',
                  'items-start sm:items-center px-5 py-4 hover:bg-[var(--bg-sink)] transition-colors cursor-pointer',
                  idx < filtered.length - 1 && 'border-b border-[var(--bd-def)]',
                )}
              >
                {/* Société */}
                <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: hashColor(cr.parent_id) }}
                  >
                    {toInitials(name)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[13px] font-semibold text-[var(--tx-1)] truncate block">{name}</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-[var(--tx-3)] capitalize">{cr.parent_type}</span>
                      <span className="text-[var(--tx-3)] opacity-40 text-[10px]">·</span>
                      <span className="text-[11px] font-mono text-[var(--tx-3)]">v{cr.version + 1}</span>
                      <span className="text-[var(--tx-3)] opacity-40 text-[10px]">·</span>
                      <span className="text-[11px] text-[var(--tx-3)]">{cr.note_ids.length} note{cr.note_ids.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="min-w-0">
                  <div className="text-[13px] text-[var(--tx-1)] font-medium truncate">{cr.parent.email || '–'}</div>
                  <div className="text-[11px] text-[var(--tx-3)] mt-0.5 truncate">{cr.parent.phone || ''}</div>
                </div>

                {/* Date */}
                <div>
                  <div className="flex items-center gap-1">
                    <ClockIcon size={10} className="text-[var(--tx-3)]" />
                    <span className="text-[12px] text-[var(--tx-2)]">{fmtDate(cr.created_at)}</span>
                  </div>
                </div>

                {/* Taille */}
                <div>
                  <span className="text-[12px] font-mono text-[var(--tx-2)]">{fmtSize(cr.file_size)}</span>
                </div>

                {/* Statut */}
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[10px] font-bold w-fit"
                    style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                    {s.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    title="Télécharger le PDF"
                    disabled={downloading === cr.id}
                    onClick={() => downloadCR(cr)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bd-def)] hover:text-[var(--tx-1)] transition-colors disabled:opacity-50"
                  >
                    {downloading === cr.id
                      ? <CircleNotchIcon size={12} className="animate-spin" />
                      : <DownloadSimpleIcon size={13} />
                    }
                  </button>
                  {/* Bouton partage + popover */}
                  <div className="relative" data-share-popover>
                    <button
                      type="button"
                      onClick={() => setShareOpenId(shareOpenId === cr.id ? null : cr.id)}
                      className={cn(
                        'h-7 w-7 rounded-md flex items-center justify-center transition-colors',
                        copiedId === cr.id
                          ? 'text-green-500 bg-green-50'
                          : 'text-[var(--tx-3)] hover:text-[var(--p500)] hover:bg-[rgba(107,53,201,0.08)]',
                      )}
                      title="Partager"
                    >
                      {copiedId === cr.id
                        ? <CheckIcon size={13} weight="bold" />
                        : <ShareNetworkIcon size={13} />
                      }
                    </button>

                    {shareOpenId === cr.id && (
                      <div
                        data-share-popover
                        className="absolute right-0 bottom-[calc(100%+4px)] z-50 bg-white border border-[var(--bd-def)] rounded-xl shadow-lg p-1.5 min-w-[172px]"
                      >
                        <p className="text-[10px] text-[var(--tx-3)] font-semibold uppercase tracking-wide px-2.5 pt-1 pb-1.5">
                          Partager le lien
                        </p>
                        <button
                          type="button"
                          onClick={() => shareViaWhatsApp(cr.id, cr.download_url)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
                        >
                          <WhatsappLogoIcon size={14} weight="fill" className="text-[#25D366] flex-shrink-0" />
                          Via WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => copyLink(cr.id, cr.download_url)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors"
                        >
                          <LinkIcon size={14} className="text-[var(--tx-3)] flex-shrink-0" />
                          Copier le lien
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────── */}
      {total > limit && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-[12px] text-[var(--tx-3)]">
            {offset + 1}–{Math.min(offset + limit, total)} sur <span className="font-medium text-[var(--tx-2)]">{total}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={offset === 0}
              onClick={() => dispatch(setOffset(Math.max(0, offset - limit)))}
              className="h-7 px-3 rounded-lg text-xs text-[var(--tx-2)] border border-[var(--bd-def)] bg-white disabled:opacity-40 hover:bg-[var(--bg-sink)] transition-colors"
            >
              ← Préc.
            </button>
            <span className="text-[11px] text-[var(--tx-3)]">{currentPage} / {totalPages}</span>
            <button
              disabled={offset + limit >= total}
              onClick={() => dispatch(setOffset(offset + limit))}
              className="h-7 px-3 rounded-lg text-xs text-[var(--tx-2)] border border-[var(--bd-def)] bg-white disabled:opacity-40 hover:bg-[var(--bg-sink)] transition-colors"
            >
              Suiv. →
            </button>
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && total <= limit && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-[12px] text-[var(--tx-3)]">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Detail drawer ───────────────────────────────────── */}
      <CRDetailDrawer
        crId={selectedId}
        items={items}
        downloading={downloading}
        onClose={handleClose}
        onDownload={downloadCR}
      />
    </div>
  );
}
