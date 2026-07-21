'use client';

import type { ReactNode } from 'react';
import { type Offer, type OfferPricingRow, type TransportOfferDetail, Route, fmtOfferDate, fmtOfferAmount } from '@/types/offer_type';

interface OfferDocumentProps {
  offer: Partial<Offer> & {
    client_name: string;
    route: Route | null;
    unit_price: number;
  };
  detail?: TransportOfferDetail | null;
  preview?: boolean;
}

// ── Inline bold renderer ──────────────────────────────────────────────────────

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : (part || null)
      )}
    </>
  );
}

// ── Section content renderer ──────────────────────────────────────────────────

function SectionContent({ content, preview }: { content: string; preview: boolean }) {
  const fs = preview ? 8 : 11;
  const nodes: ReactNode[] = [];
  const lines = content.split('\n');
  let key = 0;
  const kvBuf: Array<{ label: string; value: string }> = [];

  function flushKv() {
    if (!kvBuf.length) return;
    nodes.push(
      <div key={key++} style={{ marginBottom: 6, border: '1px solid #E5E7EB', borderRadius: 5, overflow: 'hidden' }}>
        {kvBuf.map((kv, i) => {
          const isLast = i === kvBuf.length - 1;
          return (
            <div
              key={i}
              style={{ display: 'flex', gap: 10, padding: '3px 10px', borderBottom: isLast ? 'none' : '1px solid #F3F4F6' }}
            >
              <span style={{ fontSize: fs, color: '#9CA3AF', minWidth: 130, flexShrink: 0 }}>{kv.label}</span>
              <span style={{ fontSize: fs, fontWeight: 600, color: '#111827' }}>
                <InlineBold text={kv.value} />
              </span>
            </div>
          );
        })}
      </div>
    );
    kvBuf.length = 0;
  }

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) { flushKv(); continue; }

    // Bullet item
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushKv();
      const text = line.slice(2).trim();
      nodes.push(
        <div key={key++} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 2 }}>
          <span style={{ color: '#9CA3AF', flexShrink: 0, fontSize: fs - 1, marginTop: 1 }}>•</span>
          <span style={{ fontSize: fs, color: '#374151', lineHeight: 1.6 }}><InlineBold text={text} /></span>
        </div>
      );
      continue;
    }

    // Bold pattern: **label** or **label:** value
    const kv = line.match(/^\*\*([^*]+?)\s*:?\s*\*\*\s*:?\s*(.*)$/);
    if (kv) {
      const label = kv[1].replace(/\s*:$/, '').trim();
      const value = (kv[2] ?? '').trim();
      if (!value) {
        // Standalone bold label → subheading
        flushKv();
        nodes.push(
          <div key={key++} style={{ fontSize: fs, fontWeight: 700, color: '#0E86E8', marginTop: 8, marginBottom: 3 }}>
            {label}
          </div>
        );
      } else {
        kvBuf.push({ label, value });
      }
      continue;
    }

    flushKv();
    nodes.push(
      <p key={key++} style={{ fontSize: fs, color: '#374151', lineHeight: 1.65, margin: '0 0 4px' }}>
        <InlineBold text={line} />
      </p>
    );
  }

  flushKv();
  return <div>{nodes}</div>;
}

// ── Pricing value formatter ───────────────────────────────────────────────────

function fmtPricingValue(row: OfferPricingRow): string {
  const unit = String(row.unit ?? '').trim();
  if (typeof row.value === 'string') return row.value + (unit ? ` ${unit}` : '');
  const n = Number(row.value);
  // Pure currency code (no slash) → fmtOfferAmount
  if (/^(FCFA|XAF|EUR|USD)$/i.test(unit)) return fmtOfferAmount(n, unit);
  const uSuffix = unit ? ` ${unit}` : '';
  return `${n.toLocaleString('fr-FR')}${uSuffix}`;
}

// ── Main component ────────────────────────────────────────────────────────────

