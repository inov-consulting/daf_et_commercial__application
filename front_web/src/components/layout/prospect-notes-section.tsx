'use client';

import { useState, useEffect, useRef } from 'react';
import {
  PlusIcon, TrashIcon, ChatCenteredTextIcon,
  MicrophoneIcon, SquareIcon, CircleNotchIcon, WarningIcon,
  XIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchNotes, addNote, deleteNote } from '@/redux/features/notes/notesSlice';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { cn } from '@/lib/utils';
import { NoteContent } from '@/components/ui/note-content';

interface ProspectNotesSectionProps {
  prospectId: string;
}

type VoiceState = 'idle' | 'recording' | 'transcribing';

function fmtTimer(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ProspectNotesSection({ prospectId }: ProspectNotesSectionProps) {
  const dispatch = useAppDispatch();

  /* ── Redux ──────────────────────────────────────────────────────────── */
  const notes       = useAppSelector(s => s.notes.byProspect[prospectId] ?? []);
  const loading     = useAppSelector(s => s.notes.byProspect[prospectId] === undefined || !!s.notes.loading[prospectId]);
  const fetchError  = useAppSelector(s => s.notes.error[prospectId] ?? null);
  const submitting  = useAppSelector(s => s.notes.submitting);
  const submitError = useAppSelector(s => s.notes.submitError);

  /* ── Text input ─────────────────────────────────────────────────────── */
  const [newContent, setNewContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const [deleteNoteError, setDeleteNoteError] = useState<string | null>(null);

  /* ── Voice recording ─────────────────────────────────────────────────── */
  const [voiceState, setVoiceState]   = useState<VoiceState>('idle');
  const [recordTimer, setRecordTimer] = useState(0);
  const [voiceError, setVoiceError]   = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const timerRef         = useRef<NodeJS.Timeout | null>(null);

  /* ── Effects ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    dispatch(fetchNotes(prospectId));
  }, [dispatch, prospectId]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  }, []);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  async function handleAddNote() {
    if (!newContent.trim()) return;
    const result = await dispatch(addNote({ prospectId, content: newContent.trim() }));
    if (addNote.fulfilled.match(result)) setNewContent('');
  }

  async function handleConfirmDeleteNote() {
    if (!confirmDeleteNoteId) return;
    setDeletingId(confirmDeleteNoteId);
    setDeleteNoteError(null);
    const result = await dispatch(deleteNote({ prospectId, noteId: confirmDeleteNoteId }));
    setDeletingId(null);
    if (deleteNote.rejected.match(result)) {
      setDeleteNoteError((result.payload as string) ?? 'Erreur lors de la suppression');
    } else {
      setConfirmDeleteNoteId(null);
    }
  }

  async function startVoiceRecording() {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current   = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(100);
      setRecordTimer(0);
      setVoiceState('recording');
      timerRef.current = setInterval(() => setRecordTimer(s => s + 1), 1000);
    } catch {
      setVoiceError('Microphone non disponible ou accès refusé.');
    }
  }

  function stopVoiceRecording() {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setVoiceState('transcribing');

    mediaRecorderRef.current.onstop = async () => {
      const rawMime  = audioChunksRef.current[0]?.type ?? 'audio/webm';
      const mimeType = rawMime.split(';')[0];
      const ext      = mimeType.includes('mp4') ? 'm4a' : 'webm';
      const blob     = new Blob(audioChunksRef.current, { type: mimeType });
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());

      const audioFile = new File([blob], `recording.${ext}`, { type: mimeType });
      const res = await PostData<{ text: string }>({
        url: ApiRoutes.VOCAL_TRANSCRIBE,
        data: { file: audioFile } as unknown as Record<string, unknown>,
        isMultipart: true,
        protected: true,
      });

      setVoiceState('idle');
      if (!res.ok || !res.data) {
        setVoiceError(res.error ?? 'Erreur lors de la transcription.');
        return;
      }
      /* Append si du texte existe déjà, sinon remplace */
      setNewContent(prev =>
        prev.trim() ? `${prev.trim()}\n${res.data!.text}` : res.data!.text,
      );
    };

    mediaRecorderRef.current.stop();
  }

  const busy = voiceState !== 'idle';

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes note-blink { 0%,100%{opacity:1} 50%{opacity:.15} }
        .note-blink { animation: note-blink 1s ease-in-out infinite; }
        @keyframes note-mic-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }
        .note-mic-pulse { animation: note-mic-pulse 1.4s ease-in-out infinite; }
      `}</style>

      <div className="bg-[var(--bg-surf)] border border-[var(--bd-def)] rounded-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--bd-def)]">
          <ChatCenteredTextIcon size={15} className="text-[var(--p500)]" />
          <h2 className="text-[13px] font-semibold text-[var(--tx-1)]">Notes de prospection</h2>
          {!loading && (
            <span className="ml-auto text-[11px] text-[var(--tx-3)] font-mono bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">
              {notes.length}
            </span>
          )}
        </div>

        {/* ── Add note form ── */}
        <div className="p-4 border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">

          {/* Textarea + overlaid mic button */}
          <div className="relative">
            <Textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !busy) handleAddNote(); }}
              placeholder={
                voiceState === 'recording'    ? 'Enregistrement en cours…' :
                voiceState === 'transcribing' ? 'Transcription en cours…'  :
                'Ajouter une note… (Ctrl+Entrée pour enregistrer)'
              }
              rows={3}
              disabled={voiceState === 'transcribing'}
              className={cn(
                'min-h-0 text-[13px] resize-none pr-9 pb-8',
                voiceState === 'recording'    && '!border-red-400 focus:!shadow-[0_0_0_3px_rgba(239,68,68,.12)]',
                voiceState === 'transcribing' && 'opacity-60 cursor-wait',
              )}
            />

            {/* REC badge — en haut à droite dans le textarea */}
            {voiceState === 'recording' && (
              <div
                className="absolute top-2 right-9 flex items-center gap-1 px-1.5 py-0.5 rounded-full pointer-events-none select-none"
                style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)' }}
              >
                <span className="w-[6px] h-[6px] rounded-full bg-red-500 note-blink" />
                <span className="text-[10px] font-bold tabular-nums" style={{ color: '#DC2626' }}>
                  {fmtTimer(recordTimer)}
                </span>
              </div>
            )}

            {/* Mic / Stop / Spinner — en bas à droite dans le textarea */}
            <button
              type="button"
              onClick={voiceState === 'recording' ? stopVoiceRecording : voiceState === 'idle' ? startVoiceRecording : undefined}
              disabled={voiceState === 'transcribing'}
              title={voiceState === 'recording' ? "Arrêter l'enregistrement" : 'Dicter cette note'}
              className={cn(
                'absolute bottom-2.5 right-2 w-[26px] h-[26px] rounded-lg flex items-center justify-center',
                'transition-all duration-150 z-10',
                voiceState === 'idle'        && 'text-[var(--tx-3)] hover:text-red-500 hover:bg-red-50',
                voiceState === 'recording'   && 'bg-red-500 text-white note-mic-pulse',
                voiceState === 'transcribing' && 'text-[var(--tx-3)] cursor-wait',
              )}
            >
              {voiceState === 'transcribing' ? (
                <CircleNotchIcon size={13} className="animate-spin" />
              ) : voiceState === 'recording' ? (
                <SquareIcon size={11} weight="fill" />
              ) : (
                <MicrophoneIcon size={13} />
              )}
            </button>
          </div>

          {/* Voice error */}
          {voiceError && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-500 mt-1.5">
              <WarningIcon size={11} className="flex-shrink-0" />
              {voiceError}
            </div>
          )}

          {/* Submit / API errors */}
          {(submitError || fetchError) && (
            <p className="text-[11px] text-red-500 mt-1">{submitError ?? fetchError}</p>
          )}

          {/* Bottom row : status voice à gauche, bouton Ajouter à droite */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="text-[11px]">
              {voiceState === 'recording' && (
                <span className="flex items-center gap-1.5 text-red-500">
                  <span className="w-[5px] h-[5px] rounded-full bg-red-500 note-blink" />
                  Cliquez ■ pour terminer et transcrire
                </span>
              )}
              {voiceState === 'transcribing' && (
                <span className="flex items-center gap-1.5 text-[var(--tx-3)]">
                  <CircleNotchIcon size={11} className="animate-spin" />
                  Transcription en cours…
                </span>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAddNote}
              disabled={!newContent.trim() || submitting || busy}
            >
              <PlusIcon size={13} />
              {submitting ? 'Envoi…' : 'Ajouter'}
            </Button>
          </div>
        </div>

        {/* ── Notes list ── */}
        <div className="divide-y divide-[var(--bd-def)]">
          {loading ? (
            <div className="py-8 text-center text-[12px] text-[var(--tx-3)]">Chargement…</div>
          ) : notes.length === 0 ? (
            <div className="py-10 text-center">
              <ChatCenteredTextIcon size={28} className="text-[var(--tx-3)] mx-auto mb-2 opacity-50" />
              <p className="text-[12px] text-[var(--tx-3)]">Aucune note pour ce prospect.</p>
            </div>
          ) : (
            notes.map(note => (
              <div key={note.id} className="group px-5 py-4 hover:bg-[var(--bg-sink)] transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                    style={{ background: 'var(--grad)' }}
                  >
                    {note.author_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <NoteContent content={note.content} />
                    <p className="text-[11px] text-[var(--tx-3)] mt-1">{timeAgo(note.created_at)}</p>
                  </div>
                  <button
                    onClick={() => { setDeleteNoteError(null); setConfirmDeleteNoteId(note.id); }}
                    disabled={deletingId === note.id}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-[var(--tx-3)] hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0 mt-0.5"
                  >
                    {deletingId === note.id
                      ? <CircleNotchIcon size={13} className="animate-spin" />
                      : <TrashIcon size={13} />
                    }
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* ── Modal de confirmation de suppression de note ── */}
      {confirmDeleteNoteId && (() => {
        const note = notes.find(n => n.id === confirmDeleteNoteId);
        const preview = note?.content
          ? note.content.length > 80 ? note.content.slice(0, 80) + '…' : note.content
          : '–';
        return (
          <>
            <div
              className="fixed inset-0 z-[210] bg-black/50"
              onClick={() => { if (!deletingId) setConfirmDeleteNoteId(null); }}
            />
            <div className="fixed inset-0 z-[211] flex items-center justify-center p-4 pointer-events-none">
              <div
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[var(--bd-def)] overflow-hidden pointer-events-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="h-[3px] w-full bg-[#EF4444]" />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                      <TrashIcon size={16} className="text-[#DC2626]" weight="bold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-bold text-[var(--tx-1)]">Supprimer cette note</h3>
                      <p className="text-[11px] text-[var(--tx-3)] mt-0.5 italic leading-relaxed line-clamp-2">&ldquo;{preview}&rdquo;</p>
                    </div>
                    <button
                      onClick={() => { if (!deletingId) setConfirmDeleteNoteId(null); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>

                  <p className="text-[12px] text-[var(--tx-3)] leading-relaxed mb-4">
                    Cette action est <span className="font-semibold text-[var(--tx-2)]">irréversible</span>. La note sera définitivement supprimée.
                  </p> 

                  {deleteNoteError && (
                    <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                      <WarningCircleIcon size={14} className="flex-shrink-0 mt-0.5" />
                      <span className="text-[12px]">{deleteNoteError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDeleteNoteId(null)}
                      disabled={!!deletingId}
                      className="flex-1 h-9 rounded-xl text-[13px] font-semibold text-[var(--tx-2)] bg-[var(--bg-sink)] border border-[var(--bd-def)] hover:bg-[var(--bd-def)] disabled:opacity-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleConfirmDeleteNote}
                      disabled={!!deletingId}
                      className="flex-1 h-9 rounded-xl text-[13px] font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                    >
                      {deletingId
                        ? <><CircleNotchIcon size={13} className="animate-spin" /> Suppression…</>
                        : <><TrashIcon size={13} weight="bold" /> Supprimer</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
}
