'use client';

import {
  CopyIcon, DownloadSimpleIcon, PencilSimpleIcon,
  PaperPlaneTiltIcon, ArrowsClockwiseIcon,
  WarningCircleIcon, CaretRightIcon, MapPinIcon,
  ArrowRightIcon, FileTextIcon, BuildingsIcon, TruckIcon,
  CalendarBlankIcon, ClockCounterClockwiseIcon,
  ArrowLeftIcon,
} from '@phosphor-icons/react';
import type { Offer, OfferStatus } from '@/types/offer_type';
import {
  computeOfferStatus, isOfferExpired, offerDaysLeft,
  fmtOfferAmount, fmtOfferDate, OFFER_MODE_CONFIG,
} from '@/types/offer_type';
import { OfferDocument } from './offer-document';
import { OfferStatusBadge } from './offer-status-badge';
import { Button } from '../ui';

// ── Props ─────────────────────────────────────────────────────────────────────

interface OfferDetailViewProps {
  offer: Offer;
  onBack: () => void;
  onEdit: (offer: Offer) => void;
  onDuplicate: (offer: Offer) => void;
  onSend: (offer: Offer) => void;
  onRegenerate?: (offer: Offer) => void;
}

// ── Shared card styles (prototype .card / .card-head / .info-row) ─────────────

const cardSt: React.CSSProperties = {
  background: '#fff', border: '1px solid #DDE5EF',
  borderRadius: 14, boxShadow: '0 2px 8px rgba(18,58,38,.08)',
};

const cardHeadSt: React.CSSProperties = {
  padding: '14px 18px', borderBottom: '1px solid #DDE5EF',
  display: 'flex', alignItems: 'center', gap: 8,
};

const cardTitleSt: React.CSSProperties = {
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  fontSize: 13, fontWeight: 600, color: '#1B2633', flex: 1,
};

const cardBodySt: React.CSSProperties = { padding: '16px 18px' };

