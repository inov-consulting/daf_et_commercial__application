'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  DownloadSimpleIcon,
  PaperPlaneTiltIcon,
  PaperclipIcon,
  SmileyIcon,
  DotsThreeVerticalIcon,
  PlayIcon,
  ArrowCounterClockwiseIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchConversations,
  fetchMessages,
  startConversation,
  replyToConversation,
  generateConvCr,
  setActiveConvId,
  type WaConversation,
  type WaMessage,
} from '@/redux/features/whatsapp/whatsappSlice';

// ── Helpers ────────────────────────────────────────────────────────────────────

const COLORS = ['#1C7A54', '#6C4CE0', '#9C6B14', '#2C4A8C', '#B3302B', '#0F6E63', '#4A2C8C', '#C07A1A'];

function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d   = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7)   return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function waveBars(seed: string, n = 20): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: n }, () => {
    h = (h * 9301 + 49297) % 233_280;
    return Math.floor(5 + (h / 233_280) * 17);
  });
}

function convName(c: WaConversation): string {
  return c.contact_name || c.display_phone_number;
}

function hasBothSides(msgs: WaMessage[]): boolean {
  return msgs.some(m => m.direction === 'inbound') && msgs.some(m => m.direction === 'outbound');
}

// ── Source badge ───────────────────────────────────────────────────────────────

function WhatsAppBadge() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 w-[15px] h-[15px] rounded-full bg-white flex items-center justify-center p-[2px]">
      <svg viewBox="0 0 24 24" fill="#25D366" className="w-full h-full">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z" />
      </svg>
    </span>
  );
}

// ── Conversation list item ─────────────────────────────────────────────────────

function ConvItem({
  conv, active, unread, onClick,
}: {
  conv:    WaConversation;
  active:  boolean;
  unread:  boolean;
  onClick: () => void;
}) {
  const name  = convName(conv);
  const color = colorFromId(conv.id);
  const done  = conv.status === 'closed';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex gap-2.5 px-2 py-[9px] rounded-[9px] text-left items-start transition-colors',
        active ? 'bg-[var(--bg-sink)]' : 'hover:bg-[var(--bg-sink)]/60',
      )}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-[11px] font-bold"
          style={{ background: color }}
        >
          {initials(name)}
        </div>
        <WhatsAppBadge />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2 mb-[2px]">
          <span className="text-[13px] font-semibold text-[var(--tx-1)] truncate">{name}</span>
          <span className="text-[11px] text-[var(--tx-3)] flex-shrink-0 tabular-nums">
            {formatTime(conv.last_message_at)}
          </span>
        </div>
        <p className="text-[11px] text-[var(--tx-3)] mb-[3px] truncate">{conv.display_phone_number}</p>
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            'text-[12px] truncate',
            unread ? 'font-semibold text-[var(--tx-1)]' : 'text-[var(--tx-3)]',
          )}>
            {conv.message_count > 0
              ? `${conv.message_count} message${conv.message_count > 1 ? 's' : ''}`
              : 'Aucun message'}
          </p>
          {unread && <span className="w-[7px] h-[7px] rounded-full bg-[var(--p500)] flex-shrink-0" />}
          {done && !unread && (
            <span className="text-[10px] font-bold text-[var(--p500)] bg-[#E6F3EC] px-1.5 py-[2px] rounded-full flex-shrink-0 whitespace-nowrap">
              Terminé
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Skeleton list items ────────────────────────────────────────────────────────

function ConvSkeleton() {
  return (
    <div className="flex gap-2.5 px-2 py-[9px]">
      <div className="w-[38px] h-[38px] rounded-full bg-[var(--bd-def)] flex-shrink-0 animate-pulse" />
      <div className="flex-1 space-y-1.5 pt-1">
        <div className="h-3 w-2/3 bg-[var(--bd-def)] rounded animate-pulse" />
        <div className="h-2.5 w-1/2 bg-[var(--bd-def)] rounded animate-pulse" />
        <div className="h-2.5 w-4/5 bg-[var(--bd-def)] rounded animate-pulse" />
      </div>
    </div>
  );
}

// ── Message bubbles ────────────────────────────────────────────────────────────

function PdfFileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h6l4.5 4.5v14A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5Z" stroke="currentColor" />
      <path d="M13.5 2v4.5H18" stroke="currentColor" />
    </svg>
  );
}

