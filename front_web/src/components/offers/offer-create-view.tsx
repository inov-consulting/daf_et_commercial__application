'use client';

import { useState } from 'react';
import {
  DownloadSimpleIcon, CopyIcon, PaperPlaneTiltIcon, MagicWandIcon,
  LightbulbIcon, MapPinIcon, ArrowRightIcon, CurrencyCircleDollarIcon,
  UserCircleIcon, PrinterIcon, ArrowsOutIcon, ArrowsInIcon,
  WarningCircleIcon, InfoIcon, ArrowsClockwiseIcon,
  CaretRightIcon, FileTextIcon, ArrowLeftIcon
} from '@phosphor-icons/react';
import type { Offer, CreateOfferBody } from '@/types/offer_type';
import { computeOfferStatus, fmtOfferAmount } from '@/types/offer_type';
import { OfferAgentChat, type OfferFromChat } from './offer-agent-chat';
import { Button } from '../ui';

// ── Types ──────────────────────────────────────────────────────────────────────

interface OfferCreateViewProps {
  editingOffer?: Offer | null;
  recentOffers?: Offer[];
  onBack: () => void;
  onSave: (body: CreateOfferBody) => Promise<Offer>;
  onGenerate?: (id: string) => Promise<Offer>;
  onSend?: (offer: Offer) => void;
  onViewRecent?: (offer: Offer) => void;
  onDuplicate?: (offer: Offer) => void;
  /** Appelé après génération IA — remplace la bascule vers le formulaire */
  onOfferCreated?: (offerId: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TVA_RATE = 0.1925;

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

function fmtDateFr(iso: string) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const ACCENT_COLORS = ['#1E5B3C', '#92720C', '#059669', '#D97706'];

const STAT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  brouillon: { bg: '#FBF3DE', color: '#725A0A', label: 'Brouillon'  },
  genere:    { bg: '#EEF7F1', color: '#184A31', label: 'Généré'     },
  envoyee:   { bg: '#FFFBEB', color: '#D97706', label: 'Envoyée'    },
  signee:    { bg: '#ECFDF5', color: '#059669', label: 'Signée ✓'   },
  refusee:   { bg: '#FEF2F2', color: '#DC2626', label: 'Refusée'    },
  expiree:   { bg: '#F3F4F6', color: '#6B7280', label: 'Expirée'    },
};

function inputSt(value: string | number, withIcon = true): React.CSSProperties {
  const filled = value !== '' && value !== 0 && value !== '0';
  return {
    width: '100%', height: 40,
    border: `1px solid ${filled ? '#B7DCC3' : '#DDE5EF'}`,
    borderRadius: 8,
    padding: withIcon ? '0 12px 0 34px' : '0 12px',
    fontSize: 13, fontFamily: 'inherit', color: '#1B2633',
    background: filled ? '#EEF7F1' : '#FFFFFF',
    outline: 'none',
  };
}

const CHEVRON_DATA = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239EB0C4' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`;

const selectSt: React.CSSProperties = {
  width: '100%', height: 40,
  border: '1px solid #DDE5EF', borderRadius: 8,
  padding: '0 32px 0 12px',
  fontSize: 13, fontFamily: 'inherit', color: '#1B2633',
  background: `#fff ${CHEVRON_DATA} no-repeat right 12px center`,
  outline: 'none', cursor: 'pointer', appearance: 'none',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#435869' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={selectSt}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#1E5B3C', whiteSpace: 'nowrap' as const }}>
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: '#EEF2F7' }} />
      </div>
      {children}
    </div>
  );
}

// ── Offer document preview ─────────────────────────────────────────────────────

interface DocPreviewProps {
  client: string; origine: string; destination: string;
  produit: string; quantite: number; unite: string;
  mode: string; vehicule: string;
  ht: number; tva: number; ttc: number; pu: number;
  dateDepart: string; validite: number;
  generated: boolean;
  genPresentation: string; genDetail: string;
  offerRef: string;
}

