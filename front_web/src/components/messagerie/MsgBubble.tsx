'use client';

import { DownloadSimpleIcon, PlayIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { WaMessage } from '@/redux/features/whatsapp/whatsappSlice';
import type { MediaViewerItem } from './MediaViewer';
import { initials, formatTime, waveBars } from '@/lib/utils';

// ── File/doc icon ──────────────────────────────────────────────────────────────

function PdfFileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h6l4.5 4.5v14A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5Z" stroke="currentColor" />
      <path d="M13.5 2v4.5H18" stroke="currentColor" />
    </svg>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────

interface MsgBubbleProps {
  msg:            WaMessage;
  contactName:    string;
  contactColor:   string;
  transcription?: string;
  transcribing?:  boolean;
  onTranscribe?:  (messageId: string, mediaUrl: string) => void;
  onMediaClick?:  (item: MediaViewerItem) => void;
}

export function MsgBubble({ msg, contactName, contactColor, transcription, transcribing, onTranscribe, onMediaClick }: MsgBubbleProps) {
  const isOut = msg.direction === 'outbound';
  const type  = msg.message_type === 'text'  ? 'text'
              : msg.message_type === 'image' ? 'image'
              : msg.message_type === 'audio' ? 'audio'
              : msg.message_type === 'reaction' ? 'reaction'
              : 'pdf';
  const bars  = type === 'audio' ? waveBars(msg.id) : [];
  const time  = formatTime(msg.meta_timestamp || msg.created_at);

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
            {msg.body ?? ''}
          </div>
        )}

        {/* REACTION */}
        {type === 'reaction' && (
          <div className="text-[22px] leading-none px-1 py-0.5 select-none" title="Réaction">
            {msg.reaction_emoji ?? '👍'}
          </div>
        )}

        {/* PDF / DOC / VIDEO */}
        {type === 'pdf' && (
          <button
            onClick={() => msg.media_url && onMediaClick?.({
              url:      msg.media_url,
              type:     msg.message_type === 'video' ? 'video' : 'document',
              filename: msg.media_filename ?? undefined,
            })}
            disabled={!msg.media_url}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 min-w-[240px] text-left w-full transition-opacity',
              !msg.media_url && 'opacity-60 cursor-default',
              isOut
                ? 'bg-[var(--p500)] rounded-[12px] rounded-br-[4px] hover:opacity-90'
                : 'bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-[12px] rounded-bl-[4px] hover:bg-[var(--bd-def)]/50',
            )}
          >
            <div className={cn(
              'w-[34px] h-[34px] rounded-[9px] flex-shrink-0 flex items-center justify-center',
              isOut ? 'bg-white/20' : 'bg-[#FBEAE9]',
            )}>
              {msg.message_type === 'video'
                ? <PlayIcon size={14} weight="fill" className={isOut ? 'text-white' : 'text-[#B3302B]'} />
                : <PdfFileIcon className={cn('w-4 h-4', isOut ? 'text-white' : 'text-[#B3302B]')} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-[12.5px] font-semibold truncate', isOut ? 'text-white' : 'text-[var(--tx-1)]')}>
                {msg.media_filename || (msg.message_type === 'video' ? 'Vidéo' : 'Document')}
              </p>
              <p className={cn('text-[11px]', isOut ? 'text-white/75' : 'text-[var(--tx-3)]')}>
                {msg.message_type === 'video' ? 'Appuyer pour lire' : 'Appuyer pour ouvrir'}
              </p>
            </div>
            <DownloadSimpleIcon size={13} className={cn('flex-shrink-0', isOut ? 'text-white/60' : 'text-[var(--tx-3)]')} />
          </button>
        )}

        {/* AUDIO */}
        {type === 'audio' && (
          <div className={cn(
            'flex flex-col gap-0 min-w-[210px] overflow-hidden',
            isOut
              ? 'bg-[var(--p500)] rounded-[12px] rounded-br-[4px]'
              : 'bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-[12px] rounded-bl-[4px]',
          )}>
            {/* Player row */}
            <div className="flex items-center gap-2 px-2.5 py-[9px]">
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

            {/* Transcription — texte déjà disponible (body ou redux) */}
            {(msg.body || transcription) && (
              <div className="px-2.5 pb-[9px] flex flex-col gap-[3px]">
                <div className={cn(
                  'flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wide',
                  isOut ? 'text-white/50' : 'text-[var(--tx-3)]',
                )}>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-[9px] h-[9px] flex-shrink-0">
                    <path d="M3 3h10v1.5H3zM3 6h7v1.5H3zM3 9h10v1.5H3zM3 12h5v1.5H3z" />
                  </svg>
                  Transcription
                </div>
                <p className={cn(
                  'text-[12px] leading-relaxed italic',
                  isOut ? 'text-white/90' : 'text-[var(--tx-2)]',
                )}>
                  {transcription ?? msg.body ?? ''}
                </p>
              </div>
            )}

            {/* Bouton Transcrire — uniquement si pas encore de texte */}
            {!msg.body && !transcription && msg.media_url && onTranscribe && (
              <div className="px-2.5 pb-[9px]">
                <button
                  onClick={() => onTranscribe(msg.id, msg.media_url!)}
                  disabled={transcribing}
                  className={cn(
                    'flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-[5px] rounded-[7px] transition-colors',
                    isOut
                      ? 'bg-white/15 hover:bg-white/25 text-white disabled:opacity-50'
                      : 'bg-[var(--bd-def)] hover:bg-[#E0DBF5] text-[#6C4CE0] disabled:opacity-50',
                  )}
                >
                  {transcribing
                    ? <><SpinnerGapIcon size={11} className="animate-spin" /> Transcription…</>
                    : <>
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-[10px] h-[10px] flex-shrink-0">
                          <path d="M3 3h10v1.5H3zM3 6h7v1.5H3zM3 9h10v1.5H3zM3 12h5v1.5H3z" />
                        </svg>
                        Transcrire
                      </>
                  }
                </button>
              </div>
            )}
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
              <button
                onClick={() => onMediaClick?.({ url: msg.media_url!, type: 'image', filename: msg.media_filename ?? undefined })}
                className="w-full block relative group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={msg.media_url}
                  alt={msg.media_filename || 'Image'}
                  className="w-full max-h-[200px] object-cover rounded-[8px]"
                />
                <div className="absolute inset-0 rounded-[8px] bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </button>
            ) : (
              <div className="w-full h-[140px] rounded-[8px] bg-gradient-to-br from-[#EEF3EF] to-[#DCE8E0] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="w-7 h-7 stroke-[#9AA39D]">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="10" r="1.6" />
                  <path d="m4 18 5.5-5.5a2 2 0 0 1 2.8 0L18 18" />
                </svg>
              </div>
            )}
            {msg.body && (
              <p className={cn('text-[12px] px-1 pt-[6px] pb-[2px]', isOut ? 'text-white/90' : 'text-[var(--tx-2)]')}>
                {msg.body}
              </p>
            )}
          </div>
        )}

        <span className="flex items-center gap-[3px] text-[10px] text-[var(--tx-3)] tabular-nums px-[3px]">
          {time}
          {isOut && (
            <>
              {msg.delivery_status === 'sending' && (
                <SpinnerGapIcon size={10} className="animate-spin opacity-50" />
              )}
              {msg.delivery_status === 'sent' && (
                <svg viewBox="0 0 12 12" fill="none" className="w-[10px] h-[10px] text-[var(--tx-3)]">
                  <path d="M2 6.5 5 9.5 10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {(msg.delivery_status === 'delivered' || msg.delivery_status === 'read') && (
                <svg viewBox="0 0 16 12" fill="none" className="w-[14px] h-[10px]">
                  <path d="M1 6.5 4 9.5 9 3.5" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 6.5 8 9.5 13 3.5" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
