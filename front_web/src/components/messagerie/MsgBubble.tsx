'use client';

import { DownloadSimpleIcon, PlayIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { WaMessage } from '@/redux/features/whatsapp/whatsappSlice';
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
  msg:          WaMessage;
  contactName:  string;
  contactColor: string;
}

export function MsgBubble({ msg, contactName, contactColor }: MsgBubbleProps) {
  const isOut = msg.direction === 'outbound';
  const type  = msg.message_type === 'text'  ? 'text'
              : msg.message_type === 'image' ? 'image'
              : msg.message_type === 'audio' ? 'audio'
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
            {msg.body}
          </div>
        )}

        {/* PDF / DOC */}
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
              <PdfFileIcon className={cn('w-4 h-4', isOut ? 'text-white' : 'text-[#B3302B]')} />
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
            {msg.body && (
              <p className={cn('text-[12px] px-1 pt-[6px] pb-[2px]', isOut ? 'text-white/90' : 'text-[var(--tx-2)]')}>
                {msg.body}
              </p>
            )}
          </div>
        )}

        <span className="text-[10px] text-[var(--tx-3)] tabular-nums px-[3px]">{time}</span>
      </div>
    </div>
  );
}