export function OfferDocument({ offer, detail, preview = false }: OfferDocumentProps) {
  const currency = offer.currency ?? 'FCFA';
  const tvaRate  = offer.tva_rate ?? 19.25;
  const ht       = offer.amount_untaxed ?? offer.unit_price ?? 0;
  const tva      = offer.amount_tax ?? Math.round(ht * tvaRate) / 100;
  const ttc      = offer.amount_ttc ?? ht + tva;
  const today    = fmtOfferDate(offer.date_emission ?? new Date().toISOString());
  const expiry   = fmtOfferDate(offer.date_expiry);
  const planned  = fmtOfferDate(offer.date_planned);

  const hasSections = !!detail?.sections?.length;
  const hasPricing  = !!detail?.pricing?.length;

  // Split sections: content sections first, then "conditions" sections after pricing
  let mainSections = detail?.sections ?? [];
  let condSections: typeof mainSections = [];
  if (hasSections) {
    const condIdx = detail!.sections.findIndex(s => /condition|paiement/i.test(s.heading));
    if (condIdx >= 0) {
      mainSections = detail!.sections.slice(0, condIdx);
      condSections = detail!.sections.slice(condIdx);
    }
  }

  const isTtcRow = (label: string) => /ttc|montant\s*ttc|total\s*ttc/i.test(label);

  const hdStyle = {
    fontWeight: 700,
    color: '#20435f',
    marginBottom: preview ? 4 : 6,
    textTransform: 'uppercase' as const,
    fontSize: preview ? 8 : 11,
    letterSpacing: 0.5,
  };

  return (
    <div
      className={`bg-white text-[#1a1a1a] font-sans ${preview ? 'text-[11px]' : 'text-[13px]'}`}
      style={{ fontFamily: "'Segoe UI', Arial, sans-serif", lineHeight: 1.6 }}
    >
      {/* ── En-tête ────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between mb-6 pb-4"
        style={{ borderBottom: '3px solid #0E86E8' }}
      >
        <div>
          <div className="font-bold text-primary" style={{ fontSize: preview ? 16 : 22, letterSpacing: -0.5 }}>
            INOV CONSULTING
          </div>
          <div className="text-[#6B7280]" style={{ fontSize: preview ? 9 : 11 }}>
            TMS · Gestion Transport &amp; Logistique
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold uppercase text-primary" style={{ fontSize: preview ? 11 : 15, letterSpacing: 1 }}>
            Offre commerciale
          </div>
          <div className="text-[#374151] font-mono mt-0.5" style={{ fontSize: preview ? 9 : 11 }}>
            {offer.name ?? '-'}
          </div>
          <div className="text-[#6B7280]" style={{ fontSize: preview ? 8 : 10 }}>
            Émis le {today}
          </div>
        </div>
      </div>

      {/* ── Émetteur / Destinataire ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-[#6B7280] font-semibold uppercase mb-1" style={{ fontSize: preview ? 7 : 9, letterSpacing: 1 }}>
            De
          </div>
          <div className="font-semibold text-[#111827]">INOV CONSULTING LOGISTICS</div>
          <div className="text-[#6B7280]">Dakar, Sénégal</div>
          <div className="text-[#6B7280]">contact@portalis.sn</div>
        </div>
        <div>
          <div className="text-[#6B7280] font-semibold uppercase mb-1" style={{ fontSize: preview ? 7 : 9, letterSpacing: 1 }}>
            À
          </div>
          <div className="font-semibold text-[#111827]">{offer.client_name}</div>
          {offer.commercial_name && (
            <div className="text-[#6B7280]">Att. {offer.commercial_name}</div>
          )}
        </div>
      </div>

      {/* ── Objet ──────────────────────────────────────────────────── */}
      <div className="mb-5 py-2 px-3 rounded" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <span className="font-semibold text-[#374151]">Objet : </span>
        <span className="text-[#111827]">
          Offre de transport - {offer.route?.origin} → {offer.route?.destination}
          {offer.transport_mode ? ` (${offer.transport_mode})` : ''}
        </span>
      </div>

      {/* ── Sections API (avant conditions) ────────────────────────── */}
      {hasSections && mainSections.map(s => (
        <div key={s.heading} className="mb-5">
          <div style={hdStyle}>{s.heading}</div>
          <SectionContent content={s.content} preview={preview} />
        </div>
      ))}

      {/* ── Fallback hardcodé (sans sections API) ──────────────────── */}
      {!hasSections && (
        <>
          <div className="mb-5">
            <div style={hdStyle}>Présentation de la prestation</div>
            <p className="text-[#374151] leading-relaxed" style={{ fontSize: preview ? 8 : 11 }}>
              Suite à votre demande, nous avons le plaisir de vous soumettre notre offre de transport
              pour l&rsquo;acheminement de vos marchandises. Notre équipe dédiée garantit un service
              fiable et sécurisé, dans le respect des délais convenus.
            </p>
            {offer.product_description && (
              <p className="text-[#374151] mt-2 leading-relaxed" style={{ fontSize: preview ? 8 : 11 }}>
                <strong>Marchandise :</strong> {offer.product_description}
                {offer.quantity ? ` - Quantité : ${offer.quantity} ${offer.quantity_unit ?? 'unités'}` : ''}
              </p>
            )}
          </div>

          <div className="mb-5">
            <div style={hdStyle}>Détail de la prestation</div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0E86E8', color: '#fff' }}>
                  {['Désignation', 'Détail'].map(h => (
                    <th key={h} className="text-left font-semibold px-3 py-2" style={{ fontSize: preview ? 8 : 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Trajet',         `${offer.route?.origin} → ${offer.route?.destination}`],
                  ['Mode',           offer.transport_mode ?? '-'],
                  ['Véhicule',       offer.vehicle_type ?? '-'],
                  ['Date prévue',    planned],
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
        </>
      )}

      {/* ── Tarification ───────────────────────────────────────────── */}
      <div className="mb-5">
        <div style={hdStyle}>Tarification</div>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F3F4F6', borderBottom: '1px solid #D1D5DB' }}>
              {['Désignation', 'Montant'].map(h => (
                <th key={h} className="text-left font-semibold px-3 py-2 text-[#374151]" style={{ fontSize: preview ? 8 : 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasPricing ? (
              detail!.pricing.map((row, i) => {
                const ttc = isTtcRow(String(row.label));
                return (
                  <tr
                    key={i}
                    style={{
                      background: ttc ? '#0E86E8' : i % 2 === 0 ? '#F9FAFB' : '#fff',
                      borderBottom: ttc ? 'none' : '1px solid #E5E7EB',
                      color: ttc ? '#fff' : undefined,
                    }}
                  >
                    <td className="px-3 py-2" style={{ fontSize: ttc ? (preview ? 9 : 12) : (preview ? 8 : 11), fontWeight: ttc ? 700 : undefined }}>
                      {String(row.label)}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ fontSize: ttc ? (preview ? 9 : 12) : (preview ? 8 : 11), fontWeight: ttc ? 700 : undefined }}>
                      {fmtPricingValue(row)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td className="px-3 py-2 text-[#374151]" style={{ fontSize: preview ? 8 : 11 }}>Montant HT</td>
                  <td className="px-3 py-2 text-[#111827] font-mono" style={{ fontSize: preview ? 8 : 11 }}>{fmtOfferAmount(ht, currency)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td className="px-3 py-2 text-[#374151]" style={{ fontSize: preview ? 8 : 11 }}>TVA ({tvaRate}%)</td>
                  <td className="px-3 py-2 text-[#111827] font-mono" style={{ fontSize: preview ? 8 : 11 }}>{fmtOfferAmount(tva, currency)}</td>
                </tr>
                <tr style={{ background: '#0E86E8', color: '#fff' }}>
                  <td className="px-3 py-2 font-bold" style={{ fontSize: preview ? 9 : 12 }}>Total TTC</td>
                  <td className="px-3 py-2 font-bold font-mono" style={{ fontSize: preview ? 9 : 12 }}>{fmtOfferAmount(ttc, currency)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Sections API (conditions) ───────────────────────────────── */}
      {hasSections && condSections.map(s => (
        <div key={s.heading} className="mb-5">
          <div style={hdStyle}>{s.heading}</div>
          <SectionContent content={s.content} preview={preview} />
        </div>
      ))}

      {/* ── Fallback conditions hardcodées ──────────────────────────── */}
      {!hasSections && (
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <div style={hdStyle}>Conditions commerciales</div>
            <ul className="text-[#374151] list-disc list-inside space-y-0.5" style={{ fontSize: preview ? 8 : 11 }}>
              <li>Offre valable jusqu&apos;au {expiry}</li>
              <li>Soumis aux conditions générales de vente</li>
              <li>Prix en {currency}, taxes comprises</li>
            </ul>
          </div>
          <div>
            <div style={hdStyle}>Conditions de paiement</div>
            <ul className="text-[#374151] list-disc list-inside space-y-0.5" style={{ fontSize: preview ? 8 : 11 }}>
              <li>30% à la commande</li>
              <li>70% à la livraison</li>
              <li>Virement bancaire uniquement</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Mention légale / footer ─────────────────────────────────── */}
      <div
        className="mb-5 py-2 px-3 rounded text-[#6B7280]"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: preview ? 7 : 10 }}
      >
        {detail?.footer
          ?? "Cette offre est émise à titre indicatif et ne constitue pas un engagement contractuel ferme avant signature des deux parties."}
      </div>

      {/* ── Signatures ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-8 mt-6">
        <div>
          <div className="font-semibold text-[#374151] mb-8" style={{ fontSize: preview ? 9 : 11 }}>
            Pour INOV CONSULTING LOGISTICS :
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
            <div className="text-[#6B7280]" style={{ fontSize: preview ? 7 : 10 }}>Bon pour accord - Nom &amp; Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
