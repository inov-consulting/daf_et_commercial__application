'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SignOutIcon, XIcon, WarningIcon } from '@phosphor-icons/react';

interface Props {
  onConfirm: () => void;
  onCancel:  () => void;
}

export function LogoutConfirmModal({ onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        className="fixed z-[301] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Gradient bar */}
        <div className="h-[3px]" style={{ background: 'var(--grad)' }} />

        {/* Content */}
        <div className="px-6 pt-5 pb-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
                <WarningIcon size={18} weight="fill" className="text-error" />
              </div>
              <div>
                <p id="logout-title" className="text-[15px] font-semibold text-[var(--tx-1)]">
                  Se déconnecter ?
                </p>
                <p className="text-[12px] text-[var(--tx-3)] mt-0.5">
                  Votre session sera fermée.
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0 mt-0.5"
              aria-label="Annuler"
            >
              <XIcon size={14} weight="bold" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={onCancel}
              className="flex-1 h-9 rounded-lg border border-[var(--bd-def)] text-[13px] font-medium text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-9 rounded-lg bg-error text-white text-[13px] font-medium flex items-center justify-center gap-1.5 hover:bg-error/90 transition-colors"
            >
              <SignOutIcon size={14} weight="bold" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
