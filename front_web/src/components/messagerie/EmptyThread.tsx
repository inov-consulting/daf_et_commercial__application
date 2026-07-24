'use client';

export function EmptyThread() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center p-10 bg-[var(--bg-surf)]">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-white border border-[var(--bd-def)] shadow-sm flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.3" className="w-10 h-10">
            <path
              strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3 3v-3Z"
              stroke="url(#grad-chat)"
            />
            <defs>
              <linearGradient id="grad-chat" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6C4CE0" />
                <stop offset="1" stopColor="#1C7A54" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {/* WhatsApp dot */}
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z" />
          </svg>
        </div>
      </div>

      <p className="text-[15px] font-bold text-[var(--tx-1)] mb-1.5">
        Messagerie WhatsApp
      </p>
      <p className="text-[13px] text-[var(--tx-3)] max-w-[280px] leading-relaxed">
        Sélectionnez une conversation dans la liste, ou démarrez un nouvel échange avec un prospect.
      </p>

      {/* Keyboard hint */}
      <div className="mt-6 flex items-center gap-2 text-[11px] text-[var(--tx-3)]">
        <kbd className="px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-sink)] border border-[var(--bd-def)] text-[10px] font-mono">
          Ctrl
        </kbd>
        <span>+</span>
        <kbd className="px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-sink)] border border-[var(--bd-def)] text-[10px] font-mono">
          Entrée
        </kbd>
        <span>pour envoyer un message</span>
      </div>
    </div>
  );
}
