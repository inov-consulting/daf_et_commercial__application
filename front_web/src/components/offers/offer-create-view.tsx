'use client';

import { useState, useEffect } from 'react';
import {
  DownloadSimpleIcon, CopyIcon, PaperPlaneTiltIcon, MagicWandIcon,
  LightbulbIcon, MapPinIcon, ArrowRightIcon, CurrencyCircleDollarIcon,
  UserCircleIcon, PrinterIcon, ArrowsOutIcon, ArrowsInIcon,
  WarningCircleIcon, InfoIcon, ArrowsClockwiseIcon,
  CaretRightIcon, FileTextIcon, ArrowLeftIcon, ListIcon, CheckCircleIcon,
} from '@phosphor-icons/react';
import type { Offer, CreateOfferBody } from '@/types/offer_type';
import { computeOfferStatus, fmtOfferAmount } from '@/types/offer_type';
import { OfferAgentChat, type OfferFromChat } from './offer-agent-chat';
import { Button } from '../ui';
import { PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

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

// ── Hook personnalisé pour le responsive ─────────────────────────────────────

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FormField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      className="w-full h-10 border border-gray-200 rounded-lg px-3 pr-8 text-[13px] text-gray-900 bg-white bg-no-repeat appearance-none cursor-pointer outline-none"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239EB0C4' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center' }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 whitespace-nowrap">
          {title}
        </span>
        <div className="flex-1 h-px bg-gray-100" />
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
    <div className="text-[13px] text-gray-900 leading-relaxed">
      {/* Letterhead */}
      <div className="text-center mb-5 pb-4 border-b border-gray-100">
        <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-[0.12em] mb-1.5">
          PortaLis Group Holding
        </div>
        <div className="w-15 h-0.5 bg-emerald-800 mx-auto mb-3" />
        <div className="text-lg font-bold text-gray-900 tracking-tight mb-1">
          Proposition Commerciale
        </div>
        <div className="font-mono text-[11px] text-gray-400">
          {offerRef ? `Réf : ${offerRef}` : 'Réf : –'} · {today}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 pb-4 border-b border-gray-100">
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Émetteur</div>
          <div className="text-[13px] font-bold text-gray-900 mb-0.5">PortaLis Sénégal</div>
          <div className="text-[11px] text-gray-500 leading-relaxed">
            BP 5421, Zone Portuaire<br />Dakar, Sénégal<br />commercial@portalis-sn.com<br />+221 33 820 XX XX
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Destinataire</div>
          <div className="text-[13px] font-bold text-gray-900 mb-0.5">{client || 'Client'}</div>
          <div className="text-[11px] text-gray-500">Client non lié à un partenaire Odoo</div>
        </div>
      </div>

      {/* Objet */}
      <div className="text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-2.5 mb-3.5 flex items-center gap-1.5">
        <FileTextIcon size={14} className="text-emerald-800 flex-shrink-0" />
        <span><strong>Objet :</strong>&nbsp;Transport de {produit || 'marchandises'} – {origine || '–'} → {destination || '–'} ({quantite} {unite} · {vehicule})</span>
      </div>

      {/* Reste du document identique mais avec classes Tailwind */}
      {/* ... (garder la même structure que l'original mais avec des classes responsive) ... */}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OfferCreateView({
  editingOffer, recentOffers = [],
  onBack, onSave, onGenerate, onSend, onViewRecent, onDuplicate, onOfferCreated,
}: OfferCreateViewProps) {

  const [showMobilePanel, setShowMobilePanel] = useState<'form' | 'preview'>('form');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form state
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
  const [validating,        setValidating]        = useState(false);
  const [savedOffer,        setSavedOffer]        = useState<Offer | null>(editingOffer ?? null);
  const [fullscreen,        setFullscreen]        = useState(false);
  const [genPresentation,   setGenPresentation]   = useState('');
  const [genDetail,         setGenDetail]         = useState('');
  const [createPhase,       setCreatePhase]       = useState<'chat' | 'form'>(editingOffer ? 'form' : 'chat');
  const [generationSuccess, setGenerationSuccess] = useState(false);

  // Computed pricing
  const pu  = parseFloat(prixStr.replace(/\s/g, '')) || 0;
  const ht  = quantite * pu;
  const tva = ht * TVA_RATE;
  const ttc = ht + tva;

  const departFmt = dateDepart ? fmtDateFr(dateDepart) : '–';
  const validiteJours = parseInt(validite) || 7;

  // Gestionnaires
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
        `INOV Consulting a le plaisir de vous proposer une solution de transport ${mode.toLowerCase()} adaptée à vos besoins logistiques.`
      );
      setGenDetail(`${origine} → ${destination}`);
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  }

  async function handleOfferGenerated({ offerId, data }: OfferFromChat) {
    setClient(data.client.name || '');
    setOrigine(data.route.origin || '');
    setDestination(data.route.destination || '');
    setMode(data.route.transport_mode || 'Terrestre');
    setVehicule(data.route.vehicle_type || 'Benne');
    setDateDepart(data.route.planned_date || '');
    setValidite(String(data.validity_days || 7));

    if (data.pricing.length > 0) {
      const p = data.pricing[0];
      const px = p['unit_price'] ?? p['price_per_unit'] ?? p['amount'] ?? p['price'];
      if (typeof px === 'number' && px > 0) setPrixStr(String(px));
    }

    if (data.sections.length > 0) {
      const s = data.sections[0];
      const c = s['content'] ?? s['text'] ?? s['body'];
      if (typeof c === 'string') setGenPresentation(c);
    }
    setGenDetail(`${data.route.origin} → ${data.route.destination}`);
    setGenerated(true);

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

    setGenerationSuccess(true);
    await new Promise(r => setTimeout(r, 900));
    setCreatePhase('form');
    setGenerationSuccess(false);
  }

  async function handleValidate() {
    if (!savedOffer || validating) return;
    setValidating(true);
    try {
      await PostData<Record<string, unknown>, Record<string, never>>({
        url: ApiRoutes.TRANSPORT_OFFERS_VALIDATE(savedOffer.id),
        data: {},
        protected: true,
      });
      onOfferCreated?.(savedOffer.id);
    } finally {
      setValidating(false);
    }
  }

  const offerRef    = savedOffer?.name ?? '';
  const offerStatus = savedOffer ? computeOfferStatus(savedOffer) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-5 lg:p-7 lg:px-8 pb-16 min-h-full">
      
      {/* ── Page header responsive ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 min-h-[56px]">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="md" onClick={onBack} className="!p-2 sm:!p-2.5">
            <ArrowLeftIcon size={13} />
          </Button>
          <h1 className="text-lg sm:text-[22px] font-bold text-gray-900 tracking-tight leading-tight">
            Nouvelle offre
          </h1>
          {offerRef && (
            <span className="text-lg sm:text-[22px] font-normal text-gray-400">
              / {offerRef}
            </span>
          )}
          {offerStatus && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 py-1 px-3 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-800 animate-pulse inline-block" />
              Généré
            </span>
          )}
        </div>
        
        {/* Actions desktop */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button className="h-[34px] px-3.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-sm hover:bg-gray-50 transition-colors">
            <DownloadSimpleIcon size={14} /> Exporter PDF
          </button>
          <button
            onClick={() => savedOffer && onDuplicate?.(savedOffer)}
            className="h-[34px] px-3.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <CopyIcon size={14} /> Dupliquer
          </button>
          <button
            onClick={() => savedOffer && onSend?.(savedOffer)}
            className="h-[34px] px-4 bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-md hover:bg-emerald-900 transition-colors"
          >
            <PaperPlaneTiltIcon size={13} weight="fill" /> Envoyer
          </button>
        </div>
        
        {/* Menu mobile */}
        <div className="sm:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 px-3 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <ListIcon size={14} /> Actions
          </button>
          
          {mobileMenuOpen && (
            <div className="absolute right-4 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <DownloadSimpleIcon size={14} /> Exporter PDF
              </button>
              <button className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <CopyIcon size={14} /> Dupliquer
              </button>
              <button className="w-full text-left px-4 py-2.5 text-xs text-white bg-emerald-800 hover:bg-emerald-900 flex items-center gap-2">
                <PaperPlaneTiltIcon size={13} /> Envoyer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Toggle mobile: Form vs Preview ─────────────────────────────── */}
      {createPhase !== 'chat' && (
        <div className="flex lg:hidden gap-2 mb-4">
          <button
            onClick={() => setShowMobilePanel('form')}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
              showMobilePanel === 'form' 
                ? 'bg-emerald-800 text-white' 
                : 'border border-gray-200 text-gray-700'
            }`}
          >
            Formulaire
          </button>
          <button
            onClick={() => setShowMobilePanel('preview')}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
              showMobilePanel === 'preview' 
                ? 'bg-emerald-800 text-white' 
                : 'border border-gray-200 text-gray-700'
            }`}
          >
            Aperçu
          </button>
        </div>
      )}

      {/* ── Two-column layout responsive ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-7 lg:items-start">
        
        {/* ── Brief panel ─────────────────────────────────────────────── */}
        {(!fullscreen && createPhase === 'chat') && (
          <div className="w-full lg:w-[460px] lg:flex-shrink-0">
            <OfferAgentChat
              onOfferGenerated={handleOfferGenerated}
              onCancel={() => setCreatePhase('form')}
            />
          </div>
        )}
        
        {!fullscreen && createPhase === 'form' && (
          <div className={`bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden w-full lg:w-[460px] lg:flex-shrink-0 ${showMobilePanel === 'preview' ? 'hidden lg:block' : ''}`}>
            
            {/* Panel header */}
            <div className="flex items-center gap-2 px-4 sm:px-5 h-12 bg-gray-50 border-b border-gray-200">
              <div className="flex-shrink-0 w-6 h-6 rounded-md bg-amber-700 text-white flex items-center justify-center">
                <FileTextIcon size={12} weight="fill" />
              </div>
              <span className="flex-1 text-xs font-semibold text-amber-700">
                Agent Offres · IA
              </span>
              <span className="font-mono text-[10px] text-amber-700 bg-amber-50 border border-amber-300 rounded-lg px-1.5 py-0.5">
                ≤10s
              </span>
            </div>

            {/* Panel body */}
            <div className="p-4 sm:p-5 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-300px)]">
              
              {/* Client */}
              <FormField label="Client">
                <div className="relative">
                  <UserCircleIcon size={16} weight="fill" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input 
                    type="text" 
                    value={client} 
                    onChange={e => setClient(e.target.value)} 
                    placeholder="Nom ou société" 
                    className={`w-full h-10 border rounded-lg pl-8 pr-3 text-[13px] text-gray-900 outline-none ${
                      client ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                  <InfoIcon size={11} weight="fill" className="text-gray-400" />
                  Client non lié à un partenaire Odoo
                </div>
              </FormField>

              {/* Trajet */}
              <FormField label="Trajet">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <MapPinIcon size={15} weight="fill" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-800 pointer-events-none" />
                    <input 
                      type="text" 
                      value={origine} 
                      onChange={e => setOrigine(e.target.value)} 
                      placeholder="Origine" 
                      className={`w-full h-10 border rounded-lg pl-8 pr-3 text-[13px] text-gray-900 outline-none ${
                        origine ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
                      }`}
                    />
                  </div>
                  <ArrowRightIcon size={14} className="text-gray-400 flex-shrink-0 self-center rotate-90 sm:rotate-0" />
                  <div className="relative flex-1">
                    <MapPinIcon size={15} weight="fill" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-700 pointer-events-none" />
                    <input 
                      type="text" 
                      value={destination} 
                      onChange={e => setDestination(e.target.value)} 
                      placeholder="Destination" 
                      className={`w-full h-10 border rounded-lg pl-8 pr-3 text-[13px] text-gray-900 outline-none ${
                        destination ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
                      }`}
                    />
                  </div>
                </div>
              </FormField>

              {/* Marchandise */}
              <FormField label="Marchandise">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <input 
                    type="text"   
                    value={produit}          
                    onChange={e => setProduit(e.target.value)}          
                    placeholder="Produit transporté" 
                    className="h-10 border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50"
                  />
                  <input 
                    type="number" 
                    value={quantite}         
                    onChange={e => setQuantite(Number(e.target.value))} 
                    placeholder="Quantité"           
                    className="h-10 border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50"
                  />
                  <input 
                    type="text"   
                    value={unite}            
                    onChange={e => setUnite(e.target.value)}            
                    placeholder="Unité"               
                    className="h-10 border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50"
                  />
                </div>
              </FormField>

              {/* Mode & Véhicule */}
              <FormField label="Mode & Véhicule">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Sel value={mode} onChange={setMode} options={['Terrestre', 'Maritime', 'Aérien', 'Routier', 'Multimodal']} />
                  <Sel value={vehicule} onChange={setVehicule} options={['Benne', 'Plateau', 'Fourgon', 'Citerne', 'Conteneur', 'Semi-remorque', 'Frigorifique']} />
                </div>
              </FormField>

              {/* Prix unitaire */}
              <FormField label="Prix unitaire (FCFA / tonne)">
                <div className="relative">
                  <CurrencyCircleDollarIcon size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input 
                    type="text" 
                    value={prixStr} 
                    onChange={e => setPrixStr(e.target.value)} 
                    placeholder="Montant" 
                    className={`w-full h-10 border rounded-lg pl-8 pr-3 text-[13px] text-gray-900 outline-none ${
                      prixStr ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                  <InfoIcon size={11} weight="fill" className="text-gray-400" />
                  TVA appliquée : 19,25% · calcul HT / TVA / TTC automatique
                </div>
              </FormField>

              {/* Date de transport */}
              <FormField label="Date de transport prévue">
                <input 
                  type="date" 
                  value={dateDepart} 
                  onChange={e => setDateDepart(e.target.value)} 
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50"
                />
              </FormField>

              {/* Validité */}
              <FormField label="Validité de l'offre">
                <Sel value={validite} onChange={setValidite} options={['30 jours', '15 jours', '7 jours', '60 jours']} />
              </FormField>
            </div>

            {/* Panel footer */}
            <div className="p-4 sm:p-5 border-t border-gray-200 flex flex-col gap-2.5">
              {generated && savedOffer ? (
                <>
                  <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                    <CheckCircleIcon size={14} weight="fill" className="text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] text-emerald-700 leading-relaxed">
                      <strong>Offre générée par l&apos;IA</strong> — Vérifiez et ajustez les informations si nécessaire, puis validez.
                    </div>
                  </div>
                  <button
                    onClick={handleValidate}
                    disabled={validating}
                    className="w-full h-11 border-none rounded-lg bg-emerald-800 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {validating ? (
                      <><ArrowsClockwiseIcon size={18} className="animate-spin" /> Validation en cours…</>
                    ) : (
                      <><CheckCircleIcon size={18} weight="fill" /> Valider l&apos;offre</>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-3">
                    <LightbulbIcon size={14} weight="fill" className="text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-700 leading-relaxed">
                      <strong>Contexte IA activé</strong> — L&apos;agent construit l&apos;offre à partir du trajet, du produit, de la quantité et du prix unitaire.
                    </div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full h-11 border-none rounded-lg bg-emerald-800 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <><ArrowsClockwiseIcon size={18} className="animate-spin" /> Génération en cours…</>
                    ) : (
                      <><MagicWandIcon size={18} weight="fill" /> Générer avec l&apos;IA</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Preview panel ────────────────────────────────────────────── */}
        <div className={`flex-1 flex-col bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden relative ${
          createPhase === 'chat' || (createPhase === 'form' && showMobilePanel === 'form')
            ? 'hidden lg:flex'
            : 'flex'
        }`}>
            
            {/* Preview header */}
            <div className="flex items-center gap-2.5 px-4 sm:px-5 h-12 bg-gray-50 border-b border-gray-200">
              <span className="flex-1 text-sm font-semibold text-gray-600">Prévisualisation</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setFullscreen(v => !v)} 
                  className="h-7.5 px-3 border border-gray-200 rounded-md bg-white text-gray-700 text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
                >
                  {fullscreen ? <ArrowsInIcon size={12} /> : <ArrowsOutIcon size={12} />}
                  <span className="hidden sm:inline">{fullscreen ? 'Réduire' : 'Plein écran'}</span>
                </button>
                <button 
                  onClick={() => savedOffer && onSend?.(savedOffer)} 
                  className="h-7.5 px-3.5 bg-emerald-800 text-white text-[11px] font-semibold rounded-md inline-flex items-center gap-1.5 shadow-sm hover:bg-emerald-900 transition-colors"
                >
                  <PaperPlaneTiltIcon size={12} weight="fill" /> 
                  <span className="hidden sm:inline">Envoyer</span>
                </button>
              </div>
            </div>

            {/* Loading overlay */}
            {generating && (
              <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center animate-spin shadow-lg text-lg">✦</div>
                <div className="text-sm font-semibold text-amber-700">Agent Offres génère votre proposition…</div>
                <div className="text-xs text-gray-400">IA · Estimation : 8s</div>
                <div className="w-60">
                  {[80, 60, 90, 50].map((w, i) => (
                    <div key={i} className="animate-pulse rounded mb-2 h-2.5 bg-gray-200" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Document */}
            <div className="overflow-y-auto p-4 sm:p-6 max-h-[calc(100vh-220px)]">
              {createPhase === 'chat' && !generationSuccess ? (
                <div className="flex flex-col items-center justify-center gap-3.5 py-15 px-8 opacity-70">
                  <div className="w-13 h-13 rounded-xl bg-amber-50 flex items-center justify-center text-2xl text-amber-700">✦</div>
                  <div className="text-sm font-semibold text-amber-700 text-center">En attente de l&apos;agent IA…</div>
                  <div className="text-xs text-gray-400 text-center max-w-65 leading-relaxed">
                    L&apos;aperçu de votre offre apparaîtra ici dès que l&apos;agent aura collecté toutes les informations.
                  </div>
                </div>
              ) : generationSuccess ? (
                <div className="flex flex-col items-center justify-center gap-3.5 py-15 px-8">
                  <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-3xl">✓</div>
                  <div className="text-sm font-semibold text-emerald-800">Document généré avec succès !</div>
                  <div className="text-xs text-gray-400">Pré-remplissage du formulaire…</div>
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
            <div className="flex items-center gap-2 px-4 sm:px-5 h-11 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-1.5 flex-1 text-[11px] text-gray-400">
                <WarningCircleIcon size={14} weight="fill" className="text-amber-500" />
                Généré par IA – réviser avant envoi au client
              </div>
              <button className="h-7.5 px-3 border border-gray-200 rounded-md bg-white text-gray-700 text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 transition-colors">
                <PrinterIcon size={12} /> <span className="hidden sm:inline">Aperçu</span>
              </button>
            </div>
          </div>
      </div>

      {/* ── Offres récentes responsive ───────────────────────────────────── */}
      {recentOffers.length > 0 && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm sm:text-[15px] font-bold text-gray-900">Offres récentes</div>
            <button 
              onClick={onBack} 
              className="h-7.5 px-3 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs inline-flex items-center hover:bg-gray-50 transition-colors"
            >
              Voir toutes →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentOffers.slice(0, 4).map((offer, i) => {
              const status = computeOfferStatus(offer);
              const stat   = STAT_COLORS[status] ?? STAT_COLORS.brouillon;
              const accent = ACCENT_COLORS[i % 4];
              return (
                <div
                  key={offer.id}
                  onClick={() => onViewRecent?.(offer)}
                  className="relative bg-white border border-gray-200 rounded-xl p-3.5 sm:p-3.5 cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accent }} />
                  <div className="font-mono text-[11px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mb-1.5">
                    {offer.name}
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900 mb-0.5 truncate">
                    {offer.client_name}
                  </div>
                  <div className="text-[11px] text-gray-500 mb-2.5 truncate">
                    {offer.origin_location.split(',')[0]} → {offer.destination_location.split(',')[0]}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-gray-900">
                      {fmtOfferAmount(offer.amount_total, offer.currency)}
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: stat.bg, color: stat.color }}
                    >
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