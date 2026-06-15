'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadSimpleIcon, MagnifyingGlassIcon, SquaresFourIcon, ListIcon,
  FilePdfIcon, FileXlsIcon, ImageIcon, FileIcon,
  DotsThreeIcon, EyeIcon, DownloadSimpleIcon, PencilSimpleIcon,
  ArrowRightIcon, TrashIcon, XIcon, FolderOpenIcon, FolderIcon,
  CaretRightIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/* ── Types ───────────────────────────────────────────────────────────────── */

type FileType = 'pdf' | 'image' | 'xlsx' | 'doc' | 'other';
type FolderId = 'tous' | 'contrats' | 'factures' | 'offres' | 'rapports-ia' | 'photos' | 'exports';

interface DocFile {
  id: string;
  name: string;
  type: FileType;
  folder: FolderId;
  size: string;
  date: string;
  tags?: string[];
  iaLinked?: boolean;
}

interface Folder {
  id: FolderId;
  label: string;
  dot: string;
  count: number;
}

/* ── Constants ───────────────────────────────────────────────────────────── */

const FOLDERS: Folder[] = [
  { id: 'contrats',    label: 'Contrats Transport',    dot: '#3B82F6', count: 23 },
  { id: 'factures',    label: 'Factures',              dot: '#111827', count: 61 },
  { id: 'offres',      label: 'Offres Commerciales',   dot: '#F59E0B', count: 34 },
  { id: 'rapports-ia', label: 'Rapports IA',           dot: '#8B5CF6', count: 18 },
  { id: 'photos',      label: 'Photos terrain',        dot: '#10B981', count: 11 },
  { id: 'exports',     label: 'Exports',               dot: '#9CA3AF', count: 8  },
];

const TOTAL_DOCS = 147;

const MOCK_FILES: DocFile[] = [
  { id: 'f1',  name: 'Contrat Transport — Diallo BTP SARL.pdf', type: 'pdf',   folder: 'contrats',    size: '1.4 Mo', date: '2 juin 2026' },
  { id: 'f2',  name: 'Offre OFF-2026-0041 — Trans-Bamako.pdf',  type: 'pdf',   folder: 'offres',      size: '3 Mo',   date: '2 juin 2026',  tags: ['#18'] },
  { id: 'f3',  name: 'Photo_terrain_Bamako_Q2.jpg',             type: 'image', folder: 'photos',      size: '3 Mo',   date: '2 juin 2026' },
  { id: 'f4',  name: 'Rapport IA Mensuel — Mai 2026.pdf',       type: 'pdf',   folder: 'rapports-ia', size: '1.1 Mo', date: '1 mai 2026',   tags: ['Rapports IA 14'], iaLinked: true },
  { id: 'f5',  name: 'FAC-2026-0142 — Diallo BTP.pdf',          type: 'pdf',   folder: 'factures',    size: '–',      date: '1 mai 2026',   tags: ['#18'] },
  { id: 'f6',  name: 'Pipeline Export — Juin 2026.xlsx',        type: 'xlsx',  folder: 'exports',     size: '–',      date: '2 juin 2026',  tags: ['#18'] },
  { id: 'f7',  name: 'Contrat Framework — Logistics Mali.pdf',  type: 'pdf',   folder: 'contrats',    size: '–',      date: '28 avr. 2026' },
  { id: 'f8',  name: 'FAC-2026-0089 — Trans-Sahel.pdf',         type: 'pdf',   folder: 'factures',    size: '–',      date: '15 avr. 2026' },
  { id: 'f9',  name: 'Offre Commerciale Q2-2026.pdf',           type: 'pdf',   folder: 'offres',      size: '1.8 Mo', date: '10 avr. 2026', tags: ['#22'] },
];

const TYPE_FILTER_OPTIONS = [
  { key: 'tous',      label: 'Tous' },
  { key: 'pdf',       label: 'PDF' },
  { key: 'image',     label: 'Images' },
  { key: 'xlsx',      label: 'Tableurs' },
];

