'use client';

import { useState } from 'react';
import { X, PaperPlaneTilt, Sparkle } from '@phosphor-icons/react';

const INITIAL_MESSAGES = [
  {
    id: 1,
    time: '09h14',
  },
];

export default function FloatingChat() {
  const [open, setOpen] = useState(false);

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
            <X size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {INITIAL_MESSAGES.map(msg => (
            <div key={msg.id} className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--grad)' }}
              >
                <span className="text-white text-xs leading-none">✦</span>
              </div>
              <div className="flex-1">
                <div className="bg-[var(--bg-sink)] rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-sm text-[var(--tx-1)] leading-relaxed">
                    Bonjour Hawa ! J&apos;ai <strong>3 éléments</strong> en attente de
                    validation. Voulez-vous que je vous résume les priorités du jour ?
                  </p>
                </div>
                <p className="text-[10px] text-[var(--tx-3)] mt-1 ml-1">{msg.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-[var(--bd-def)] flex-shrink-0">
          <div className="flex items-center gap-2 bg-[var(--bg-sink)] rounded-xl px-4 py-2.5 border border-transparent focus-within:border-[var(--bd-focus)] focus-within:bg-white transition-colors">
            <input
              type="text"
              placeholder="Posez une question à l'IA..."
              className="flex-1 bg-transparent text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] outline-none"
            />
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:-translate-y-px"
              style={{ background: 'var(--grad)' }}
            >
              <PaperPlaneTilt size={13} weight="fill" className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(v => !v)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-xl flex items-center justify-center z-[61] transition-all duration-200 hover:-translate-y-1"
          style={{
            background: 'var(--grad)',
            boxShadow: open
              ? '0 8px 24px rgba(27,107,69,.5)'
              : '0 4px 16px rgba(27,107,69,.35)',
          }}
        >
          <Sparkle size={20} weight="fill" className="text-white" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-white leading-none">
            3
          </span>
        </button>
      )}
    </>
  );
}