function MsgBubble({ msg, contactName, contactColor }: {
  msg:          WaMessage;
  contactName:  string;
  contactColor: string;
}) {
  const isOut  = msg.direction === 'outbound';
  const type   = msg.message_type === 'text'     ? 'text'
               : msg.message_type === 'image'    ? 'image'
               : msg.message_type === 'audio'    ? 'audio'
               : 'pdf'; // document, video
  const bars   = type === 'audio' ? waveBars(msg.id) : [];
  const time   = formatTime(msg.meta_timestamp || msg.created_at);

  return (
    <div className={cn('flex gap-2 max-w-[72%]', isOut ? 'self-end flex-row-reverse' : 'self-start')}>
      {/* Avatar */}
      <div
        className="w-[26px] h-[26px] rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold self-end"
        style={{ background: isOut ? '#1C7A54' : contactColor }}
      >
        {isOut ? 'LS' : initials(contactName)}
      </div>

      <div className={cn('flex flex-col gap-[3px]', isOut && 'items-end')}>
        {/* TEXT */}
        {type === 'text' && (
          <div className={cn(
            'px-3 py-[7px] text-[12.5px] leading-relaxed',
            isOut
              ? 'bg-[var(--p500)] text-white rounded-[14px] rounded-br-[4px]'
              : 'bg-[var(--bg-sink)] border border-[var(--bd-def)] text-[var(--tx-1)] rounded-[14px] rounded-bl-[4px]',
          )}>
            {msg.body}
          </div>
        )}

        {/* PDF / DOCUMENT */}
        {type === 'pdf' && (
          <div className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 min-w-[240px]',
            isOut
              ? 'bg-[var(--p500)] rounded-[12px] rounded-br-[4px]'
              : 'bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-[12px] rounded-bl-[4px]',
          )}>
            <div className={cn(
              'w-[34px] h-[34px] rounded-[9px] flex-shrink-0 flex items-center justify-center',
              isOut ? 'bg-white/20' : 'bg-[#FBEAE9]',
            )}>
              <span className={isOut ? 'text-white' : 'text-[#B3302B]'}>
                <PdfFileIcon />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-[12.5px] font-semibold truncate', isOut ? 'text-white' : 'text-[var(--tx-1)]')}>
                {msg.media_filename || 'Document'}
              </p>
              <p className={cn('text-[11px]', isOut ? 'text-white/75' : 'text-[var(--tx-3)]')}>
                {msg.message_type === 'video' ? 'Vidéo' : 'Document'}
              </p>
            </div>
            {msg.media_url && (
              <a
                href={msg.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 transition-colors',
                  isOut ? 'hover:bg-white/15' : 'hover:bg-[var(--bd-def)]',
                )}
              >
                <DownloadSimpleIcon size={13} className={isOut ? 'text-white' : 'text-[var(--tx-3)]'} />
              </a>
            )}
          </div>
        )}

        {/* AUDIO */}
        {type === 'audio' && (
          <div className={cn(
            'flex items-center gap-2 px-2.5 py-[9px] min-w-[210px]',
            isOut
              ? 'bg-[var(--p500)] rounded-[12px] rounded-br-[4px]'
              : 'bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-[12px] rounded-bl-[4px]',
          )}>
            <button className={cn(
              'w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0',
              isOut ? 'bg-white/90' : 'bg-[#6C4CE0]',
            )}>
              <PlayIcon size={9} weight="fill" className={isOut ? 'text-[var(--p500)]' : 'text-white'} />
            </button>
            <div className="flex items-end gap-[2px] h-[22px] flex-1">
              {bars.map((h, i) => (
                <span
                  key={i}
                  className={cn('w-[2.5px] rounded-[2px]', isOut ? 'bg-white/50' : 'bg-[#C3CAC5]')}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <span className={cn('text-[11px] tabular-nums flex-shrink-0', isOut ? 'text-white/75' : 'text-[var(--tx-3)]')}>
              Audio
            </span>
          </div>
        )}

        {/* IMAGE */}
        {type === 'image' && (
          <div className={cn(
            'p-[5px] min-w-[228px]',
            isOut
              ? 'bg-[var(--p500)] rounded-[12px] rounded-br-[4px]'
              : 'bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-[12px] rounded-bl-[4px]',
          )}>
            {msg.media_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={msg.media_url}
                alt={msg.media_filename || 'Image'}
                className="w-full max-h-[200px] object-cover rounded-[8px]"
              />
            ) : (
              <div className="w-full h-[140px] rounded-[8px] bg-gradient-to-br from-[#EEF3EF] to-[#DCE8E0] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="w-7 h-7 stroke-[#9AA39D]">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="10" r="1.6" />
                  <path d="m4 18 5.5-5.5a2 2 0 0 1 2.8 0L18 18" />
                </svg>
              </div>
            )}
            <p className={cn('text-[12.5px] font-semibold truncate px-1 pt-[6px]', isOut ? 'text-white' : 'text-[var(--tx-1)]')}>
              {msg.media_filename || 'Image'}
            </p>
          </div>
        )}

        <span className="text-[10px] text-[var(--tx-3)] tabular-nums px-[3px]">{time}</span>
      </div>
    </div>
  );
}

// ── Thread ─────────────────────────────────────────────────────────────────────

function CrDocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px]">
      <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h6l4.5 4.5v14A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5Z" stroke="currentColor" />
      <path d="M9 12.5h6M9 16h4" stroke="currentColor" />
    </svg>
  );
}

