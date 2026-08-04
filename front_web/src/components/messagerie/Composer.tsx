'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  PaperclipIcon,
  PaperPlaneTiltIcon,
  SpinnerGapIcon,
  XIcon,
  MicrophoneIcon,
  StopIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { fileKind, docLabel, docColor, type FileKind } from '@/lib/utils';

interface ComposerProps {
  convFirstName:    string;
  sending:          boolean;
  sendError:        string | null;
  onSend:           (text: string, file?: File) => void;
  onTranscribeFile: (file: File) => Promise<string>;
}

function DocIcon({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h6l4.5 4.5v14A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5Z" stroke={color} />
      <path d="M13.5 2v4.5H18" stroke={color} />
    </svg>
  );
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function Composer({ convFirstName, sending, sendError, onSend, onTranscribeFile }: ComposerProps) {
  const fileRef        = useRef<HTMLInputElement>(null);
  const [draft,        setDraft]          = useState('');
  const [file,         setFile]           = useState<File | null>(null);
  const [caption,      setCaption]        = useState('');
  const [previewUrl,   setPreviewUrl]     = useState<string | null>(null);
  const [kind,         setKind]           = useState<FileKind | null>(null);

  // Recording state
  const [isRecording,   setIsRecording]   = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Transcription review state
  const [isTranscribing,  setIsTranscribing]  = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [reviewText,      setReviewText]      = useState<string | null>(null);
  const mediaRecorderRef     = useRef<MediaRecorder | null>(null);
  const streamRef            = useRef<MediaStream | null>(null);
  const chunksRef            = useRef<Blob[]>([]);
  const timerRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTranscribeFileRef  = useRef(onTranscribeFile);
  useEffect(() => { onTranscribeFileRef.current = onTranscribeFile; }, [onTranscribeFile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Voice recording ────────────────────────────────────────────────────────

  async function startRecording() {
    if (file) clearFile(); // discard pending file before recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([blob], `note-vocale.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        // Lancer la transcription immédiatement après l'enregistrement
        setTranscribeError(null);
        try {
          const text = await onTranscribeFileRef.current(audioFile);
          setReviewText(text);
        } catch {
          setTranscribeError('Transcription échouée, réessayez.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      // Microphone access denied or unavailable — fail silently
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    setIsTranscribing(true); // affiché immédiatement pendant que onstop traite
    mediaRecorderRef.current?.stop();
  }

  function cancelRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null; // empêche l'auto-transcription
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordSeconds(0);
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  async function handleSend() {
    if (sending || isRecording || isTranscribing) return;

    // Mode révision — envoie le texte corrigé
    if (reviewText !== null) {
      const t = reviewText.trim();
      if (!t) return;
      onSend(t);
      setReviewText(null);
      setTranscribeError(null);
      return;
    }

    // Cas normal (texte ou fichier non-audio)
    const text = file ? caption.trim() : draft.trim();
    if (!text && !file) return;
    onSend(text, file ?? undefined);
    setDraft('');
    clearFile();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
  }

  const canSend = !sending && !isRecording && !isTranscribing &&
    (reviewText !== null ? !!reviewText.trim() : (!!draft.trim() || !!file));

  return (
    <div className="px-5 py-3.5 border-t border-[var(--bd-def)] bg-white flex-shrink-0">
      {sendError && (
        <p className="text-[11px] text-error mb-2">{sendError}</p>
      )}

      {/* ── Mode révision transcription ── */}
      {reviewText !== null && (
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6C4CE0]">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-[9px] h-[9px]">
              <path d="M3 3h10v1.5H3zM3 6h7v1.5H3zM3 9h10v1.5H3zM3 12h5v1.5H3z" />
            </svg>
            Transcription — vérifiez et ajustez si besoin
          </div>
          <textarea
            rows={3}
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
            className="w-full border border-[#6C4CE0] rounded-[10px] px-3 py-2.5 bg-[#F5F3FF] text-[12.5px] text-[var(--tx-1)] outline-none resize-none leading-relaxed"
            autoFocus
          />
          <button
            onClick={() => { setReviewText(null); setTranscribeError(null); }}
            className="self-start text-[11px] text-[var(--tx-3)] hover:text-error transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      {/* ── Erreur de transcription ── */}
      {transcribeError && (
        <p className="text-[11px] text-error mb-2">{transcribeError}</p>
      )}

      {/* ── Transcription en cours ── */}
      {isTranscribing && (
        <div className="mb-3 flex items-center gap-2 text-[12px] text-[var(--tx-3)]">
          <SpinnerGapIcon size={14} className="animate-spin text-[#6C4CE0]" />
          Transcription en cours…
        </div>
      )}

      {/* ── Media preview ── */}
      {file && kind && !isRecording && reviewText === null && (
        <div className="mb-3 flex flex-col gap-2">
          {/* Image preview */}
          {kind === 'image' && previewUrl && (
            <div className="relative self-start">
              <Image
                src={previewUrl}
                alt={file.name}
                width={280}
                height={160}
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

          {/* Document row (non-audio, non-image, non-video) */}
          {kind === 'document' && (
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
          {(
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Ajouter une légende…"
              className="w-full border border-[var(--bd-def)] rounded-[9px] px-3 py-[7px] bg-[var(--bg-sink)] text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] outline-none focus:border-[var(--p500)] transition-colors"
            />
          )}
        </div>
      )}

      {/* ── Text composer (when no media, not recording, not in review) ── */}
      {!file && !isRecording && reviewText === null && (
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
        {isRecording ? (
          /* Recording mode */
          <>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-[12.5px] font-semibold text-[var(--tx-1)] tabular-nums ml-1">
              {formatDuration(recordSeconds)}
            </span>
            <span className="text-[11px] text-[var(--tx-3)] ml-1">Enregistrement…</span>
            <span className="flex-1" />
            <button
              onClick={cancelRecording}
              title="Annuler"
              className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-[var(--bd-def)] transition-colors"
            >
              <XIcon size={14} className="text-[var(--tx-3)]" />
            </button>
            <button
              onClick={stopRecording}
              title="Arrêter l'enregistrement"
              className="w-[30px] h-[30px] rounded-[8px] bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors ml-1"
            >
              <StopIcon size={13} weight="fill" className="text-white" />
            </button>
          </>
        ) : (
          /* Normal mode */
          <>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />

            {!file && (
              <span className="text-[10px] text-[var(--tx-3)] tabular-nums">
                {draft.length} / 1 000
              </span>
            )}

            <span className="flex-1" />

            <div className="flex items-center gap-1">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-[var(--bd-def)] transition-colors"
                title="Joindre un fichier"
              >
                <PaperclipIcon size={15} className={file ? 'text-[var(--p500)]' : 'text-[var(--tx-3)]'} />
              </button>
              <button
                onClick={startRecording}
                disabled={!!file}
                className={cn(
                  'w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors',
                  file ? 'cursor-default opacity-40' : 'hover:bg-[var(--bd-def)]',
                )}
                title="Enregistrer une note vocale"
              >
                <MicrophoneIcon size={15} className="text-[var(--tx-3)]" />
              </button>
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
          </>
        )}
      </div>
    </div>
  );
}
