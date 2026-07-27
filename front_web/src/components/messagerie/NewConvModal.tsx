'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, PaperPlaneTiltIcon, SpinnerGapIcon } from '@phosphor-icons/react';

interface NewConvModalProps {
  starting:   boolean;
  startError: string | null;
  onStart:    (phone: string, text?: string, contactName?: string) => void;
  onClose:    () => void;
}

export function NewConvModal({ starting, startError, onStart, onClose }: NewConvModalProps) {
  const [phone,      setPhone]      = useState('');
  const [name,       setName]       = useState('');
  const [message,    setMessage]    = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return;
    if (cleaned.length < 7 || cleaned.length > 15) {
      setPhoneError('Numéro invalide — saisir entre 7 et 15 chiffres (ex: 22890123456)');
      return;
    }
    setPhoneError(null);
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
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneError(null); }}
                className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] font-mono"
                required
              />
            </div>
            {phoneError
              ? <p className="text-[11px] text-error mt-1">{phoneError}</p>
              : <p className="text-[11px] text-[var(--tx-3)] mt-1">Numéro international sans +, ex: 22890123456</p>
            }
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