function OfferDocPreview({
  client, origine, destination, produit, quantite, unite,
  mode, vehicule, ht, tva, ttc, pu, dateDepart, validite,
  generated, genPresentation, offerRef,
}: DocPreviewProps) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ fontSize: 13, color: '#1B2633', lineHeight: 1.5 }}>

      {/* Letterhead */}
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #EEF2F7' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#1E5B3C', textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 6 }}>
          PortaLis Group Holding
        </div>
        <div style={{ width: 60, height: 2, background: '#1E5B3C', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1B2633', letterSpacing: -0.5, marginBottom: 4 }}>
          Proposition Commerciale
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9EB0C4' }}>
          {offerRef ? `Réf : ${offerRef}` : 'Réf : –'} · {today}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #EEF2F7' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#9EB0C4', marginBottom: 6 }}>Émetteur</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2633', marginBottom: 2 }}>PortaLis Sénégal</div>
          <div style={{ fontSize: 11, color: '#7691A8', lineHeight: 1.5 }}>
            BP 5421, Zone Portuaire<br />Dakar, Sénégal<br />commercial@portalis-sn.com<br />+221 33 820 XX XX
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#9EB0C4', marginBottom: 6 }}>Destinataire</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2633', marginBottom: 2 }}>{client || 'Client'}</div>
          <div style={{ fontSize: 11, color: '#7691A8' }}>Client non lié à un partenaire Odoo</div>
        </div>
      </div>

      {/* Objet */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1B2633', background: '#F7F9FC', border: '1px solid #DDE5EF', borderRadius: 8, padding: '8px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FileTextIcon size={14} style={{ color: '#1E5B3C', flexShrink: 0 }} />
        <span><strong>Objet :</strong>&nbsp;Transport de {produit || 'marchandises'} – {origine || '–'} → {destination || '–'} ({quantite} {unite} · {vehicule})</span>
      </div>

      {/* Section: Présentation */}
      <DocSection title="Présentation de la prestation">
        {generated && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, background: '#92720C', color: '#fff', padding: '2px 8px', borderRadius: 99, marginBottom: 6, letterSpacing: '0.03em' }}>
            ✦ GÉNÉRÉ PAR IA · {today}
          </div>
        )}
        <p style={{ fontSize: 12, color: '#435869', lineHeight: 1.65 }}>
          {generated && genPresentation
            ? genPresentation
            : `INOV Consulting a le plaisir de vous proposer une solution de transport ${mode.toLowerCase()} adaptée à vos besoins logistiques. Cette offre porte sur le transport de ${produit.toLowerCase() || 'marchandises'} à destination de ${destination || '–'}, en utilisant une flotte de véhicules ${vehicule.toLowerCase()}.`
          }
        </p>
      </DocSection>

      {/* Section: Détail */}
      <DocSection title="Détail de la prestation">
        <div style={{ fontSize: 12, color: '#435869', lineHeight: 1.65 }}>
          <strong>Itinéraire :</strong> {origine || '–'} → {destination || '–'}<br /><br />
          <strong>Nature du produit :</strong> {produit || '–'}<br /><br />
          <strong>Quantité :</strong> {quantite} {unite}<br /><br />
          <strong>Type de véhicule :</strong> {vehicule}<br /><br />
          <strong>Mode de transport :</strong> {mode}<br /><br />
          <strong>Date de transport prévue :</strong> {dateDepart || '–'}
          {generated && (<><br /><br />
            <strong>Services inclus :</strong><br />
            — Chargement et calage de la marchandise<br />
            — Transport sécurisé sur itinéraire {origine}-{destination}<br />
            — Déchargement à destination<br />
            — Suivi de la prestation<br />
            — Assurance marchandise standard
          </>)}
        </div>
      </DocSection>

      {/* Section: Tarification */}
      <DocSection title="Tarification">
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 11 }}>
          <tbody>
            {[
              ['Produit transporté', produit || '–'],
              ['Quantité', `${quantite} ${unite}`],
              ['Prix unitaire', pu > 0 ? `${fmt(pu)} FCFA/${unite.replace(/s$/, '')}` : '–'],
              ['Montant HT', ht > 0 ? `${fmt(ht)} FCFA` : '–'],
              ['TVA (19,25%)', tva > 0 ? `${fmt(tva)} FCFA` : '–'],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #F0F4F8' }}>
                <td style={{ padding: '7px 10px', color: '#435869' }}>{k}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#2E3D4C' }}>{v}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#F7F9FC', borderTop: '2px solid #DDE5EF' }}>
              <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12 }}>Montant TTC</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#059669' }}>
                {ttc > 0 ? `${fmt(ttc)} FCFA` : '–'}
              </td>
            </tr>
          </tfoot>
        </table>
      </DocSection>

      {/* Section: Conditions commerciales */}
      <DocSection title="Conditions commerciales">
        <div style={{ fontSize: 12, color: '#435869', lineHeight: 1.65 }}>
          <strong>Validité de l&apos;offre :</strong> Cette offre est valable {validite} jours à compter de sa date d&apos;émission.<br /><br />
          <strong>Disponibilité :</strong> Sous réserve de disponibilité des véhicules à la date prévue.<br /><br />
          <strong>Responsabilités :</strong> INOV Consulting assure le transport dans le respect des normes de sécurité en vigueur. Le client reste responsable de la déclaration exacte de la nature et du poids de la marchandise.<br /><br />
          <strong>Délai de transport :</strong> Le délai estimé pour cette prestation est de 2 à 3 jours ouvrables.<br /><br />
          <strong>Couverture géographique :</strong> Transport assuré sur l&apos;axe {origine || '–'}-{destination || '–'} avec accès routier standard.
        </div>
      </DocSection>

      {/* Section: Conditions de paiement */}
      <DocSection title="Conditions de paiement">
        <div style={{ fontSize: 12, color: '#435869', lineHeight: 1.65 }}>
          <strong>Modalité :</strong> Paiement à la livraison<br /><br />
          <strong>Acceptation :</strong> Le paiement doit intervenir lors de la réception de la marchandise à destination, après vérification de son intégrité et conformité.<br /><br />
          <strong>Moyens de paiement :</strong> Virement bancaire, chèque ou espèces (à convenir).<br /><br />
          <strong>Facturation :</strong> Une facture sera établie à titre définitif et remise au client lors de la livraison.
        </div>
      </DocSection>

      {/* Footer légal */}
      <div style={{ fontSize: 11, color: '#7691A8', lineHeight: 1.6, background: '#F7F9FC', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
        Cette offre est établie sous réserve de disponibilité et est valable {validite} jours à compter de sa date d&apos;émission. Pour toute question ou demande de modification, nous restons à votre disposition. INOV Consulting se réserve le droit de réviser les tarifs en cas de modification des conditions de transport.
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16, paddingTop: 14, borderTop: '1px solid #EEF2F7' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#9EB0C4', marginBottom: 8 }}>Pour PortaLis Group Holding</div>
          <div style={{ height: 1, background: '#DDE5EF', marginTop: 24, marginBottom: 4 }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1B2633' }}>Moussa Diallo</div>
          <div style={{ fontSize: 11, color: '#7691A8' }}>Commercial Terrain · Sénégal</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#9EB0C4', marginBottom: 8 }}>Pour {client || 'le Client'}</div>
          <div style={{ height: 1, background: '#DDE5EF', marginTop: 24, marginBottom: 4 }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1B2633' }}>Représentant du client</div>
          <div style={{ fontSize: 11, color: '#7691A8' }}>–</div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OfferCreateView({
  editingOffer, recentOffers = [],
  onBack, onSave, onGenerate, onSend, onViewRecent, onDuplicate, onOfferCreated,
}: OfferCreateViewProps) {

  // Form state — matches prototype fields exactly
  const [client,      setClient]      = useState(editingOffer?.client_name ?? '');
  const [origine,     setOrigine]     = useState(editingOffer?.origin_location?.split(',')[0]?.trim() ?? '');
  const [destination, setDestination] = useState(editingOffer?.destination_location?.split(',')[0]?.trim() ?? '');
  const [produit,     setProduit]     = useState(editingOffer?.product_description ?? '');
  const [quantite,    setQuantite]    = useState<number>(editingOffer?.quantity ?? 20);
  const [unite,       setUnite]       = useState(editingOffer?.quantity_unit ?? 'tonnes');
  const [mode,        setMode]        = useState(editingOffer?.transport_mode ?? 'Terrestre');
  const [vehicule,    setVehicule]    = useState(editingOffer?.vehicle_type ?? 'Benne');
  const [prixStr,     setPrixStr]     = useState(editingOffer?.unit_price ? String(editingOffer.unit_price) : '');
  const [dateDepart,  setDateDepart]  = useState(editingOffer?.date_planned ?? '');
  const [validite,    setValidite]    = useState(String(editingOffer?.validity_days ?? 7));

  // App state
  const [generating,        setGenerating]        = useState(false);
  const [generated,         setGenerated]         = useState(!!editingOffer?.ai_generated);
  const [savedOffer,        setSavedOffer]        = useState<Offer | null>(editingOffer ?? null);
  const [fullscreen,        setFullscreen]        = useState(false);
  const [genPresentation,   setGenPresentation]   = useState('');
  const [genDetail,         setGenDetail]         = useState('');
  // Phase chat → formulaire (chat uniquement pour les nouvelles offres)
  const [createPhase,       setCreatePhase]       = useState<'chat' | 'form'>(editingOffer ? 'form' : 'chat');
  const [generationSuccess, setGenerationSuccess] = useState(false);

  // Computed pricing
  const pu  = parseFloat(prixStr.replace(/\s/g, '')) || 0;
  const ht  = quantite * pu;
  const tva = ht * TVA_RATE;
  const ttc = ht + tva;

  const departFmt = dateDepart ? fmtDateFr(dateDepart) : '–';
  const validiteJours = parseInt(validite) || 7;
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  async function handleGenerate() {
    if (generating) return;
    let offer = savedOffer;
    if (!offer) {
      try {
        offer = await onSave({
          client_name: client, origin_location: origine,
          destination_location: destination, transport_mode: mode,
          vehicle_type: vehicule, product_description: produit,
          quantity: quantite, quantity_unit: unite,
          unit_price: pu, validity_days: validiteJours,
          date_planned: dateDepart || undefined,
        });
        setSavedOffer(offer);
      } catch { return; }
    }
    setGenerating(true);
    try {
      if (onGenerate && offer) {
        const result = await onGenerate(offer.id);
        setSavedOffer(result);
      }
      setGenPresentation(
        `INOV Consulting a le plaisir de vous proposer une solution de transport ${mode.toLowerCase()} adaptée à vos besoins logistiques. Cette offre porte sur le transport de ${produit.toLowerCase() || 'marchandises'} à destination de ${destination}, en utilisant une flotte de véhicules ${vehicule.toLowerCase()}, garantissant la sécurité et la qualité de votre marchandise tout au long du trajet. Nous nous engageons à respecter les délais convenus et à assurer une prise en charge professionnelle de votre chargement.`
      );
      setGenDetail(`${origine} → ${destination}`);
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  }

  async function handleOfferGenerated({ offerId, data }: OfferFromChat) {
    // Pré-remplissage des champs depuis les données générées
    setClient(data.client.name || '');
    setOrigine(data.route.origin || '');
    setDestination(data.route.destination || '');
    setMode(data.route.transport_mode || 'Terrestre');
    setVehicule(data.route.vehicle_type || 'Benne');
    setDateDepart(data.route.planned_date || '');
    setValidite(String(data.validity_days || 7));

    // Extraction du prix depuis pricing[]
    if (data.pricing.length > 0) {
      const p = data.pricing[0];
      const px = p['unit_price'] ?? p['price_per_unit'] ?? p['amount'] ?? p['price'];
      if (typeof px === 'number' && px > 0) setPrixStr(String(px));
    }

    // Texte de présentation depuis sections[]
    if (data.sections.length > 0) {
      const s = data.sections[0];
      const c = s['content'] ?? s['text'] ?? s['body'];
      if (typeof c === 'string') setGenPresentation(c);
    }
    setGenDetail(`${data.route.origin} → ${data.route.destination}`);
    setGenerated(true);

    // Objet Offer synthétique pour activer les actions (Envoyer, Dupliquer…)
    setSavedOffer({
      id: offerId,
      name: data.reference || `OFF-${Date.now()}`,
      ai_generated: true,
      client_name: data.client.name,
      partner_id: 0,
      origin_location: data.route.origin,
      destination_location: data.route.destination,
      transport_mode: data.route.transport_mode,
      vehicle_type: data.route.vehicle_type,
      product_description: '',
      quantity: 1,
      quantity_unit: 'unité',
      unit_price: 0,
      amount_untaxed: 0,
      amount_tax: 0,
      amount_total: 0,
      tva_rate: 0,
      validity_days: data.validity_days,
      date_planned: data.route.planned_date,
      date_emission: data.date,
      date_expiry: '',
      currency: 'XOF',
      state: 'genere',
      created_at: new Date().toISOString(),
      sent_at: undefined,
      signed_at: undefined,
      refused_at: undefined,
      updated_at: undefined,
      odoo_linked: false,
      commercial_name: undefined,
      activity: 'transport',
    } as Offer);

    // Transition élégante : succès → détail de l'offre (ou formulaire en fallback)
    setGenerationSuccess(true);
    await new Promise(r => setTimeout(r, 900));
    if (onOfferCreated) {
      onOfferCreated(offerId);
    } else {
      setCreatePhase('form');
      setGenerationSuccess(false);
    }
  }

  const offerRef    = savedOffer?.name ?? '';
  const offerStatus = savedOffer ? computeOfferStatus(savedOffer) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 32px 64px', minHeight: '100%'}}>

      {/* ── Page header (56px) ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5" style={{ minHeight: 56 }}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="md" onClick={onBack}><ArrowLeftIcon size={13} /></Button>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B2633', letterSpacing: -0.5, lineHeight: 1.15 }}>
              Nouvelle offre
            </h1>
            {offerRef && (
              <span style={{ fontSize: 22, fontWeight: 400, color: '#9EB0C4' }}>/ {offerRef}</span>
            )}
            {offerStatus && (
              <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, background: '#EEF7F1', border: '1px solid #B7DCC3', color: '#184A31', padding: '4px 12px', borderRadius: 99 }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#1E5B3C', display: 'inline-block' }} />
                Généré
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button style={{ height: 34, padding: '0 14px', border: '1px solid #DDE5EF', borderRadius: 8, background: '#fff', color: '#435869', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 2px rgba(18,58,38,.06)' }}>
            <DownloadSimpleIcon size={14} /> Exporter PDF
          </button>
          <button
            onClick={() => savedOffer && onDuplicate?.(savedOffer)}
            style={{ height: 34, padding: '0 14px', border: '1px solid #DDE5EF', borderRadius: 8, background: '#fff', color: '#435869', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 2px rgba(18,58,38,.06)' }}
          >
            <CopyIcon size={14} /> Dupliquer
          </button>
          <button
            onClick={() => savedOffer && onSend?.(savedOffer)}
            style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 8, background: '#1E5B3C', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(18,58,38,.08)' }}
          >
            <PaperPlaneTiltIcon size={13} weight="fill" /> Envoyer
          </button>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="flex gap-4 mb-7" style={{ alignItems: 'flex-start' }}>

        {/* ── Brief panel (520px fixed) — chat IA ou formulaire ─────────── */}
        {!fullscreen && createPhase === 'chat' && (
          <OfferAgentChat
            onOfferGenerated={handleOfferGenerated}
            onCancel={() => setCreatePhase('form')}
          />
        )}
        {!fullscreen && createPhase === 'form' && (
          <div style={{ width: '500px', background: '#FFFFFF', border: '1px solid #DDE5EF', borderRadius: 14, boxShadow: '0 2px 8px rgba(18,58,38,.08)', overflow: 'hidden' }}>

            {/* Panel header */}
            <div className="flex items-center gap-2 px-5" style={{ height: 48, background: '#F7F9FC', borderBottom: '1px solid #DDE5EF' }}>
              {/* R-FM-02 : avatar IA = carré, jamais cercle */}
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: 5, background: '#92720C', color: '#fff' }}>
                <FileTextIcon size={12} weight="fill" />
              </div>
              <span className="flex-1" style={{ fontSize: 12, fontWeight: 600, color: '#725A0A' }}>
                Agent Offres · IA
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#725A0A', background: '#FBF3DE', border: '1px solid #F3E2B0', borderRadius: 8, padding: '2px 7px' }}>
                ≤10s
              </span>
            </div>

            {/* Panel body */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Client */}
              <FormField label="Client">
                <div className="relative">
                  <UserCircleIcon size={16} weight="fill" className="absolute pointer-events-none" style={{ left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9EB0C4' }} />
                  <input type="text" value={client} onChange={e => setClient(e.target.value)} placeholder="Nom ou société" style={inputSt(client)} />
                </div>
                <div className="flex items-center gap-1" style={{ fontSize: 11, color: '#9EB0C4', marginTop: 3 }}>
                  <InfoIcon size={11} weight="fill" style={{ color: '#9EB0C4' }} />
                  Client non lié à un partenaire Odoo
                </div>
              </FormField>

              {/* Trajet */}
              <FormField label="Trajet">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MapPinIcon size={15} weight="fill" className="absolute pointer-events-none" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1E5B3C' }} />
                    <input type="text" value={origine} onChange={e => setOrigine(e.target.value)} placeholder="Origine" style={inputSt(origine)} />
                  </div>
                  <ArrowRightIcon size={14} style={{ color: '#9EB0C4', flexShrink: 0 }} />
                  <div className="relative flex-1">
                    <MapPinIcon size={15} weight="fill" className="absolute pointer-events-none" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#92720C' }} />
                    <input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Destination" style={inputSt(destination)} />
                  </div>
                </div>
              </FormField>

              {/* Marchandise */}
              <FormField label="Marchandise">
                <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  <input type="text"   value={produit}          onChange={e => setProduit(e.target.value)}          placeholder="Produit transporté" style={inputSt(produit, false)} />
                  <input type="number" value={quantite}         onChange={e => setQuantite(Number(e.target.value))} placeholder="Quantité"           style={inputSt(quantite, false)} />
                  <input type="text"   value={unite}            onChange={e => setUnite(e.target.value)}            placeholder="Unité"               style={inputSt(unite, false)} />
                </div>
              </FormField>

              {/* Mode & Véhicule */}
              <FormField label="Mode & Véhicule">
                <div className="grid grid-cols-2 gap-2">
                  <Sel value={mode}    onChange={setMode}    options={['Terrestre', 'Maritime', 'Aérien', 'Routier', 'Multimodal']} />
                  <Sel value={vehicule} onChange={setVehicule} options={['Benne', 'Plateau', 'Fourgon', 'Citerne', 'Conteneur', 'Semi-remorque', 'Frigorifique']} />
                </div>
              </FormField>

              {/* Prix unitaire */}
              <FormField label="Prix unitaire (FCFA / tonne)">
                <div className="relative">
                  <CurrencyCircleDollarIcon size={16} className="absolute pointer-events-none" style={{ left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9EB0C4' }} />
                  <input type="text" value={prixStr} onChange={e => setPrixStr(e.target.value)} placeholder="Montant" style={inputSt(prixStr)} />
                </div>
                <div className="flex items-center gap-1" style={{ fontSize: 11, color: '#9EB0C4', marginTop: 3 }}>
                  <InfoIcon size={11} weight="fill" style={{ color: '#9EB0C4' }} />
                  TVA appliquée : 19,25% · calcul HT / TVA / TTC automatique
                </div>
              </FormField>

              {/* Date de transport */}
              <FormField label="Date de transport prévue">
                <input type="date" value={dateDepart} onChange={e => setDateDepart(e.target.value)} style={inputSt(dateDepart, false)} />
              </FormField>

              {/* Validité */}
              <FormField label="Validité de l'offre">
                <Sel value={validite} onChange={setValidite} options={['30 jours', '15 jours', '7 jours', '60 jours']} />
              </FormField>

            </div>

            {/* Panel footer — context + generate */}
            <div style={{ padding: '0 20px 20px' }}>
              <div className="flex items-start gap-2" style={{ background: '#FBF3DE', border: '1px solid #F3E2B0', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                <LightbulbIcon size={14} weight="fill" style={{ color: '#725A0A', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 11, color: '#725A0A', lineHeight: 1.5 }}>
                  <strong>Contexte IA activé</strong> — L&apos;agent construit l&apos;offre à partir du trajet, du produit, de la quantité et du prix unitaire renseignés ci-dessus (calcul HT/TVA/TTC automatique).
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2"
                style={{
                  height: 44, border: 'none', borderRadius: 10,
                  background: '#1E5B3C', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
                  opacity: generating ? 0.5 : 1,
                  boxShadow: '0 2px 12px rgba(18,58,38,.22)',
                  transition: 'background .15s, box-shadow .15s, transform .15s',
                }}
              >
                {generating
                  ? <><ArrowsClockwiseIcon size={18} className="animate-spin" /> Génération en cours…</>
                  : <><MagicWandIcon size={18} weight="fill" /> {generated ? 'Régénérer' : "Générer avec l'IA"}</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Preview panel (flex:1) ─────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 580, background: '#FFFFFF', border: '1px solid #DDE5EF', borderRadius: 14, boxShadow: '0 2px 8px rgba(18,58,38,.08)', overflow: 'hidden', position: 'relative' }}>

          {/* Preview header */}
          <div className="flex items-center gap-2.5 px-5" style={{ height: 48, background: '#F7F9FC', borderBottom: '1px solid #DDE5EF' }}>
            <span className="flex-1" style={{ fontSize: 14, fontWeight: 600, color: '#435869' }}>Prévisualisation</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setFullscreen(v => !v)} style={{ height: 30, padding: '0 12px', border: '1px solid #DDE5EF', borderRadius: 7, background: '#fff', color: '#435869', fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {fullscreen ? <ArrowsInIcon size={12} /> : <ArrowsOutIcon size={12} />}
                {fullscreen ? 'Réduire' : 'Plein écran'}
              </button>
              <button onClick={() => savedOffer && onSend?.(savedOffer)} style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 7, background: '#1E5B3C', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(18,58,38,.08)' }}>
                <PaperPlaneTiltIcon size={12} weight="fill" /> Envoyer
              </button>
            </div>
          </div>

          {/* Loading overlay */}
          {generating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: '#FFFFFF', zIndex: 10 }}>
              <div className="animate-spin flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: '#92720C', boxShadow: '0 4px 16px rgba(146,114,12,.3)', color: '#fff', fontSize: 18 }}>✦</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#725A0A' }}>Agent Offres génère votre proposition…</div>
              <div style={{ fontSize: 12, color: '#9EB0C4' }}>IA · Estimation : 8s</div>
              <div style={{ width: 240 }}>
                {[80, 60, 90, 50].map((w, i) => (
                  <div key={i} className="animate-pulse rounded mb-2" style={{ height: 10, width: `${w}%`, background: '#DDE5EF' }} />
                ))}
              </div>
            </div>
          )}

          {/* Document — ou état d'attente pendant le chat IA */}
          <div className="overflow-y-auto" style={{ padding: 24, maxHeight: 'calc(100vh - 220px)' }}>
            {createPhase === 'chat' && !generationSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 32px', opacity: 0.72 }}>
                <div style={{ width: 52, height: 52, borderRadius: 13, background: '#FBF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#92720C' }}>✦</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#725A0A', textAlign: 'center' }}>En attente de l&apos;agent IA…</div>
                <div style={{ fontSize: 12, color: '#9EB0C4', textAlign: 'center', maxWidth: 260, lineHeight: 1.65 }}>
                  L&apos;aperçu de votre offre apparaîtra ici dès que l&apos;agent aura collecté toutes les informations et généré le document.
                </div>
              </div>
            ) : generationSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 32px' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: '#EEF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontSize: 28 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E5B3C' }}>Document généré avec succès !</div>
                <div style={{ fontSize: 12, color: '#9EB0C4' }}>Pré-remplissage du formulaire…</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {[80, 60, 90, 50].map((w, i) => (
                    <div key={i} className="animate-pulse rounded" style={{ height: 8, width: w, background: '#DDE5EF' }} />
                  ))}
                </div>
              </div>
            ) : (
              <OfferDocPreview
                client={client} origine={origine} destination={destination}
                produit={produit} quantite={quantite} unite={unite}
                mode={mode} vehicule={vehicule}
                ht={ht} tva={tva} ttc={ttc} pu={pu}
                dateDepart={departFmt} validite={validiteJours}
                generated={generated}
                genPresentation={genPresentation} genDetail={genDetail}
                offerRef={offerRef}
              />
            )}
          </div>

          {/* Preview footer */}
          <div className="flex items-center gap-2 px-5" style={{ height: 44, borderTop: '1px solid #DDE5EF', background: '#FAFBFD' }}>
            <div className="flex items-center gap-1.5 flex-1" style={{ fontSize: 11, color: '#9EB0C4' }}>
              <WarningCircleIcon size={14} weight="fill" style={{ color: '#F59E0B' }} />
              Généré par IA – réviser avant envoi au client
            </div>
            <button style={{ height: 30, padding: '0 12px', border: '1px solid #DDE5EF', borderRadius: 7, background: '#fff', color: '#435869', fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <PrinterIcon size={12} /> Aperçu
            </button>
          </div>
        </div>

      </div>{/* /two-col */}

      {/* ── Offres récentes ───────────────────────────────────────────────── */}
      {recentOffers.length > 0 && (
        <div style={{ width: '100%' }}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1B2633' }}>Offres récentes</div>
            <button onClick={onBack} style={{ height: 30, padding: '0 12px', border: '1px solid #DDE5EF', borderRadius: 8, background: '#fff', color: '#435869', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              Voir toutes →
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {recentOffers.slice(0, 4).map((offer, i) => {
              const status = computeOfferStatus(offer);
              const stat   = STAT_COLORS[status] ?? STAT_COLORS.brouillon;
              const accent = ACCENT_COLORS[i % 4];
              return (
                <div
                  key={offer.id}
                  onClick={() => onViewRecent?.(offer)}
                  className="relative overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
                  style={{ background: '#FFFFFF', border: '1px solid #DDE5EF', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px rgba(18,58,38,.06)' }}
                >
                  <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: accent }} />
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#184A31', background: '#EEF7F1', padding: '2px 7px', borderRadius: 4, display: 'inline-block', marginBottom: 6 }}>
                    {offer.name}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1B2633', marginBottom: 2 }}>{offer.client_name}</div>
                  <div style={{ fontSize: 11, color: '#7691A8', marginBottom: 10 }}>
                    {offer.origin_location.split(',')[0]} → {offer.destination_location.split(',')[0]}
                    {offer.transport_mode ? ` · ${offer.transport_mode}` : ''}
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1B2633' }}>
                      {fmtOfferAmount(offer.amount_total, offer.currency)}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: stat.bg, color: stat.color }}>
                      {stat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
