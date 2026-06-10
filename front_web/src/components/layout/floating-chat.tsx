'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  XIcon, PaperPlaneTiltIcon, SparkleIcon, MicrophoneIcon, StopCircleIcon,
  TrashIcon, FilePdfIcon, FileTextIcon, CheckCircleIcon, WarningIcon,
} from '@phosphor-icons/react';
import { PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { ApiUser, User } from '@/types/user_type';

type ChatView = 'idle' | 'recording' | 'processing' | 'transcribed' | 'validated';

const WAVE_BARS = 22;

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

interface FloatingChatProps {
  user: User;
  rawUser: ApiUser | null;
}

export default function FloatingChat({user, rawUser}: FloatingChatProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ChatView>('idle');
  const [recSeconds, setRecSeconds] = useState(0);
  const [recDuration, setRecDuration] = useState('');
  const [progress, setProgress] = useState(0);
  const [transcriptText, setTranscriptText] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [waveHeights, setWaveHeights] = useState(() =>
    Array.from({ length: WAVE_BARS }, () => 4),
  );
  const [apiError, setApiError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecondsRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, view]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setApiError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // audio/ogg not accepted by the backend — keep only webm and mp4
      const mimeType = ['audio/webm', 'audio/mp4'].find(t =>
        MediaRecorder.isTypeSupported(t),
      ) ?? '';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      recSecondsRef.current = 0;
      setRecSeconds(0);
      setView('recording');

      timerRef.current = setInterval(() => {
        recSecondsRef.current += 1;
        setRecSeconds(s => s + 1);
      }, 1000);

      waveTimerRef.current = setInterval(() => {
        setWaveHeights(Array.from({ length: WAVE_BARS }, () => Math.floor(Math.random() * 22) + 3));
      }, 80);
    } catch {
      setApiError('Microphone non disponible ou accès refusé.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    const duration = formatDuration(recSecondsRef.current);
    setRecDuration(duration);

    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      // Strip codec info (e.g. "audio/webm;codecs=opus" → "audio/webm") so the
      // backend's exact-match validation against its allowed types list succeeds.
      const rawMime = audioChunksRef.current[0]?.type ?? 'audio/webm';
      const mimeType = rawMime.split(';')[0];
      const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());

      setView('processing');
      setProgress(0);

      const progressInterval = setInterval(() => {
        setProgress(p => (p >= 90 ? p : p + Math.random() * 12));
      }, 280);

      const audioFile = new File([audioBlob], `recording.${ext}`, { type: mimeType });

      const res = await PostData<{ text: string }>({
        url: ApiRoutes.VOCAL_TRANSCRIBE,
        data: { file: audioFile } as unknown as Record<string, unknown>,
        isMultipart: true,
        protected: true,
      });

      clearInterval(progressInterval);

      if (!res.ok || !res.data) {
        setApiError(res.error ?? 'Erreur lors de la transcription.');
        setView('idle');
        return;
      }

      setProgress(100);
      setTimeout(() => {
        setTranscriptText(res.data!.text);
        setView('transcribed');
      }, 380);
    };

    mediaRecorderRef.current.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current.stop();
    }
    setView('idle');
    setRecSeconds(0);
  }, []);

  const handleReject = useCallback(() => {
    setShowRejectConfirm(false);
    setView('idle');
    setTranscriptText('');
    setRecDuration('');
  }, []);

  const wordCount = countWords(transcriptText);

  const fullName = (user?.prenom || user?.nom)
    ? `${user.prenom} ${user.nom}`.trim()
    : rawUser?.email?.split('@')[0] ?? 'Utilisateur';

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[59] bg-black/20"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-screen w-[400px] bg-white border-l border-[var(--bd-def)] shadow-[var(--sh-xl)] z-[60] flex flex-col transition-transform duration-300 ease-in-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--bd-def)] flex-shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--grad)' }}
          >
            <span className="text-white text-lg leading-none">✦</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--tx-1)] text-sm">Assistant IA PortaLis</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] text-success">En ligne · Claude Sonnet 4.5</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors"
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 overflow-auto">
          {/* Welcome message */}
          <div className="flex items-start gap-3">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'var(--grad)' }}
            >
              <span className="text-white text-xs leading-none">✦</span>
            </div>
            <div className="flex-1">
              <div className="bg-[var(--bg-sink)] rounded-2xl rounded-tl-sm px-4 py-3">
                <p className="text-sm text-[var(--tx-1)] leading-relaxed">
                  Bonjour {fullName} ! J&apos;ai <strong>3 éléments</strong> en attente de
                  validation. Voulez-vous que je vous résume les priorités du jour ?
                </p>
              </div>
              <p className="text-[10px] text-[var(--tx-3)] mt-1 ml-1">09h14</p>
            </div>
          </div>

          {/* Processing card */}
          {view === 'processing' && (
            <div className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-[2px] border-violet-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-bold tracking-widest text-violet-600">ENREGISTREMENT REÇU</span>
                </div>
                <span className="text-[11px] font-bold text-success">{Math.round(progress)}&nbsp;%</span>
              </div>
              <div className="h-1.5 bg-violet-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* CR Vocal card */}
          {(view === 'transcribed' || view === 'validated') && (
            <div className="rounded-2xl bg-violet-50 border border-violet-100 overflow-auto">
              {/* Card top row */}
              <div className="flex items-center justify-between px-4 py-2.5">
                {view === 'transcribed' ? (
                  <span className="text-[10px] font-bold text-violet-700 bg-violet-200/60 px-2.5 py-[3px] rounded-full">
                    CR VOCAL — À CORRIGER
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-[3px] rounded-full">
                    CR VOCAL — VALIDÉ
                  </span>
                )}
                {view === 'transcribed' && (
                  <span className="text-[10px] text-[var(--tx-3)] font-medium">
                    {wordCount} MOTS · {recDuration}
                  </span>
                )}
              </div>

              {view === 'transcribed' ? (
                <div className="px-4 pb-4 flex flex-col gap-3">
                  {/* Editable transcript */}
                  <textarea
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                    rows={5}
                    className="w-full text-sm text-[var(--tx-1)] leading-relaxed bg-white rounded-xl border border-violet-100 px-3 py-2.5 resize-none outline-none focus:border-violet-300 transition-colors"
                  />

                  {/* Export */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-[var(--tx-3)]">EXPORTER :</span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--bd-def)] bg-white text-[11px] font-medium text-[var(--tx-2)] hover:border-violet-200 transition-colors">
                      <FilePdfIcon size={12} />
                      PDF
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--bd-def)] bg-white text-[11px] font-medium text-[var(--tx-2)] hover:border-violet-200 transition-colors">
                      <FileTextIcon size={12} />
                      Word
                    </button>
                  </div>

                  {/* Actions */}
                  {showRejectConfirm ? (
                    <div className="rounded-xl bg-[#16152b] p-4">
                      <p className="text-[13px] font-semibold text-white mb-3">
                        Rejeter ce compte-rendu ?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowRejectConfirm(false)}
                          className="flex-1 h-8 rounded-lg border border-white/20 text-[11px] font-semibold text-white/60 hover:bg-white/10 transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleReject}
                          className="flex-1 h-8 rounded-lg border border-red-500/40 bg-red-500/10 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <TrashIcon size={12} />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setView('validated')}
                        className="flex-1 h-9 rounded-xl text-[12px] font-semibold text-white flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[.98] transition-all"
                        style={{ background: 'var(--grad)' }}
                      >
                        <CheckCircleIcon size={14} weight="fill" />
                        Valider et enregistrer
                      </button>
                      <button
                        onClick={() => setShowRejectConfirm(true)}
                        className="text-[12px] font-medium text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors px-2 flex-shrink-0"
                      >
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Validated */
                <div className="px-4 pb-4 flex items-center gap-2 text-emerald-600">
                  <CheckCircleIcon size={16} weight="fill" />
                  <span className="text-sm font-semibold">Enregistré dans DOS-2026-0142</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {apiError && (
            <div className="flex items-center gap-2 text-error text-xs px-1">
              <WarningIcon size={13} />
              {apiError}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input / Recording area */}
        {view === 'recording' ? (
          <div className="px-4 pt-3 pb-5 border-t border-[var(--bd-def)] flex-shrink-0">
            {/* Timer + REC + trash */}
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-mono text-[32px] font-bold text-[var(--tx-1)] leading-none">
                {formatDuration(recSeconds)}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-error bg-error/10 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                  REC
                </span>
                <button
                  onClick={cancelRecording}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:text-error hover:bg-error/10 transition-colors"
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            </div>

            <p className="text-[10px] font-semibold tracking-widest text-[var(--tx-3)] mb-3">
              VISEZ 1 À 2 MINUTES POUR UN CR COMPLET
            </p>

            {/* Waveform */}
            <div className="flex items-center justify-center gap-[2.5px] h-9 mb-4 px-1">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full transition-all duration-75"
                  style={{
                    height: `${h}px`,
                    background: h < 8
                      ? '#c4b5fd'
                      : i % 3 === 0
                        ? 'linear-gradient(to top, #6366f1, #a78bfa)'
                        : 'linear-gradient(to top, #818cf8, #c4b5fd)',
                  }}
                />
              ))}
            </div>

            {/* Stop / Cancel */}
            <div className="flex gap-2">
              <button
                onClick={stopRecording}
                className="flex-1 h-10 rounded-xl bg-error text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-error/90 transition-colors"
              >
                <StopCircleIcon size={15} weight="fill" />
                Arrêter
              </button>
              <button
                onClick={cancelRecording}
                className="h-10 px-4 rounded-xl border border-[var(--bd-def)] text-[13px] font-medium text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 border-t border-[var(--bd-def)] flex-shrink-0">
            <div className="flex items-center gap-2 bg-[var(--bg-sink)] rounded-xl px-3 py-2 border border-transparent focus-within:border-[var(--bd-focus)] focus-within:bg-white transition-colors">
              <input
                type="text"
                placeholder="Posez une question à l'IA..."
                className="flex-1 bg-transparent text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] outline-none"
              />
              <button
                onClick={startRecording}
                title="Dicter un compte-rendu vocal"
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 hover:-translate-y-px transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
              >
                <MicrophoneIcon size={13} weight="fill" className="text-white" />
              </button>
              <button
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 hover:-translate-y-px transition-all"
                style={{ background: 'var(--grad)' }}
              >
                <PaperPlaneTiltIcon size={13} weight="fill" className="text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(v => !v)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-xl flex items-center justify-center z-[61] transition-all duration-200 hover:-translate-y-1"
          style={{
            background: 'var(--grad)',
            boxShadow: '0 4px 16px rgba(27,107,69,.35)',
          }}
        >
          <SparkleIcon size={20} weight="fill" className="text-white" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-white leading-none">
            3
          </span>
        </button>
      )}
    </>
  );
}