function InfoRow({ label, value, danger }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #EEF2F7', fontSize: 13 }}>
      <span style={{ color: '#7691A8' }}>{label}</span>
      <span style={{ color: danger ? '#B91C1C' : '#1B2633', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function InfoRowLast({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13 }}>
      <span style={{ color: '#7691A8' }}>{label}</span>
      <span style={{ color: '#1B2633', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── Icon button (prototype .icon-btn) ─────────────────────────────────────────

function IconBtn({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: 8,
        border: '1px solid #DDE5EF', background: '#fff',
        color: '#5A738A', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        boxShadow: '0 1px 2px rgba(18,58,38,.06)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F7F9FC')}
      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >
      {icon}
    </button>
  );
}

// ── Timeline (prototype .timeline / .tl-item / .tl-dot) ──────────────────────

type TlColor = 'gold' | 'ok' | 'warn' | 'err' | 'gray';

interface TlEvent { label: string; meta?: string; color: TlColor }

const TL_COLOR: Record<TlColor, string> = {
  gold:  '#92720C',
  ok:    '#10B981',
  warn:  '#F59E0B',
  err:   '#EF4444',
  gray:  '#9EB0C4',
};

function Timeline({ events }: { events: TlEvent[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {events.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: i < events.length - 1 ? 18 : 0 }}>
          {/* connector */}
          {i < events.length - 1 && (
            <div style={{ position: 'absolute', left: 5, top: 16, bottom: 0, width: 1, background: '#DDE5EF' }} />
          )}
          {/* dot */}
          <div
            style={{
              width: 11, height: 11, borderRadius: '50%', flexShrink: 0, marginTop: 2,
              background: TL_COLOR[ev.color],
              boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${TL_COLOR[ev.color]}`,
            }}
          />
          {/* text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1B2633' }}>{ev.label}</div>
            {ev.meta && <div style={{ fontSize: 11, color: '#7691A8', marginTop: 2 }}>{ev.meta}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Vue détail ────────────────────────────────────────────────────────────────

export function OfferDetailView({ offer, onBack, onEdit, onDuplicate, onSend, onRegenerate }: OfferDetailViewProps) {
  const status   = computeOfferStatus(offer);
  const expired  = isOfferExpired(offer);
  const daysLeft = !expired ? offerDaysLeft(offer) : null;
  const modeCfg  = offer.transport_mode ? OFFER_MODE_CONFIG[offer.transport_mode.toLowerCase()] : undefined;

  const canSend = !(['signee', 'refusee', 'expiree'] as OfferStatus[]).includes(status);

  const p = {
    ht:  offer.amount_untaxed || offer.unit_price * (offer.quantity ?? 1),
    ttc: offer.amount_total,
  };

  // Timeline events
  const tlEvents: TlEvent[] = [
    { label: 'Générée par IA', meta: `${fmtOfferDate(offer.created_at)} · Claude Haiku 4.5`, color: 'gold' },
  ];
  if (status === 'signee') {
    tlEvents.push({ label: 'Offre signée', meta: 'Confirmée par le client', color: 'ok' });
  } else if (status === 'refusee') {
    tlEvents.push({ label: 'Offre refusée', meta: 'Déclinée par le client', color: 'err' });
  } else if (status === 'envoyee') {
    tlEvents.push({ label: 'Envoyée au client', meta: 'En attente de réponse', color: 'warn' });
  } else if (expired) {
    tlEvents.push(
      { label: 'Validité expirée (automatique)', meta: fmtOfferDate(offer.date_expiry), color: 'gray' },
      { label: "Aucun envoi enregistré", meta: "L'offre n'a pas été transmise au client", color: 'gray' },
    );
  }

  return (
    <div className="overflow-auto" style={{ padding: '28px 32px 64px', minHeight: '100%' }}>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="md" onClick={onBack}><ArrowLeftIcon size={13} /></Button>
            <h1 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: 24, fontWeight: 700, color: '#1B2633', letterSpacing: -0.5, lineHeight: 1.15 }}>
              {offer.client_name}
            </h1>
            <OfferStatusBadge status={status} size="md" />
          </div>
          <div style={{ fontSize: 12, color: '#7691A8', marginTop: 4, fontFamily: 'monospace' }}>
            {offer.name} · émise le {fmtOfferDate(offer.date_emission)}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconBtn title="Dupliquer" icon={<CopyIcon size={14} />} onClick={() => onDuplicate(offer)} />
          <IconBtn title="Exporter PDF" icon={<DownloadSimpleIcon size={14} />} />
          <button
            onClick={() => onEdit(offer)}
            style={{
              height: 36, padding: '0 14px', border: '1px solid #DDE5EF', borderRadius: 8,
              background: '#fff', color: '#435869', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: '0 1px 2px rgba(18,58,38,.06)',
            }}
            onMouseEnter={e => { (e.currentTarget.style.background = '#F7F9FC'); (e.currentTarget.style.borderColor = '#C3D0DF'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = '#fff'); (e.currentTarget.style.borderColor = '#DDE5EF'); }}
          >
            <PencilSimpleIcon size={13} /> Modifier
          </button>

          {expired ? (
            <button
              onClick={() => onRegenerate ? onRegenerate(offer) : onEdit(offer)}
              style={{
                height: 36, padding: '0 16px', border: 'none', borderRadius: 8,
                background: '#D97706', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(18,58,38,.08)',
              }}
            >
              <ArrowsClockwiseIcon size={13} weight="fill" /> Régénérer l&apos;offre
            </button>
          ) : (
            <button
              onClick={() => canSend ? onSend(offer) : undefined}
              disabled={!canSend}
              style={{
                height: 36, padding: '0 16px', border: 'none', borderRadius: 8,
                background: '#1E5B3C', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(18,58,38,.08)',
                opacity: canSend ? 1 : 0.5,
              }}
            >
              <PaperPlaneTiltIcon size={13} weight="fill" /> Envoyer
            </button>
          )}
        </div>
      </div>

      {/* ── Alerte (offre expirée) ─────────────────────────────────────── */}
      {expired && (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: '#FFFBEB', border: '1px solid #D97706',
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          }}
        >
          <WarningCircleIcon size={18} weight="fill" style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: '#7A4A06', lineHeight: 1.55 }}>
            <strong>Offre expirée depuis le {fmtOfferDate(offer.date_expiry)}</strong> — la validité de {offer.validity_days} jours a expiré. Régénérez l&apos;offre avec une nouvelle date d&apos;émission avant tout envoi au client.
          </div>
        </div>
      )}

      {/* ── Alerte (expire bientôt) ────────────────────────────────────── */}
      {!expired && daysLeft !== null && daysLeft <= 7 && status !== 'signee' && status !== 'refusee' && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#D97706',
          }}
        >
          <WarningCircleIcon size={16} weight="fill" style={{ flexShrink: 0 }} />
          <span>L&apos;offre expire dans <strong>{daysLeft} jour{daysLeft !== 1 ? 's' : ''}</strong>.</span>
        </div>
      )}

      {/* ── Grid document + rail ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Document (flex:1) ─────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={cardSt}>
            {/* Card head */}
            <div style={cardHeadSt}>
              <FileTextIcon size={15} style={{ color: '#1E5B3C' }} />
              <span style={cardTitleSt}>Document de l&apos;offre</span>
            </div>
            {/* Document body */}
            <div style={{ padding: '28px 32px' }}>
              <OfferDocument offer={offer} />
            </div>
          </div>
        </div>

        {/* ── Rail (320px) ──────────────────────────────────────────────── */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Client */}
          <div style={cardSt}>
            <div style={cardHeadSt}>
              <BuildingsIcon size={15} style={{ color: '#1E5B3C' }} />
              <span style={cardTitleSt}>Client</span>
            </div>
            <div style={cardBodySt}>
              <InfoRow label="Nom" value={offer.client_name} />
              <InfoRowLast label="Contact" value="–" />
              <div
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, color: '#7691A8', background: '#EEF2F7',
                  padding: '3px 9px', borderRadius: 99, marginTop: 8,
                }}
              >
                {offer.odoo_linked ? '✔ Lié à un partenaire Odoo' : '○ Non lié à un partenaire Odoo'}
              </div>
            </div>
          </div>

          {/* Trajet & transport */}
          <div style={cardSt}>
            <div style={cardHeadSt}>
              <TruckIcon size={15} style={{ color: '#1E5B3C' }} />
              <span style={cardTitleSt}>Trajet & transport</span>
            </div>
            <div style={cardBodySt}>
              {/* Route visual */}
              {offer.origin_location !== '–' && offer.destination_location !== '–' && (
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 10px', borderRadius: 8, marginBottom: 10,
                    background: '#F7F9FC', border: '1px solid #DDE5EF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#1B2633', fontWeight: 600, flex: 1, minWidth: 0 }}>
                    <MapPinIcon size={11} style={{ color: '#1E5B3C', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {offer.origin_location.split(',')[0].trim()}
                    </span>
                  </div>
                  <ArrowRightIcon size={10} style={{ color: '#9EB0C4', flexShrink: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#1B2633', fontWeight: 600, flex: 1, minWidth: 0 }}>
                    <MapPinIcon size={11} style={{ color: '#DC2626', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {offer.destination_location.split(',')[0].trim()}
                    </span>
                  </div>
                </div>
              )}
              <InfoRow label="Origine" value={offer.origin_location !== '–' ? offer.origin_location : '–'} />
              <InfoRow label="Destination" value={offer.destination_location !== '–' ? offer.destination_location : '–'} />
              <InfoRow label="Mode" value={
                modeCfg
                  ? <span style={{ padding: '1px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: modeCfg.bg, color: modeCfg.color }}>{modeCfg.label}</span>
                  : (offer.transport_mode ?? '–')
              } />
              <InfoRow label="Véhicule" value={offer.vehicle_type ?? '–'} />
              <InfoRowLast label="Date prévue" value={fmtOfferDate(offer.date_planned)} />
            </div>
          </div>

          {/* Dates clés */}
          <div style={cardSt}>
            <div style={cardHeadSt}>
              <CalendarBlankIcon size={15} style={{ color: '#1E5B3C' }} />
              <span style={cardTitleSt}>Dates clés</span>
            </div>
            <div style={cardBodySt}>
              <InfoRow label="Émission"    value={fmtOfferDate(offer.date_emission)} />
              <InfoRow label="Validité"    value={offer.validity_days ? `${offer.validity_days} jours` : '–'} />
              <InfoRow
                label={expired ? 'Expirée le' : 'Expire le'}
                value={offer.validity_days ? fmtOfferDate(offer.date_expiry) : '–'}
                danger={expired}
              />
              <InfoRowLast
                label="Montant TTC"
                value={
                  p.ttc > 0
                    ? <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1E5B3C' }}>{fmtOfferAmount(p.ttc, offer.currency ?? 'FCFA')}</span>
                    : '–'
                }
              />
            </div>
          </div>

          {/* Historique */}
          <div style={cardSt}>
            <div style={cardHeadSt}>
              <ClockCounterClockwiseIcon size={15} style={{ color: '#1E5B3C' }} />
              <span style={cardTitleSt}>Historique</span>
            </div>
            <div style={cardBodySt}>
              <Timeline events={tlEvents} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 32, paddingTop: 16, borderTop: '1px solid #DDE5EF',
          fontSize: 11, color: '#9EB0C4',
        }}
      >
        <span>W-05 · Offres Commerciales Web · Sprint S5</span>
        <span>PortaLis MVP V1.0 · INOV Consulting · INOV–PGH–PC–2026</span>
      </div>

    </div>
  );
}
