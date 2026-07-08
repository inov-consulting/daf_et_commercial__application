'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  XIcon, PaperPlaneTiltIcon, SparkleIcon, MicrophoneIcon, StopCircleIcon,
  TrashIcon, WarningIcon,
} from '@phosphor-icons/react';
import { PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { ApiUser, User } from '@/types/user_type';

type InputState = 'idle' | 'recording' | 'processing' | 'sending';

interface Message {
  id: number;
  role: 'ai' | 'user';
  text: string;
  time: string;
}

interface FloatingChatProps {
  user: User | null;
  rawUser: ApiUser | null;
}

const WAVE_BARS = 22;

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}h${now.getMinutes().toString().padStart(2, '0')}`;
}

function renderText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part,
  );
}

export default function FloatingChat({ user, rawUser }: FloatingChatProps) {
  const firstName = user?.prenom || rawUser?.first_name || 'vous';

  const [open, setOpen] = useState(false);
  const [inputState, setInputState] = useState<InputState>('idle');
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 0,
      role: 'ai',
      text: `Bonjour ${firstName} ! Je suis votre assistant PortaLis. Je peux vous aider sur vos **prospects**, vos **offres de transport**, vos **comptes-rendus** ou toute autre question. Comment puis-je vous aider ?`,
      time: formatTime(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [waveHeights, setWaveHeights] = useState(() =>
    Array.from({ length: WAVE_BARS }, () => 4),
  );
  const [apiError, setApiError] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecondsRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open, messages, aiThinking, inputState]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Auto-resize
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  const startRecording = useCallback(async () => {
    setApiError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      setInputState('recording');

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

    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const rawMime = audioChunksRef.current[0]?.type ?? 'audio/webm';
      const mimeType = rawMime.split(';')[0];
      const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());

      setInputState('processing');
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
      setInputState('idle');

      if (!res.ok || !res.data) {
        setApiError(res.error ?? 'Erreur lors de la transcription.');
        return;
      }

      setInputText(res.data.text);
      setTimeout(() => textareaRef.current?.focus(), 80);
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
    setInputState('idle');
    setRecSeconds(0);
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || inputState !== 'idle') return;

    setInputText('');
    setApiError(null);

    setMessages(prev => [
      ...prev,
      { id: Date.now(), role: 'user', text, time: formatTime() },
    ]);
    setInputState('sending');
    setAiThinking(true);

    const res = await PostData<{ session_id: string; response: string; tool_used: string; turn: number }>({
      url: ApiRoutes.CHAT_MESSAGE,
      data: sessionId ? { session_id: sessionId, message: text } : { message: text },
      protected: true,
    });

    setAiThinking(false);
    setInputState('idle');

    if (!res.ok || !res.data) {
      setApiError(res.error ?? 'Erreur lors de l\'envoi du message.');
      return;
    }

    setSessionId(res.data.session_id);
    setMessages(prev => [
      ...prev,
      { id: Date.now() + 1, role: 'ai', text: res.data!.response, time: formatTime() },
    ]);
  }, [inputText, inputState, sessionId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const initials = user?.initials ?? '?';

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
        className="fixed top-0 right-0 h-screen w-full sm:w-[400px] bg-white border-l border-[var(--bd-def)] shadow-[var(--sh-xl)] z-[60] flex flex-col transition-transform duration-300 ease-in-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--bd-def)] flex-shrink-0">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--grad)' }}
          >
            <span className="text-white text-base sm:text-lg leading-none">✦</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--tx-1)] text-xs sm:text-sm">Assistant IA PortaLis</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] sm:text-[11px] text-success">En ligne · IA</span>
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
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 sm:py-5 flex flex-col gap-3 sm:gap-4">
          {messages.map(msg => msg.role === 'ai' ? (
            <div key={msg.id} className="flex items-start gap-2 sm:gap-3">
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--grad)' }}
              >
                <span className="text-white text-[10px] sm:text-xs leading-none">✦</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-[var(--bg-sink)] rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2.5 sm:py-3">
                  <p className="text-xs sm:text-sm text-[var(--tx-1)] leading-relaxed break-words">
                    {renderText(msg.text)}
                  </p>
                </div>
                <p className="text-[9px] sm:text-[10px] text-[var(--tx-3)] mt-1 ml-1">{msg.time}</p>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex items-start gap-2 sm:gap-3 flex-row-reverse">
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[9px] sm:text-[10px] font-bold leading-none"
                style={{ background: 'var(--grad)' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="rounded-2xl rounded-tr-sm px-3 sm:px-4 py-2.5 sm:py-3"
                  style={{ background: 'var(--grad)' }}
                >
                  <p className="text-xs sm:text-sm text-white leading-relaxed break-words">{msg.text}</p>
                </div>
                <p className="text-[9px] sm:text-[10px] text-[var(--tx-3)] mt-1 mr-1 text-right">{msg.time}</p>
              </div>
            </div>
          ))}

          {/* AI thinking indicator */}
          {aiThinking && (
            <div className="flex items-start gap-2 sm:gap-3">
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--grad)' }}
              >
                <span className="text-white text-[10px] sm:text-xs leading-none">✦</span>
              </div>
              <div className="bg-[var(--bg-sink)] rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--tx-3)] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--tx-3)] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--tx-3)] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {/* Error */}
          {apiError && (
            <div className="flex items-center gap-2 text-error text-[10px] sm:text-xs px-1">
              <WarningIcon size={13} />
              <span className="break-words">{apiError}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input / Recording area */}
        {inputState === 'recording' ? (
          <div className="px-3 sm:px-4 pt-3 pb-4 sm:pb-5 border-t border-[var(--bd-def)] flex-shrink-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-mono text-2xl sm:text-[32px] font-bold text-[var(--tx-1)] leading-none">
                {formatDuration(recSeconds)}
              </span>
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold text-error bg-error/10 px-2 sm:px-2.5 py-1 rounded-full">
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

            <p className="text-[9px] sm:text-[10px] font-semibold tracking-widest text-[var(--tx-3)] mb-2 sm:mb-3">
              VISEZ 1 À 2 MINUTES POUR UN CR COMPLET
            </p>

            <div className="flex items-center justify-center gap-[2px] sm:gap-[2.5px] h-8 sm:h-9 mb-3 sm:mb-4 px-1">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-[2.5px] sm:w-[3px] rounded-full transition-all duration-75"
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

            <div className="flex gap-2">
              <button
                onClick={stopRecording}
                className="flex-1 h-10 rounded-xl bg-error text-white text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-error/90 transition-colors"
              >
                <StopCircleIcon size={15} weight="fill" />
                Arrêter
              </button>
              <button
                onClick={cancelRecording}
                className="h-10 px-3 sm:px-4 rounded-xl border border-[var(--bd-def)] text-xs sm:text-[13px] font-medium text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-[var(--bd-def)] flex-shrink-0">
            <div
              className={`rounded-2xl border transition-all duration-300 ${
                inputState === 'processing'
                  ? 'bg-violet-50/50 border-violet-200/60 shadow-sm shadow-violet-100/80'
                  : 'bg-[var(--bg-sink)] border-transparent focus-within:border-[var(--bd-focus)] focus-within:bg-white focus-within:shadow-sm'
              }`}
            >
              {/* Status bar – processing / sending */}
              {inputState !== 'idle' && (
                <div className="flex items-center gap-2 px-3 sm:px-4 pt-2 sm:pt-2.5 pb-0.5">
                  {inputState === 'processing' ? (
                    <>
                      <span className="flex gap-[3px] items-end h-3">
                        {[0, 120, 240].map((d) => (
                          <span
                            key={d}
                            className="w-[3px] h-[3px] rounded-full bg-violet-400 animate-bounce"
                            style={{ animationDelay: `${d}ms` }}
                          />
                        ))}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-medium text-violet-500 tracking-wide">
                        Transcription en cours…
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 border-[1.5px] border-[var(--tx-3)] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] sm:text-[11px] font-medium text-[var(--tx-3)] tracking-wide">Envoi…</span>
                    </>
                  )}
                </div>
              )}

              {/* Input row */}
              <div className="flex items-end gap-1.5 sm:gap-2 px-2 sm:px-3 py-2">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputState === 'processing' ? '' : "Posez une question à l&apos;IA…"}
                  disabled={inputState !== 'idle'}
                  rows={1}
                  className="flex-1 bg-transparent text-xs sm:text-sm leading-relaxed text-[var(--tx-1)] placeholder:text-[var(--tx-3)] outline-none border-none resize-none overflow-hidden disabled:opacity-40 transition-opacity duration-300 py-0 px-0"
                />

                <button
                  onClick={startRecording}
                  disabled={inputState !== 'idle'}
                  title="Dicter un message vocal"
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:-translate-y-px disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
                >
                  <MicrophoneIcon size={13} weight="fill" className="text-white" />
                </button>

                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || inputState !== 'idle'}
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:-translate-y-px disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
                  style={{ background: 'var(--grad)' }}
                >
                  {inputState === 'sending' ? (
                    <span className="w-3 h-3 border-[1.5px] border-white/80 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PaperPlaneTiltIcon size={13} weight="fill" className="text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(v => !v)}
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center z-[61] transition-all duration-200 hover:-translate-y-1"
          style={{
            background: 'var(--grad)',
            boxShadow: '0 4px 16px rgba(27,107,69,.35)',
          }}
        >
          <SparkleIcon size={18} weight="fill" className="text-white sm:hidden" />
          <SparkleIcon size={20} weight="fill" className="text-white hidden sm:block" />
          {/* <span className="absolute -top-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-error rounded-full text-white text-[8px] sm:text-[9px] font-bold flex items-center justify-center border-2 border-white leading-none">
            3
          </span> */}
        </button>
      )}
    </>
  );
}