/* ── File icon ───────────────────────────────────────────────────────────── */

function FileTypeIcon({ type, size = 20 }: { type: FileType; size?: number }) {
  if (type === 'pdf')   return <FilePdfIcon  size={size} weight="fill" className="text-red-500" />;
  if (type === 'xlsx')  return <FileXlsIcon  size={size} weight="fill" className="text-green-600" />;
  if (type === 'image') return <ImageIcon    size={size} weight="fill" className="text-teal-500" />;
  return <FileIcon size={size} weight="fill" className="text-[var(--tx-3)]" />;
}

function FileTypeBadge({ type }: { type: FileType }) {
  const cfg: Record<FileType, { label: string; bg: string; text: string }> = {
    pdf:   { label: 'PDF',   bg: 'rgba(239,68,68,0.10)',   text: '#DC2626' },
    image: { label: 'IMAGE', bg: 'rgba(20,184,166,0.10)',  text: '#0D9488' },
    xlsx:  { label: 'XLSX',  bg: 'rgba(22,163,74,0.10)',   text: '#15803D' },
    doc:   { label: 'DOC',   bg: 'rgba(59,130,246,0.10)',  text: '#1D4ED8' },
    other: { label: 'FILE',  bg: 'rgba(107,114,128,0.10)', text: '#4B5563' },
  };
  const c = cfg[type];
  return (
    <span
      className="inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-bold tracking-wide"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

/* ── "Déplacer vers" submenu ─────────────────────────────────────────────── */

function MoveToSubmenu({ onMove }: { onMove: (folderId: FolderId) => void }) {
  return (
    <div className="absolute right-full top-0 mr-1 w-[220px] bg-white border border-[var(--bd-def)] rounded-xl shadow-xl py-3 z-[200]">
      <p className="px-3.5 pb-2 text-[10px] font-bold tracking-widest text-[var(--tx-3)] uppercase">
        Déplacer vers
      </p>
      {FOLDERS.map(f => (
        <button
          key={f.id}
          onClick={() => onMove(f.id)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--bg-sink)] transition-colors text-left"
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.dot }} />
          <span className="text-[13px] text-[var(--tx-1)]">{f.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Row action menu ─────────────────────────────────────────────────────── */

function RowMenu({
  fileId,
  onClose,
  onMove,
}: {
  fileId: string;
  onClose: () => void;
  onMove: (folderId: FolderId) => void;
}) {
  const [showMoveTo, setShowMoveTo] = useState(false);

  return (
    <div className="absolute right-0 top-7 z-[100] bg-white border border-[var(--bd-def)] rounded-xl shadow-lg py-1 min-w-[172px]">
      <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[var(--tx-2)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-1)] transition-colors">
        <EyeIcon size={14} />
        Aperçu
      </button>
      <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[var(--tx-2)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-1)] transition-colors">
        <DownloadSimpleIcon size={14} />
        Télécharger
      </button>
      <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[var(--tx-2)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-1)] transition-colors">
        <PencilSimpleIcon size={14} />
        Renommer
      </button>

      {/* Déplacer vers — submenu on hover */}
      <div
        className="relative"
        onMouseEnter={() => setShowMoveTo(true)}
        onMouseLeave={() => setShowMoveTo(false)}
      >
        <button className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-[13px] text-[var(--tx-2)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-1)] transition-colors">
          <span className="flex items-center gap-2.5">
            <ArrowRightIcon size={14} />
            Déplacer vers
          </span>
          <CaretRightIcon size={12} className="text-[var(--tx-3)]" />
        </button>
        {showMoveTo && (
          <MoveToSubmenu onMove={(id) => { onMove(id); onClose(); }} />
        )}
      </div>

      <div className="my-1 border-t border-[var(--bd-def)]" />
      <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors">
        <TrashIcon size={14} />
        Supprimer
      </button>
    </div>
  );
}

/* ── List row ────────────────────────────────────────────────────────────── */

function FileRow({
  file,
  selected,
  onSelect,
  menuOpen,
  onMenuToggle,
  onMenuClose,
}: {
  file: DocFile;
  selected: boolean;
  onSelect: (id: string) => void;
  menuOpen: boolean;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
}) {
  return (
    <tr
      className={cn(
        'group border-b border-[var(--bd-def)] transition-colors',
        selected ? 'bg-blue-50' : 'hover:bg-[var(--bg-sink)]',
      )}
    >
      {/* Checkbox */}
      <td className="pl-4 py-3 w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(file.id)}
          className="w-3.5 h-3.5 rounded border-neutral-300 cursor-pointer accent-primary-500"
        />
      </td>

      {/* Icon */}
      <td className="py-3 pr-2 w-8">
        <FileTypeIcon type={file.type} size={18} />
      </td>

      {/* Nom + badges */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-[var(--tx-1)]">{file.name}</span>
          <div className="flex items-center gap-1 flex-wrap">
            <FileTypeBadge type={file.type} />
            {file.iaLinked && (
              <span className="inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-bold bg-blue-100 text-blue-600">
                + IA
              </span>
            )}
            {file.tags?.map(tag => (
              <span
                key={tag}
                className={cn(
                  'inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-semibold',
                  tag.startsWith('#')
                    ? 'bg-[var(--bg-sink)] text-[var(--tx-3)] border border-[var(--bd-def)]'
                    : 'bg-amber-100 text-amber-700',
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </td>

      {/* Date */}
      <td className="py-3 pr-4 text-[13px] text-[var(--tx-3)] whitespace-nowrap">
        {file.date}
      </td>

      {/* Taille */}
      <td className="py-3 pr-4 text-[13px] text-[var(--tx-3)] whitespace-nowrap tabular-nums">
        {file.size}
      </td>

      {/* Actions */}
      <td className="py-3 pr-4">
        <div className="relative flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onMenuToggle(file.id); }}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
              'text-[var(--tx-3)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-1)]',
              'opacity-0 group-hover:opacity-100',
              menuOpen && 'opacity-100 bg-[var(--bg-sink)] text-[var(--tx-1)]',
            )}
          >
            <DotsThreeIcon size={16} weight="bold" />
          </button>
          {menuOpen && (
            <RowMenu
              fileId={file.id}
              onClose={onMenuClose}
              onMove={() => onMenuClose()}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

/* ── Grid card ───────────────────────────────────────────────────────────── */

const GRID_PREVIEW_BG: Record<FileType, string> = {
  pdf:   'rgba(239,68,68,0.06)',
  image: 'rgba(20,184,166,0.06)',
  xlsx:  'rgba(22,163,74,0.06)',
  doc:   'rgba(59,130,246,0.06)',
  other: 'rgba(107,114,128,0.06)',
};

function FileCard({
  file,
  selected,
  onSelect,
  menuOpen,
  onMenuToggle,
  onMenuClose,
}: {
  file: DocFile;
  selected: boolean;
  onSelect: (id: string) => void;
  menuOpen: boolean;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
}) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl border transition-all',
        selected
          ? 'border-primary-400 ring-2 ring-primary-200 shadow-sm'
          : 'border-[var(--bd-def)] hover:shadow-md hover:border-[var(--bd-str)]',
      )}
    >
      {/* Checkbox */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(file.id)}
          className="w-3.5 h-3.5 rounded border-neutral-300 cursor-pointer accent-primary-500"
        />
      </div>

      {/* Menu button */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onMenuToggle(file.id); }}
          className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
            'text-[var(--tx-3)] hover:bg-white hover:shadow-sm',
            menuOpen && 'bg-white shadow-sm text-[var(--tx-1)]',
          )}
        >
          <DotsThreeIcon size={14} weight="bold" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7">
            <RowMenu
              fileId={file.id}
              onClose={onMenuClose}
              onMove={() => onMenuClose()}
            />
          </div>
        )}
      </div>

      {/* Preview area */}
      <div
        className="h-[88px] flex items-center justify-center rounded-t-xl"
        style={{ background: GRID_PREVIEW_BG[file.type] }}
      >
        <FileTypeIcon type={file.type} size={36} />
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[12px] font-semibold text-[var(--tx-1)] leading-tight mb-2 line-clamp-2">
          {file.name}
        </p>
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          <FileTypeBadge type={file.type} />
          {file.iaLinked && (
            <span className="inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-bold bg-blue-100 text-blue-600">
              + IA
            </span>
          )}
          {file.tags?.map(tag => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-semibold',
                tag.startsWith('#')
                  ? 'bg-[var(--bg-sink)] text-[var(--tx-3)] border border-[var(--bd-def)]'
                  : 'bg-amber-100 text-amber-700',
              )}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-[var(--tx-3)]">{file.date}</span>
          {file.size !== '–' && (
            <span className="text-[11px] text-[var(--tx-3)] tabular-nums">{file.size}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-[var(--bg-sink)] flex items-center justify-center">
        <FolderOpenIcon size={28} weight="duotone" className="text-[var(--tx-3)]" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-[var(--tx-1)] mb-1">Ce dossier est vide</p>
        <p className="text-[13px] text-[var(--tx-3)] max-w-[300px] leading-relaxed">
          Importez vos photos terrain, contrats et rapports ici. Les fichiers générés par les agents IA apparaissent automatiquement.
        </p>
      </div>
      <button
        className="h-9 px-5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-opacity hover:opacity-90"
        style={{ background: 'var(--grad)' }}
      >
        <UploadSimpleIcon size={15} />
        Importer un fichier
      </button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function DocumentsPage() {
  const [activeFolder, setActiveFolder] = useState<FolderId>('tous');
  const [typeFilter, setTypeFilter]     = useState('tous');
  const [view, setView]                 = useState<'list' | 'grid'>('list');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen]         = useState<string | null>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function close() { setMenuOpen(null); }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  // Filtered files
  const files = MOCK_FILES.filter(f => {
    if (activeFolder !== 'tous' && f.folder !== activeFolder) return false;
    if (typeFilter !== 'tous' && f.type !== typeFilter) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = files.length > 0 && files.every(f => selected.has(f.id));

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        files.forEach(f => next.delete(f.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        files.forEach(f => next.add(f.id));
        return next;
      });
    }
  }

  function clearSelection() { setSelected(new Set()); }

  const selectedCount = selected.size;
  const activeLabel = activeFolder === 'tous'
    ? 'Tous les documents'
    : FOLDERS.find(f => f.id === activeFolder)?.label ?? '';

  const currentTotal = activeFolder === 'tous' ? TOTAL_DOCS : (FOLDERS.find(f => f.id === activeFolder)?.count ?? 0);

  return (
    <div className="flex h-full min-h-screen">

      {/* ── Left sidebar (Dossiers) ────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 border-r border-[var(--bd-def)] p-4 flex flex-col gap-1">
        <p className="text-[10px] font-bold tracking-widest text-[var(--tx-3)] uppercase mb-2 px-1">
          Dossiers
        </p>

        {/* Tous les documents */}
        <button
          onClick={() => setActiveFolder('tous')}
          className={cn(
            'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors',
            activeFolder === 'tous'
              ? 'bg-primary-50 text-primary-600 font-semibold'
              : 'text-[var(--tx-2)] hover:bg-[var(--bg-sink)]',
          )}
        >
          <span className="flex items-center gap-2">
            <FolderOpenIcon
              size={15}
              weight={activeFolder === 'tous' ? 'fill' : 'regular'}
              className={activeFolder === 'tous' ? 'text-primary-500' : 'text-[var(--tx-3)]'}
            />
            Tous les documents
          </span>
          <span className={cn('text-[11px] font-bold', activeFolder === 'tous' ? 'text-primary-500' : 'text-[var(--tx-3)]')}>
            {TOTAL_DOCS}
          </span>
        </button>

        {/* Folder list */}
        <div className="flex flex-col gap-0.5 mt-1">
          {FOLDERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] transition-colors',
                activeFolder === f.id
                  ? 'bg-[var(--bg-sink)] text-[var(--tx-1)] font-semibold'
                  : 'text-[var(--tx-2)] hover:bg-[var(--bg-sink)] font-medium',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.dot }} />
                {f.label}
              </span>
              <span className="text-[11px] font-bold text-[var(--tx-3)]">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Storage bar */}
        <div className="mt-auto pt-4 border-t border-[var(--bd-def)]">
          <p className="text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase mb-2">
            Stockage utilisé
          </p>
          <div className="h-1.5 w-full rounded-full bg-[var(--bg-sink)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: '64%', background: 'var(--grad)' }}
            />
          </div>
          <p className="text-[11px] text-[var(--tx-3)] mt-1.5">3.2 Go / 5 Go</p>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Page header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-5">
          <div>
            <h1 className="font-display text-[26px] font-bold text-foreground tracking-tight leading-tight">
              Documents
            </h1>
            <p className="text-[var(--tx-3)] text-[12px] mt-0.5">
              Stockage documents PortaLis — contrats, factures, rapports terrain
            </p>
          </div>
          <button
            className="h-9 px-5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: 'var(--grad)' }}
          >
            <UploadSimpleIcon size={15} />
            Importer
          </button>
        </div>

        {/* Inner panel */}
        <div className="flex-1 mx-7 mb-7 border border-[var(--bd-def)] rounded-2xl bg-white overflow-hidden flex flex-col">

          {/* Breadcrumb + count */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--bd-def)]">
            <nav className="flex items-center gap-1 text-[13px]">
              <span className="text-primary-500 font-medium cursor-pointer hover:underline">Documents</span>
              <span className="text-[var(--tx-3)] mx-0.5">/</span>
              <span className="text-[var(--tx-1)] font-semibold">{activeLabel}</span>
            </nav>
            <span className="text-[12px] text-[var(--tx-3)] font-medium">
              {currentTotal} fichiers
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--bd-def)]">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 pr-3 rounded-lg border border-[var(--bd-def)] text-[13px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/20 transition-colors w-48 bg-white"
              />
            </div>

            {/* Type filters */}
            <div className="flex items-center gap-1 ml-auto">
              {TYPE_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setTypeFilter(opt.key)}
                  className={cn(
                    'h-8 px-3.5 rounded-lg text-[13px] font-medium transition-colors',
                    typeFilter === opt.key
                      ? 'bg-primary-500 text-white font-semibold shadow-sm'
                      : 'text-[var(--tx-2)] hover:bg-[var(--bg-sink)]',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex items-center border border-[var(--bd-def)] rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setView('grid')}
                title="Vue grille"
                className={cn(
                  'h-8 w-8 flex items-center justify-center transition-colors',
                  view === 'grid' ? 'bg-[var(--bg-sink)] text-primary-500' : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)]',
                )}
              >
                <SquaresFourIcon size={15} />
              </button>
              <div className="w-px h-4 bg-[var(--bd-def)]" />
              <button
                onClick={() => setView('list')}
                title="Vue liste"
                className={cn(
                  'h-8 w-8 flex items-center justify-center transition-colors',
                  view === 'list' ? 'bg-[var(--bg-sink)] text-primary-500' : 'text-[var(--tx-3)] hover:bg-[var(--bg-sink)]',
                )}
              >
                <ListIcon size={15} />
              </button>
            </div>
          </div>

          {/* Multi-select action bar */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-[#111827] text-white">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-3.5 h-3.5 rounded cursor-pointer accent-primary-400"
              />
              <span className="text-[13px] font-semibold flex-1">
                {selectedCount} fichier{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
              </span>
              <button className="h-7 px-3.5 rounded-lg text-[12px] font-medium border border-white/20 bg-white/10 hover:bg-white/20 flex items-center gap-1.5 transition-colors">
                <DownloadSimpleIcon size={13} />
                Télécharger
              </button>
              <div className="relative group/move">
                <button className="h-7 px-3.5 rounded-lg text-[12px] font-medium border border-white/20 bg-white/10 hover:bg-white/20 flex items-center gap-1.5 transition-colors">
                  <ArrowRightIcon size={13} />
                  Déplacer vers
                </button>
                <div className="absolute left-0 top-8 hidden group-hover/move:block z-50">
                  <MoveToSubmenu onMove={clearSelection} />
                </div>
              </div>
              <button className="h-7 px-3.5 rounded-lg text-[12px] font-medium border border-red-400/30 bg-red-500/20 hover:bg-red-500/30 flex items-center gap-1.5 text-red-300 transition-colors">
                <TrashIcon size={13} />
                Supprimer
              </button>
              <button onClick={clearSelection} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors ml-1">
                <XIcon size={14} />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {files.length === 0 ? (
              <EmptyState />
            ) : view === 'list' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
                    <th className="pl-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="w-3.5 h-3.5 rounded border-neutral-300 cursor-pointer accent-primary-500"
                      />
                    </th>
                    <th className="py-2.5 pr-2 w-8" />
                    <th className="py-2.5 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase">
                      Nom
                    </th>
                    <th className="py-2.5 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase whitespace-nowrap">
                      Date d`&apos;`ajout
                    </th>
                    <th className="py-2.5 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase" />
                    <th className="py-2.5 pr-4 text-[10px] font-bold tracking-wider text-[var(--tx-3)] uppercase text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(f => (
                    <FileRow
                      key={f.id}
                      file={f}
                      selected={selected.has(f.id)}
                      onSelect={toggleSelect}
                      menuOpen={menuOpen === f.id}
                      onMenuToggle={id => setMenuOpen(prev => prev === id ? null : id)}
                      onMenuClose={() => setMenuOpen(null)}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {files.map(f => (
                  <FileCard
                    key={f.id}
                    file={f}
                    selected={selected.has(f.id)}
                    onSelect={toggleSelect}
                    menuOpen={menuOpen === f.id}
                    onMenuToggle={id => setMenuOpen(prev => prev === id ? null : id)}
                    onMenuClose={() => setMenuOpen(null)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {files.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--bd-def)]">
              <p className="text-[12px] text-[var(--tx-3)]">
                Affichage{' '}
                <span className="text-[var(--tx-2)] font-medium">1–{files.length}</span>
                {' '}sur{' '}
                <span className="text-[var(--tx-2)] font-medium">{currentTotal}</span>{' '}
                prospects
              </p>
              <div className="flex items-center gap-1">
                <button disabled className="h-7 px-2.5 rounded-lg text-[12px] text-[var(--tx-3)] border border-[var(--bd-def)] bg-white disabled:opacity-40">
                  ← Préc.
                </button>
                {[1, 2, 4].map((n, i) => (
                  <button
                    key={n}
                    className={cn(
                      'h-7 w-7 rounded-lg text-[12px] font-medium transition-colors',
                      n === 1
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-[var(--tx-2)] border border-[var(--bd-def)] bg-white hover:bg-[var(--bg-sink)]',
                    )}
                  >
                    {i === 2 ? '…' : null}{n}
                  </button>
                ))}
                <button className="h-7 px-2.5 rounded-lg text-[12px] text-[var(--tx-2)] border border-[var(--bd-def)] bg-white hover:bg-[var(--bg-sink)] transition-colors">
                  Suiv. →
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--tx-3)]">
                <span>Afficher</span>
                <select className="h-7 px-2 rounded-lg border border-[var(--bd-def)] text-[12px] text-[var(--tx-1)] bg-white focus:outline-none">
                  <option>12</option>
                  <option>24</option>
                  <option>48</option>
                </select>
                <span>par page</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
