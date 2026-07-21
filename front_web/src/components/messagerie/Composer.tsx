'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  SmileyIcon,
  PaperclipIcon,
  PaperPlaneTiltIcon,
  SpinnerGapIcon,
  XIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { fileKind, docLabel, docColor, type FileKind } from '@/lib/utils';

interface ComposerProps {
  convFirstName: string;
  sending:       boolean;
  sendError:     string | null;
  onSend:        (text: string, file?: File) => void;
}

function DocIcon({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h6l4.5 4.5v14A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5Z" stroke={color} />
      <path d="M13.5 2v4.5H18" stroke={color} />
    </svg>
  );
}

export function Composer({ convFirstName, sending, sendError, onSend }: ComposerProps) {
  const fileRef        = useRef<HTMLInputElement>(null);
  const [draft,        setDraft]        = useState('');
  const [file,         setFile]         = useState<File | null>(null);
  const [caption,      setCaption]      = useState('');
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);
  const [kind,         setKind]         = useState<FileKind | null>(null);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const clearFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setKind(null);
    setCaption('');
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const k = fileKind(f);
    setFile(f);
    setKind(k);
    if (k === 'image' || k === 'video') {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
    e.target.value = '';
  }

  function handleSend() {
    if (sending) return;
    const text = file ? caption.trim() : draft.trim();
    if (!text && !file) return;
    onSend(text, file ?? undefined);
    setDraft('');
    clearFile();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
  }

  const canSend = !sending && (!!draft.trim() || !!file);

  return (
    <div className="px-5 py-3.5 border-t border-[var(--bd-def)] bg-white flex-shrink-0">
      {sendError && (
        <p className="text-[11px] text-error mb-2">{sendError}</p>
      )}

      {/* ── Media preview ── */}
      {file && kind && (
        <div className="mb-3 flex flex-col gap-2">
          {/* Image preview */}
          {kind === 'image' && previewUrl && (
            <div className="relative self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-[160px] max-w-[280px] rounded-[10px] object-cover"
              />
              <button
                onClick={clearFile}
                className="absolute top-1.5 right-1.5 w-[22px] h-[22px] bg-black/55 rounded-full flex items-center justify-center"
              >
                <XIcon size={10} className="text-white" weight="bold" />
              </button>
            </div>
          )}

          {/* Video preview */}
          {kind === 'video' && previewUrl && (
            <div className="relative self-start">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={previewUrl}
                className="max-h-[130px] max-w-[280px] rounded-[10px] object-cover"
              />
              <button
                onClick={clearFile}
                className="absolute top-1.5 right-1.5 w-[22px] h-[22px] bg-black/55 rounded-full flex items-center justify-center"
              >
                <XIcon size={10} className="text-white" weight="bold" />
              </button>
            </div>
          )}

          {/* Document / audio row */}
          {(kind === 'document' || kind === 'audio') && (
            <div className="flex items-center gap-2.5 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-[10px] px-3 py-2.5">
              <div
                className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
                style={{ background: `${docColor(file)}18` }}
              >
                <DocIcon color={docColor(file)} className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--tx-1)] truncate">{file.name}</p>
                <p className="text-[10px] text-[var(--tx-3)]">
                  {docLabel(file)} · {(file.size / 1024).toFixed(0)} Ko
                </p>
              </div>
              <button
                onClick={clearFile}
                className="w-6 h-6 flex items-center justify-center text-[var(--tx-3)] hover:text-error transition-colors"
              >
                <XIcon size={12} />
              </button>
            </div>
          )}

          {/* Caption input */}
          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Entrer votre message..."
            className="w-full border border-[var(--bd-def)] rounded-[9px] px-3 py-[7px] bg-[var(--bg-sink)] text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] outline-none focus:border-[var(--p500)] transition-colors"
          />
        </div>
      )}

      {/* ── Text composer (when no media) ── */}
      {!file && (
        <div className={cn(
          'border rounded-[12px] px-3 py-[9px] bg-[var(--bg-sink)] transition-colors mb-2',
          draft ? 'border-[var(--p500)]' : 'border-[var(--bd-def)]',
        )}>
          <textarea
            rows={1}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Écrire à ${convFirstName}… (Ctrl+Entrée pour envoyer)`}
            className="w-full bg-transparent border-none outline-none resize-none text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] leading-relaxed"
          />
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1">
        <button
          className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-[var(--bd-def)] transition-colors"
          title="Emoji (bientôt)"
        >
          <SmileyIcon size={15} className="text-[var(--tx-3)]" />
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-[var(--bd-def)] transition-colors"
          title="Joindre un fichier"
        >
          <PaperclipIcon size={15} className={file ? 'text-[var(--p500)]' : 'text-[var(--tx-3)]'} />
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />

        {!file && (
          <span className="ml-auto text-[10px] text-[var(--tx-3)] tabular-nums mr-2">
            {draft.length} / 1 000
          </span>
        )}
        {file && <span className="flex-1" />}

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'w-[30px] h-[30px] rounded-[8px] flex items-center justify-center transition-all',
            canSend ? 'bg-[var(--p500)] hover:opacity-90 active:scale-95' : 'bg-[var(--bd-def)] cursor-default',
          )}
        >
          {sending
            ? <SpinnerGapIcon size={14} className="text-white animate-spin" />
            : <PaperPlaneTiltIcon size={14} className={canSend ? 'text-white' : 'text-[var(--tx-3)]'} />
          }
        </button>
      </div>
    </div>
  );
}
