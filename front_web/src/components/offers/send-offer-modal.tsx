'use client';

import { useState } from 'react';
import { XIcon, WhatsappLogoIcon, EnvelopeSimpleIcon, PaperPlaneRightIcon } from '@phosphor-icons/react';
import type { Offer } from '@/types/offer_type';

interface SendOfferModalProps {
  offer: Offer;
  onClose: () => void;
  onSend: (channel: 'whatsapp' | 'email', recipient: string) => Promise<void>;
}

export function SendOfferModal({ offer, onClose, onSend }: SendOfferModalProps) {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [recipient, setRecipient] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!recipient.trim() || !agreed) return;
    setSending(true);
    setError(null);
    try {
      await onSend(channel, recipient.trim());
      onClose();
    } catch {
      setError("Une erreur est survenue lors de l'envoi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        style={{ border: '1px solid var(--bd-def)' }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--bd-def)' }}>
          <div>
            <div className="font-semibold text-[14px]" style={{ color: 'var(--tx-1)' }}>
              Envoyer l&rsquo;offre
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--tx-2)' }}>
              {offer.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-sink)]"
          >
            <XIcon size={16} weight="bold" style={{ color: 'var(--tx-2)' }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* channel selector */}
          <div>
            <div className="text-[11px] font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--tx-2)' }}>
              Canal d&rsquo;envoi
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'whatsapp', Icon: WhatsappLogoIcon, label: 'WhatsApp', color: '#22C55E', bg: '#F0FDF4' },
                { key: 'email', Icon: EnvelopeSimpleIcon, label: 'Email', color: '#3B82F6', bg: '#EFF6FF' },
              ] as const).map(({ key, Icon, label, color, bg }) => (
                <button
                  key={key}
                  onClick={() => setChannel(key)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all border-2"
                  style={{
                    borderColor: channel === key ? color : 'var(--bd-def)',
                    background: channel === key ? bg : 'transparent',
                  }}
                >
                  <Icon size={20} style={{ color }} />
                  <span
                    className="font-semibold text-[13px]"
                    style={{ color: channel === key ? color : 'var(--tx-1)' }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* recipient */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--tx-2)' }}>
              {channel === 'whatsapp' ? 'Numéro WhatsApp' : 'Adresse email'}
            </label>
            <input
              type={channel === 'email' ? 'email' : 'tel'}
              placeholder={channel === 'whatsapp' ? '+221 77 000 00 00' : 'contact@client.com'}
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all"
              style={{
                border: '1.5px solid var(--bd-def)',
                background: 'var(--bg-sink)',
                color: 'var(--tx-1)',
              }}
            />
          </div>

          {/* consent */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 accent-[var(--grad)]"
            />
            <span className="text-[12px]" style={{ color: 'var(--tx-2)' }}>
              Je confirme avoir vérifié le contenu de l&rsquo;offre avant de l&rsquo;envoyer au client.
            </span>
          </label>

          {error && (
            <div
              className="px-3 py-2.5 rounded-lg text-[12px]"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
            >
              {error}
            </div>
          )}
        </div>

        {/* footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4"
          style={{ borderTop: '1px solid var(--bd-def)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-[var(--bg-sink)]"
            style={{ color: 'var(--tx-2)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={!recipient.trim() || !agreed || sending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--grad)' }}
          >
            <PaperPlaneRightIcon size={15} weight="bold" />
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