interface ThreadProps {
  conv:            WaConversation;
  messages:        WaMessage[];
  loadingMessages: boolean;
  sending:         boolean;
  sendError:       string | null;
  generatingCr:    boolean;
  crError:         string | null;
  onMarkDone:      () => void;
  onSend:          (text: string, file?: File) => void;
  onGenerateCr:    (extraNoteIds?: string[]) => void;
}

function Thread({ conv, messages, loadingMessages, sending, sendError, generatingCr, crError, onMarkDone, onSend, onGenerateCr }: ThreadProps) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const prevGenerating = useRef(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [draft,      setDraft]      = useState('');
  const [file,       setFile]       = useState<File | null>(null);
  const [crSuccess,  setCrSuccess]  = useState(false);

  const name    = convName(conv);
  const color   = colorFromId(conv.id);
  const both    = hasBothSides(messages);

  // Detect successful CR generation (generatingCr: true → false with no error)
  useEffect(() => {
    if (prevGenerating.current && !generatingCr && !crError) {
      setCrSuccess(true);
      const t = setTimeout(() => setCrSuccess(false), 3500);
      return () => clearTimeout(t);
    }
    prevGenerating.current = generatingCr;
  }, [generatingCr, crError]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => { setMenuOpen(false); setDraft(''); setFile(null); }, [conv.id]);

  function handleSend() {
    if (sending || (!draft.trim() && !file)) return;
    onSend(draft.trim(), file ?? undefined);
    setDraft('');
    setFile(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-[11px] border-b border-[var(--bd-def)] flex-shrink-0 bg-white">
        <div
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
          style={{ background: color }}
        >
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-[var(--tx-1)] leading-tight">{name}</p>
          <p className="text-[11px] text-[var(--tx-3)]">{conv.display_phone_number} · WhatsApp</p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-2">
          {/* Générer CR */}
          <button
            onClick={() => { if (!both || generatingCr || crSuccess) return; onGenerateCr(); }}
            disabled={!both || generatingCr}
            title={!both ? 'Disponible dès que le prospect a répondu.' : undefined}
            className={cn(
              'flex items-center gap-2 px-3 py-[7px] rounded-[9px] text-[12.5px] font-bold transition-all select-none',
              crSuccess
                ? 'bg-[#1B6B45] text-white'
                : both && !generatingCr
                  ? 'bg-[#6C4CE0] text-white hover:bg-[#5B3CC4] active:scale-[0.98]'
                  : 'bg-[var(--bg-sink)] text-[var(--tx-3)] border border-[var(--bd-def)] cursor-default',
            )}
          >
            <span className={cn(
              'w-[20px] h-[20px] rounded-[6px] flex items-center justify-center flex-shrink-0',
              (both && !crSuccess) ? 'bg-white/20' : 'bg-[var(--bd-def)]',
            )}>
              {generatingCr
                ? <svg className="animate-spin w-[11px] h-[11px]" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 1 1-6.4 2.6" stroke="white" strokeWidth="2.3" strokeLinecap="round" /></svg>
                : crSuccess
                  ? <CheckIcon size={11} weight="bold" className="text-white" />
                  : <span className={both ? 'text-white' : 'text-[var(--tx-3)]'}><CrDocIcon /></span>
              }
            </span>
            {generatingCr ? 'Génération…' : crSuccess ? 'CR généré ✓' : 'Générer un CR'}
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 border border-[var(--bd-def)] rounded-[8px] flex items-center justify-center hover:bg-[var(--bg-sink)] transition-colors"
            >
              <DotsThreeVerticalIcon size={16} className="text-[var(--tx-2)]" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-1.5 min-w-[220px] bg-white border border-[var(--bd-def)] rounded-[10px] shadow-xl py-1.5 z-20">
                  <button
                    onClick={() => { onMarkDone(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] font-medium text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
                  >
                    {conv.status === 'closed'
                      ? <><ArrowCounterClockwiseIcon size={15} /> Rouvrir la conversation</>
                      : <><CheckIcon size={15} /> Marquer comme terminé</>
                    }
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] font-medium text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
                  >
                    <EyeSlashIcon size={15} /> Masquer la conversation
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
          {crError && (
            <p className="text-[10.5px] text-error text-right pr-1">{crError}</p>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3 bg-white">
        {loadingMessages ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn('flex gap-2 max-w-[60%]', i % 2 === 0 ? 'self-end flex-row-reverse' : 'self-start')}>
                <div className="w-[26px] h-[26px] rounded-full bg-[var(--bd-def)] flex-shrink-0 animate-pulse" />
                <div className="flex flex-col gap-1">
                  <div className={cn('h-10 rounded-[14px] bg-[var(--bd-def)] animate-pulse', i % 2 === 0 ? 'w-40' : 'w-52')} />
                  <div className="h-2 w-8 bg-[var(--bd-def)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-sink)] flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="w-6 h-6 stroke-[var(--tx-3)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3 3v-3Z" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-[var(--tx-2)]">Aucun message pour l&apos;instant</p>
            <p className="text-[12px] text-[var(--tx-3)] mt-1">Écrivez le premier message à {name.split(' ')[0]}.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[var(--bd-def)]" />
              <span className="text-[11px] font-semibold text-[var(--tx-3)] whitespace-nowrap">Conversation</span>
              <div className="flex-1 h-px bg-[var(--bd-def)]" />
            </div>
            {messages.map(m => (
              <MsgBubble
                key={m.id}
                msg={m}
                contactName={name}
                contactColor={color}
              />
            ))}
            {both && (
              <div className="self-center flex items-center gap-1.5 text-[11px] font-semibold text-[#1B6B45] bg-[#E6F3EC] px-3 py-[5px] rounded-full mt-1">
                <CheckIcon size={12} weight="bold" />
                Conversation engagée des deux côtés · CR disponible
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Composer ── */}
      <div className="px-5 py-3.5 border-t border-[var(--bd-def)] bg-white flex-shrink-0">
        {sendError && (
          <p className="text-[11px] text-error mb-2">{sendError}</p>
        )}
        {file && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[11px] text-[var(--tx-3)] truncate flex-1">{file.name}</span>
            <button onClick={() => setFile(null)} className="w-4 h-4 flex items-center justify-center text-[var(--tx-3)] hover:text-error">
              <XIcon size={11} />
            </button>
          </div>
        )}
        <div className={cn(
          'border rounded-[12px] px-3 py-[9px] bg-[var(--bg-sink)] transition-colors',
          (draft || file) ? 'border-[var(--p500)]' : 'border-[var(--bd-def)]',
        )}>
          <textarea
            rows={1}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Écrire à ${name.split(' ')[0]}… (Ctrl+Entrée pour envoyer)`}
            className="w-full bg-transparent border-none outline-none resize-none text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] leading-relaxed"
          />
          <div className="flex items-center gap-1 mt-[7px]">
            <button className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-[var(--bd-def)] transition-colors">
              <SmileyIcon size={15} className="text-[var(--tx-3)]" />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-[var(--bd-def)] transition-colors"
              title="Joindre un fichier"
            >
              <PaperclipIcon size={15} className="text-[var(--tx-3)]" />
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
            <span className="ml-auto text-[10px] text-[var(--tx-3)] tabular-nums mr-2">
              {draft.length} / 1 000
            </span>
            <button
              onClick={handleSend}
              disabled={sending || (!draft.trim() && !file)}
              className={cn(
                'w-[30px] h-[30px] rounded-[8px] flex items-center justify-center transition-all',
                (draft.trim() || file) && !sending
                  ? 'bg-[var(--p500)] hover:opacity-90'
                  : 'bg-[var(--bd-def)] cursor-default',
              )}
            >
              {sending
                ? <SpinnerGapIcon size={14} className="text-white animate-spin" />
                : <PaperPlaneTiltIcon size={14} className={(draft.trim() || file) ? 'text-white' : 'text-[var(--tx-3)]'} />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Conversation Modal ──────────────────────────────────────────────────────

interface NewConvModalProps {
  starting:  boolean;
  startError: string | null;
  onStart:  (phone: string, text?: string, contactName?: string) => void;
  onClose:  () => void;
}

function NewConvModal({ starting, startError, onStart, onClose }: NewConvModalProps) {
  const [phone,   setPhone]   = useState('');
  const [name,    setName]    = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return;
    onStart(cleaned, message.trim() || undefined, name.trim() || undefined);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/45 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-[460px] bg-white rounded-[14px] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient bar */}
        <div className="h-[3px] flex-shrink-0" style={{ background: 'var(--grad)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bd-def)] flex-shrink-0">
          <div>
            <p className="text-[15px] font-bold text-[var(--tx-1)]">Nouvelle conversation</p>
            <p className="text-[11px] text-[var(--tx-3)] mt-0.5">Démarrer un échange WhatsApp avec un prospect</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-[var(--bd-def)] rounded-[8px] flex items-center justify-center hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
          >
            <XIcon size={14} weight="bold" className="text-[var(--tx-2)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          {/* Phone */}
          <div>
            <label className="block text-[12px] font-semibold text-[var(--tx-2)] mb-1.5">
              Numéro WhatsApp <span className="text-error">*</span>
            </label>
            <div className="flex items-center gap-2 border border-[var(--bd-def)] rounded-[8px] px-3 py-[9px] bg-[var(--bg-sink)] focus-within:border-[var(--p500)] transition-colors">
              <span className="text-[12.5px] text-[var(--tx-3)] font-mono flex-shrink-0">+</span>
              <input
                autoFocus
                type="tel"
                placeholder="22890123456"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-[var(--tx-3)] mt-1">Numéro international sans +, ex: 22890123456</p>
          </div>

          {/* Contact name */}
          <div>
            <label className="block text-[12px] font-semibold text-[var(--tx-2)] mb-1.5">
              Nom du contact <span className="text-[var(--tx-3)] font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              placeholder="Moussa Diallo"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-[var(--bd-def)] rounded-[8px] px-3 py-[9px] bg-[var(--bg-sink)] focus:border-[var(--p500)] focus:outline-none text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] transition-colors"
            />
          </div>

          {/* First message */}
          <div>
            <label className="block text-[12px] font-semibold text-[var(--tx-2)] mb-1.5">
              Premier message <span className="text-[var(--tx-3)] font-normal">(optionnel)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Bonjour, je reviens vers vous suite à…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full border border-[var(--bd-def)] rounded-[8px] px-3 py-[9px] bg-[var(--bg-sink)] focus:border-[var(--p500)] focus:outline-none text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] resize-none transition-colors"
            />
            <p className="text-[10px] text-[var(--tx-3)] mt-1">
              ⚠️ WhatsApp n&apos;autorise les messages libres que si le contact a écrit dans les 24h.
            </p>
          </div>

          {startError && (
            <p className="text-[12px] text-error">{startError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-[9px] border border-[var(--bd-def)] text-[13px] font-medium text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={starting || !phone.trim()}
              className="flex-1 h-10 rounded-[9px] text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: 'var(--grad)' }}
            >
              {starting
                ? <><SpinnerGapIcon size={14} className="animate-spin" /> Démarrage…</>
                : <><PaperPlaneTiltIcon size={14} /> Démarrer la conversation</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyThread() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center p-10">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-sink)] flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.4" className="w-8 h-8 stroke-[var(--tx-3)]">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3 3v-3Z" />
        </svg>
      </div>
      <p className="text-[14px] font-bold text-[var(--tx-2)]">Sélectionnez une conversation</p>
      <p className="text-[12.5px] text-[var(--tx-3)] mt-1.5 max-w-[260px]">
        Choisissez un échange dans la liste ou démarrez une nouvelle conversation.
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MessageriePage() {
  const dispatch = useAppDispatch();

  const conversations   = useAppSelector(s => s.whatsapp.conversations);
  const loading         = useAppSelector(s => s.whatsapp.loading);
  const error           = useAppSelector(s => s.whatsapp.error);
  const activeConvId    = useAppSelector(s => s.whatsapp.activeConvId);
  const messages        = useAppSelector(s => s.whatsapp.messages);
  const loadingMessages = useAppSelector(s => s.whatsapp.loadingMessages);
  const sending         = useAppSelector(s => s.whatsapp.sending);
  const sendError       = useAppSelector(s => s.whatsapp.sendError);
  const starting        = useAppSelector(s => s.whatsapp.starting);
  const startError      = useAppSelector(s => s.whatsapp.startError);
  const generatingCr    = useAppSelector(s => s.whatsapp.generatingCr);
  const crError         = useAppSelector(s => s.whatsapp.crError);

  const [filter,     setFilter]     = useState<'ouverts' | 'non-lus'>('ouverts');
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const [viewedIds,  setViewedIds]  = useState<Set<string>>(new Set());

  useEffect(() => { setMounted(true); }, []);

  // Initial load
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    if (!messages[activeConvId]) {
      dispatch(fetchMessages({ conversationId: activeConvId }));
    }
    setViewedIds(prev => new Set(prev).add(activeConvId));
  }, [activeConvId, dispatch, messages]);

  const unreadCount = conversations.filter(c => !viewedIds.has(c.id) && c.message_count > 0).length;

  const filtered = conversations.filter(c => {
    if (filter === 'non-lus' && (viewedIds.has(c.id) || c.message_count === 0)) return false;
    if (!search) return true;
    const t = search.toLowerCase();
    const n = (c.contact_name || c.display_phone_number).toLowerCase();
    return n.includes(t) || c.display_phone_number.includes(t);
  });

  const activeConv    = conversations.find(c => c.id === activeConvId) ?? null;
  const activeMessages = activeConvId ? (messages[activeConvId] ?? []) : [];

  const handleSelectConv = useCallback((id: string) => {
    dispatch(setActiveConvId(id));
  }, [dispatch]);

  const handleSend = useCallback((text: string, file?: File) => {
    if (!activeConvId) return;
    dispatch(replyToConversation({ conversationId: activeConvId, text: text || undefined, file }));
  }, [activeConvId, dispatch]);

  const handleStart = useCallback((phone: string, text?: string, contactName?: string) => {
    dispatch(startConversation({ phone, text, contactName }))
      .unwrap()
      .then(() => setShowModal(false))
      .catch(() => {/* error shown in modal via startError */});
  }, [dispatch]);

  const handleMarkDone = useCallback(() => {
    // Local optimistic update while waiting for a backend status endpoint
    // TODO: wire to a PATCH /conversations/{id}/status endpoint when available
  }, []);

  const handleGenerateCr = useCallback((extraNoteIds?: string[]) => {
    if (!activeConvId) return;
    dispatch(generateConvCr({ conversationId: activeConvId, extraNoteIds }));
  }, [activeConvId, dispatch]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 flex-shrink-0 border-b border-[var(--bd-def)]">
        <div>
          <h1 className="text-[23px] font-bold text-[var(--tx-1)] tracking-tight leading-tight">Messagerie</h1>
          <p className="text-[12.5px] text-[var(--tx-3)] mt-[3px]">
            Échanges WhatsApp centralisés avec vos prospects et clients
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-[9px] rounded-[10px] text-[13px] font-bold text-white flex-shrink-0 transition-all hover:-translate-y-px active:scale-[0.98]"
          style={{ background: 'var(--grad)' }}
        >
          <PlusIcon size={15} weight="bold" />
          Nouvelle conversation
        </button>
      </div>

      {/* ── Two-panel layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT — conversation list */}
        <div className="w-[312px] flex-shrink-0 border-r border-[var(--bd-def)] flex flex-col min-h-0">
          <div className="px-3 pt-3 pb-2 flex flex-col gap-2.5 flex-shrink-0">
            {/* Search */}
            <div className="flex items-center gap-2 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-[8px] px-2.5 py-[7px]">
              <MagnifyingGlassIcon size={14} className="text-[var(--tx-3)] flex-shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un contact…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="w-[18px] h-[18px] rounded-full flex items-center justify-center hover:bg-[var(--bd-def)]">
                  <XIcon size={10} className="text-[var(--tx-3)]" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 px-0.5">
              {([
                { key: 'ouverts',  label: 'Ouverts' },
                { key: 'non-lus', label: 'Non lus', count: unreadCount },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={cn(
                    'py-1.5 text-[12.5px] font-semibold border-b-2 transition-colors',
                    filter === t.key
                      ? 'text-[var(--tx-1)] border-[var(--p500)]'
                      : 'text-[var(--tx-3)] border-transparent hover:text-[var(--tx-2)]',
                  )}
                >
                  {t.label}
                  {'count' in t && (
                    <span className={cn('ml-1', filter === t.key ? 'text-[var(--p500)]' : 'text-[var(--tx-3)]')}>
                      ({t.count})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-1.5 pb-3">
            {loading && conversations.length === 0 ? (
              <>{[1, 2, 3, 4].map(i => <ConvSkeleton key={i} />)}</>
            ) : error ? (
              <div className="text-center py-10 px-4">
                <p className="text-[13px] font-semibold text-error">Erreur de chargement</p>
                <p className="text-[12px] text-[var(--tx-3)] mt-1">{error}</p>
                <button
                  onClick={() => dispatch(fetchConversations())}
                  className="mt-3 text-[12px] font-semibold text-[var(--p500)] hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-[13px] font-semibold text-[var(--tx-2)]">Aucune conversation</p>
                <p className="text-[12px] text-[var(--tx-3)] mt-1">
                  {search ? 'Essayez un autre filtre ou une autre recherche.' : 'Démarrez votre première conversation.'}
                </p>
              </div>
            ) : filtered.map(c => (
              <ConvItem
                key={c.id}
                conv={c}
                active={c.id === activeConvId}
                unread={!viewedIds.has(c.id) && c.message_count > 0}
                onClick={() => handleSelectConv(c.id)}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — thread */}
        {activeConv ? (
          <Thread
            key={activeConv.id}
            conv={activeConv}
            messages={activeMessages}
            loadingMessages={loadingMessages}
            sending={sending}
            sendError={sendError}
            generatingCr={generatingCr}
            crError={crError}
            onMarkDone={handleMarkDone}
            onSend={handleSend}
            onGenerateCr={handleGenerateCr}
          />
        ) : (
          <EmptyThread />
        )}
      </div>

      {/* New conversation modal */}
      {mounted && showModal && (
        <NewConvModal
          starting={starting}
          startError={startError}
          onStart={handleStart}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
