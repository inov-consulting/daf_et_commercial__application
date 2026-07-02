'use client';

import { type Offer, fmtOfferDate, fmtOfferAmount } from '@/types/offer_type';

interface OfferDocumentProps {
  offer: Partial<Offer> & {
    client_name: string;
    origin_location: string;
    destination_location: string;
    unit_price: number;
  };
  preview?: boolean;
}

export function OfferDocument({ offer, preview = false }: OfferDocumentProps) {
  const currency  = offer.currency ?? 'FCFA';
  const tvaRate   = offer.tva_rate ?? 19.25;
  const ht        = offer.amount_untaxed ?? offer.unit_price ?? 0;
  const tva       = offer.amount_tax ?? Math.round(ht * tvaRate) / 100;
  const ttc       = offer.amount_total ?? ht + tva;
  const today     = fmtOfferDate(offer.date_emission ?? new Date().toISOString());
  const expiry    = fmtOfferDate(offer.date_expiry);
  const planned   = fmtOfferDate(offer.date_planned);

  return (
    <div
      className={`bg-white text-[#1a1a1a] font-sans ${preview ? 'text-[11px]' : 'text-[13px]'}`}
      style={{ fontFamily: "'Segoe UI', Arial, sans-serif", lineHeight: 1.6 }}
    >
      {/* ── En-tête ────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between mb-6 pb-4"
        style={{ borderBottom: '3px solid var(--grad, #1E5B3C)' }}
      >
        <div>
          <div className="font-bold text-[#1E5B3C]" style={{ fontSize: preview ? 16 : 22, letterSpacing: -0.5 }}>
            PORTALIS
          </div>
          <div className="text-[#6B7280]" style={{ fontSize: preview ? 9 : 11 }}>
            TMS · Gestion Transport &amp; Logistique
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold uppercase text-[#1E5B3C]" style={{ fontSize: preview ? 11 : 15, letterSpacing: 1 }}>
            Offre commerciale
          </div>
          <div className="text-[#374151] font-mono mt-0.5" style={{ fontSize: preview ? 9 : 11 }}>
            {offer.name ?? '—'}
          </div>
          <div className="text-[#6B7280]" style={{ fontSize: preview ? 8 : 10 }}>
            Émis le {today}
          </div>
        </div>
      </div>

      {/* ── Émetteur / Destinataire ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div
            className="text-[#6B7280] font-semibold uppercase mb-1"
            style={{ fontSize: preview ? 7 : 9, letterSpacing: 1 }}
          >
            De
          </div>
          <div className="font-semibold text-[#111827]">PORTALIS LOGISTICS SN</div>
          <div className="text-[#6B7280]">Dakar, Sénégal</div>
          <div className="text-[#6B7280]">contact@portalis.sn</div>
        </div>
        <div>
          <div
            className="text-[#6B7280] font-semibold uppercase mb-1"
            style={{ fontSize: preview ? 7 : 9, letterSpacing: 1 }}
          >
            À
          </div>
          <div className="font-semibold text-[#111827]">{offer.client_name}</div>
          {offer.commercial_name && (
            <div className="text-[#6B7280]">Att. {offer.commercial_name}</div>
          )}
        </div>
      </div>

      {/* ── Objet ──────────────────────────────────────────────────── */}
      <div
        className="mb-5 py-2 px-3 rounded"
        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
      >
        <span className="font-semibold text-[#374151]">Objet : </span>
        <span className="text-[#111827]">
          Offre de transport — {offer.origin_location} → {offer.destination_location}
          {offer.transport_mode ? ` (${offer.transport_mode})` : ''}
        </span>
      </div>

      {/* ── Présentation ───────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="font-bold text-[#1E5B3C] mb-2 uppercase" style={{ fontSize: preview ? 9 : 11, letterSpacing: 0.5 }}>
          Présentation de la prestation
        </div>
        <p className="text-[#374151] leading-relaxed">
          Suite à votre demande, nous avons le plaisir de vous soumettre notre offre de transport
          pour l&rsquo;acheminement de vos marchandises. Notre équipe dédiée garantit un service
          fiable et sécurisé, dans le respect des délais convenus.
        </p>
        {offer.product_description && (
          <p className="text-[#374151] mt-2 leading-relaxed">
            <strong>Marchandise :</strong> {offer.product_description}
            {offer.quantity ? ` — Quantité : ${offer.quantity} ${offer.quantity_unit ?? 'unités'}` : ''}
          </p>
        )}
      </div>

      {/* ── Détail de la prestation ─────────────────────────────────── */}
      <div className="mb-5">
        <div className="font-bold text-[#1E5B3C] mb-2 uppercase" style={{ fontSize: preview ? 9 : 11, letterSpacing: 0.5 }}>
          Détail de la prestation
        </div>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1E5B3C', color: '#fff' }}>
              {['Désignation', 'Détail'].map(h => (
                <th
                  key={h}
                  className="text-left font-semibold px-3 py-2"
                  style={{ fontSize: preview ? 8 : 11 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Trajet',       `${offer.origin_location} → ${offer.destination_location}`],
              ['Mode',         offer.transport_mode ?? '—'],
              ['Véhicule',     offer.vehicle_type ?? '—'],
              ['Date prévue',  planned],
              ['Délai validité', `${offer.validity_days ?? 30} jours`],
            ].map(([k, v], i) => (
              <tr key={k} style={{ background: i % 2 === 0 ? '#F9FAFB' : '#fff', borderBottom: '1px solid #E5E7EB' }}>
                <td className="px-3 py-2 font-medium text-[#374151]" style={{ fontSize: preview ? 8 : 11 }}>{k}</td>
                <td className="px-3 py-2 text-[#111827]" style={{ fontSize: preview ? 8 : 11 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Tarification ───────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="font-bold text-[#1E5B3C] mb-2 uppercase" style={{ fontSize: preview ? 9 : 11, letterSpacing: 0.5 }}>
          Tarification
        </div>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F3F4F6', borderBottom: '1px solid #D1D5DB' }}>
              {['Désignation', 'Montant'].map(h => (
                <th
                  key={h}
                  className="text-left font-semibold px-3 py-2 text-[#374151]"
                  style={{ fontSize: preview ? 8 : 11 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              <td className="px-3 py-2 text-[#374151]" style={{ fontSize: preview ? 8 : 11 }}>Montant HT</td>
              <td className="px-3 py-2 text-[#111827] font-mono" style={{ fontSize: preview ? 8 : 11 }}>{fmtOfferAmount(ht, currency)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              <td className="px-3 py-2 text-[#374151]" style={{ fontSize: preview ? 8 : 11 }}>TVA ({tvaRate}%)</td>
              <td className="px-3 py-2 text-[#111827] font-mono" style={{ fontSize: preview ? 8 : 11 }}>{fmtOfferAmount(tva, currency)}</td>
            </tr>
            <tr style={{ background: '#1E5B3C', color: '#fff' }}>
              <td className="px-3 py-2 font-bold" style={{ fontSize: preview ? 9 : 12 }}>Total TTC</td>
              <td className="px-3 py-2 font-bold font-mono" style={{ fontSize: preview ? 9 : 12 }}>{fmtOfferAmount(ttc, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Conditions ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <div className="font-bold text-[#1E5B3C] mb-1 uppercase" style={{ fontSize: preview ? 9 : 11, letterSpacing: 0.5 }}>
            Conditions commerciales
          </div>
          <ul className="text-[#374151] list-disc list-inside space-y-0.5" style={{ fontSize: preview ? 8 : 11 }}>
            <li>Offre valable jusqu&apos;au {expiry}</li>
            <li>Soumis aux conditions générales de vente</li>
            <li>Prix en {currency}, taxes comprises</li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-[#1E5B3C] mb-1 uppercase" style={{ fontSize: preview ? 9 : 11, letterSpacing: 0.5 }}>
            Conditions de paiement
          </div>
          <ul className="text-[#374151] list-disc list-inside space-y-0.5" style={{ fontSize: preview ? 8 : 11 }}>
            <li>30% à la commande</li>
            <li>70% à la livraison</li>
            <li>Virement bancaire uniquement</li>
          </ul>
        </div>
      </div>

      {/* ── Mention légale ─────────────────────────────────────────── */}
      <div
        className="mb-5 py-2 px-3 rounded text-[#6B7280]"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: preview ? 7 : 10 }}
      >
        Cette offre est émise à titre indicatif et ne constitue pas un engagement contractuel
        ferme avant signature des deux parties.
      </div>

      {/* ── Signatures ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-8 mt-6">
        <div>
          <div className="font-semibold text-[#374151] mb-8" style={{ fontSize: preview ? 9 : 11 }}>
            Pour PORTALIS LOGISTICS :
          </div>
          <div style={{ borderTop: '1px solid #D1D5DB' }} className="pt-1">
            <div className="text-[#6B7280]" style={{ fontSize: preview ? 7 : 10 }}>Nom &amp; Signature</div>
          </div>
        </div>
        <div>
          <div className="font-semibold text-[#374151] mb-8" style={{ fontSize: preview ? 9 : 11 }}>
            Pour {offer.client_name} :
          </div>
          <div style={{ borderTop: '1px solid #D1D5DB' }} className="pt-1">
            <div className="text-[#6B7280]" style={{ fontSize: preview ? 7 : 10 }}>Bon pour accord — Nom &amp; Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
