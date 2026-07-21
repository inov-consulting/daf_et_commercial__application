'use client';

import { useState, useRef, useEffect } from 'react';
import {
  CheckIcon,
  XIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { WaConversation, WaMessage } from '@/redux/features/whatsapp/whatsappSlice';
import { colorFromId, initials, convName, hasBothSides } from '@/lib/utils';
import { MsgBubble } from './MsgBubble';
import { Composer } from './Composer';

// ── CR doc icon ────────────────────────────────────────────────────────────────

function CrDocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px]">
      <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h6l4.5 4.5v14A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5Z" stroke="currentColor" />
      <path d="M9 12.5h6M9 16h4" stroke="currentColor" />
    </svg>
  );
}

// ── Thread ─────────────────────────────────────────────────────────────────────

export interface ThreadProps {
  conv:            WaConversation;
  messages:        WaMessage[];
  loadingMessages: boolean;
  sending:         boolean;
  sendError:       string | null;
  generatingCr:    boolean;
  crError:         string | null;
  onClose:         () => void;
  onSend:          (text: string, file?: File) => void;
  onGenerateCr:    (extraNoteIds?: string[]) => void;
}

export function Thread({
  conv, messages, loadingMessages,
  sending, sendError,
  generatingCr, crError,
  onClose, onSend, onGenerateCr,
}: ThreadProps) {
  const scrollRef      = useRef<HTMLDivElement>(null);
  const prevGenerating = useRef(false);
  const [crSuccess, setCrSuccess] = useState(false);

  const name  = convName(conv);
  const color = colorFromId(conv.id);
  const both  = hasBothSides(messages);

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

        {/* Actions */}
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
                  ? <SpinnerGapIcon size={11} className="animate-spin text-white" />
                  : crSuccess
                    ? <CheckIcon size={11} weight="bold" className="text-white" />
                    : <span className={both ? 'text-white' : 'text-[var(--tx-3)]'}><CrDocIcon /></span>
                }
              </span>
              {generatingCr ? 'Génération…' : crSuccess ? 'CR généré ✓' : 'Générer un CR'}
            </button>

            {/* Fermer la discussion */}
            <button
              onClick={onClose}
              title="Fermer la discussion"
              className="w-8 h-8 border border-[var(--bd-def)] rounded-[8px] flex items-center justify-center hover:bg-[var(--bg-sink)] transition-colors"
            >
              <XIcon size={14} weight="bold" className="text-[var(--tx-2)]" />
            </button>
          </div>
          {crError && (
            <p className="text-[10.5px] text-error text-right pr-1">{crError}</p>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-3 bg-white">
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
              <MsgBubble key={m.id} msg={m} contactName={name} contactColor={color} />
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
      <Composer
        key={conv.id}
        convFirstName={name.split(' ')[0]}
        sending={sending}
        sendError={sendError}
        onSend={onSend}
      />
    </div>
  );
}
