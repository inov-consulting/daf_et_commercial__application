'use client';

import { cn } from '@/lib/utils';
import type { WaConversation, WaMessage } from '@/redux/features/whatsapp/whatsappSlice';
import { colorFromId, initials, formatTime, convName } from '@/lib/utils';

// ── WhatsApp badge ─────────────────────────────────────────────────────────────

export function WhatsAppBadge() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 w-[15px] h-[15px] rounded-full bg-white flex items-center justify-center p-[2px]">
      <svg viewBox="0 0 24 24" fill="#25D366" className="w-full h-full">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z" />
      </svg>
    </span>
  );
}

// ── Delivery status icons (mini) ───────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === 'sending') return (
    <svg viewBox="0 0 12 12" fill="none" className="w-[9px] h-[9px] flex-shrink-0 opacity-40">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 4" />
    </svg>
  );
  if (status === 'sent') return (
    <svg viewBox="0 0 12 12" fill="none" className="w-[9px] h-[9px] flex-shrink-0 text-[var(--tx-3)]">
      <path d="M2 6.5 5 9.5 10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (status === 'delivered' || status === 'read') return (
    <svg viewBox="0 0 16 12" fill="none" className="w-[13px] h-[9px] flex-shrink-0">
      <path d="M1 6.5 4 9.5 9 3.5"  stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 6.5 8 9.5 13 3.5" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return null;
}

// ── Conversation list item ─────────────────────────────────────────────────────

interface ConvItemProps {
  conv:     WaConversation;
  active:   boolean;
  unread:   boolean;
  lastMsg?: WaMessage;
  onClick:  () => void;
}

export function ConvItem({ conv, active, unread, lastMsg, onClick }: ConvItemProps) {
  const name  = convName(conv);
  const color = colorFromId(conv.id);
  const done  = conv.status === 'closed';

  // Préférer le message Redux (temps réel) ; fallback sur les champs enrichis de la conv
  const direction = lastMsg?.direction        ?? conv.last_message_direction;
  const msgType   = lastMsg?.message_type     ?? conv.last_message_type;
  const msgBody   = lastMsg?.body             ?? conv.last_message_body;
  const msgStatus = lastMsg?.delivery_status  ?? conv.last_message_delivery_status ?? '';

  const isOut  = direction === 'outbound';
  const status = msgStatus;

  const preview = (direction != null)
    ? msgType === 'audio'    ? 'Note vocale'
    : msgType === 'image'    ? 'Photo'
    : msgType === 'video'    ? 'Vidéo'
    : msgType === 'document' ? 'Document'
    : (msgBody || '…')
    : null;

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
          <span className="text-[13px] font-semibold text-[var(--tx-1)] truncate">
            {name || conv.display_phone_number}
          </span>
          <span className="text-[11px] text-[var(--tx-3)] flex-shrink-0 tabular-nums">
            {formatTime(conv.last_message_at)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-[4px] min-w-0">
            {isOut && <StatusIcon status={status} />}
            <p className={cn(
              'text-[12px] truncate',
              unread ? 'font-semibold text-[var(--tx-1)]' : 'text-[var(--tx-3)]',
            )}>
              {preview ?? (conv.message_count > 0
                ? `${conv.message_count} message${conv.message_count > 1 ? 's' : ''}`
                : 'Aucun message')}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {unread && <span className="w-[7px] h-[7px] rounded-full bg-[var(--p500)]" />}
            {done && !unread && (
              <span className="text-[10px] font-bold text-[var(--p500)] bg-[#E6F3EC] px-1.5 py-[2px] rounded-full whitespace-nowrap">
                Terminé
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

export function ConvSkeleton() {
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
