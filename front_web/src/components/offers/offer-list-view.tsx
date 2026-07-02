'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  MagnifyingGlassIcon, FunnelSimpleIcon, PlusIcon, ArrowsClockwiseIcon,
  DotsThreeVerticalIcon, EyeIcon, PencilSimpleIcon, CopyIcon,
  DownloadSimpleIcon, PaperPlaneTiltIcon, TrashIcon, CaretRightIcon,
  MapPinIcon,
} from '@phosphor-icons/react';
import type { Offer, OfferStatus } from '@/types/offer_type';
import { computeOfferStatus, offerDaysLeft, hashColor, fmtOfferAmount, toInitials } from '@/types/offer_type';

// ── Props ─────────────────────────────────────────────────────────────────────

interface OfferListViewProps {
  offers: Offer[];
  loading: boolean;
  onRefresh: () => void;
  onNew: () => void;
  onView: (offer: Offer) => void;
  onEdit: (offer: Offer) => void;
  onDuplicate: (offer: Offer) => void;
  onSend: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
}

// ── Status config (prototype .st-* classes → hex) ────────────────────────────

const STATUS_PILL: Record<OfferStatus, { label: string; bg: string; color: string; dot: string }> = {
  brouillon: { label: 'Brouillon', bg: '#EEF2F7', color: '#435869', dot: '#7691A8' },
  genere:    { label: 'Généré',    bg: '#FBF3DE', color: '#725A0A', dot: '#92720C' },
  envoyee:   { label: 'Envoyée',   bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  signee:    { label: 'Signée ✓',  bg: '#ECFDF5', color: '#059669', dot: '#10B981' },
  refusee:   { label: 'Refusée',   bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
  expiree:   { label: 'Expirée',   bg: '#EEF2F7', color: '#435869', dot: '#7691A8' },
};

const STATUS_TABS: { key: OfferStatus | 'tous'; label: string }[] = [
  { key: 'tous',      label: 'Tous'      },
  { key: 'brouillon', label: 'Brouillon' },
  { key: 'genere',    label: 'Généré'    },
  { key: 'envoyee',   label: 'Envoyée'   },
  { key: 'signee',    label: 'Signée'    },
  { key: 'refusee',   label: 'Refusée'   },
  { key: 'expiree',   label: 'Expirée'   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRelative(iso?: string | null): string {
  if (!iso) return '–';
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  if (diff < 7) return `il y a ${diff} j`;
  if (diff < 30) return `il y a ${Math.round(diff / 7)} sem`;
  return `il y a ${Math.round(diff / 30)} mois`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ValidityCell({ offer }: { offer: Offer }) {
  const st = computeOfferStatus(offer);
  if (!offer.validity_days) return <span style={{ fontSize: 12, color: '#9EB0C4' }}>–</span>;
  if (st === 'signee' || st === 'refusee') return <span style={{ fontSize: 12, color: '#9EB0C4' }}>–</span>;
  if (st === 'expiree') {
    const days = Math.abs(offerDaysLeft(offer));
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#7691A8', whiteSpace: 'nowrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9EB0C4', display: 'inline-block', flexShrink: 0 }} />
        Expirée depuis {days}j
      </div>
    );
  }
  const days = offerDaysLeft(offer);
  const warn = days <= 3;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: warn ? '#D97706' : '#059669', whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: warn ? '#F59E0B' : '#10B981', display: 'inline-block', flexShrink: 0 }} />
      {days}j restants
    </div>
  );
}

// ── Row popup ─────────────────────────────────────────────────────────────────

interface RowPopupProps {
  offer: Offer;
  status: OfferStatus;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onSend: () => void;
  onDelete: () => void;
}

function RowPopup({ offer, status, onView, onEdit, onDuplicate, onSend, onDelete }: RowPopupProps) {
  const [open, setOpen] = useState(false);
  const tdRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (tdRef.current && !tdRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const canSend = !(['signee', 'refusee', 'expiree'] as OfferStatus[]).includes(status);

  const itemSt: React.CSSProperties = {
    width: '100%', textAlign: 'left', padding: '9px 14px',
    border: 'none', background: 'none',
    fontSize: 12, color: '#435869',
    display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
  };

  return (
    <td
      ref={tdRef}
      style={{ padding: '0 8px', position: 'relative', verticalAlign: 'middle' }}
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          width: 30, height: 30, borderRadius: 7,
          border: open ? '1px solid #DDE5EF' : '1px solid transparent',
          background: open ? '#EEF2F7' : 'transparent',
          color: '#7691A8',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
        onMouseEnter={e => {
          (e.currentTarget.style.background = '#EEF2F7');
          (e.currentTarget.style.borderColor = '#DDE5EF');
        }}
        onMouseLeave={e => {
          if (!open) {
            (e.currentTarget.style.background = 'transparent');
            (e.currentTarget.style.borderColor = 'transparent');
          }
        }}
      >
        <DotsThreeVerticalIcon size={15} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 36, right: 8,
            width: 190, background: '#fff',
            border: '1px solid #DDE5EF', borderRadius: 10,
            boxShadow: '0 4px 16px rgba(18,58,38,.10)',
            zIndex: 50, overflow: 'hidden',
          }}
        >
          <button style={itemSt} onClick={() => { onView(); setOpen(false); }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F7F9FC')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <EyeIcon size={14} style={{ color: '#7691A8', width: 14 }} /> Voir le détail
          </button>
          <button style={{ ...itemSt, opacity: 0.4, cursor: 'not-allowed' }}
            disabled title="Non disponible dans le flux IA"
          >
            <PencilSimpleIcon size={14} style={{ color: '#7691A8', width: 14 }} /> Modifier
          </button>
          <button style={{ ...itemSt, opacity: 0.4, cursor: 'not-allowed' }}
            disabled title="Non disponible dans le flux IA"
          >
            <CopyIcon size={14} style={{ color: '#7691A8', width: 14 }} /> Dupliquer
          </button>
          <button style={itemSt}
            onMouseEnter={e => (e.currentTarget.style.background = '#F7F9FC')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            onClick={() => setOpen(false)}
          >
            <DownloadSimpleIcon size={14} style={{ color: '#7691A8', width: 14 }} /> Exporter PDF
          </button>

          <div style={{ height: 1, background: '#EEF2F7', margin: '4px 0' }} />

          <button
            style={{ ...itemSt, opacity: canSend ? 1 : 0.4, cursor: canSend ? 'pointer' : 'not-allowed' }}
            disabled={!canSend}
            onClick={() => { if (canSend) { onSend(); setOpen(false); } }}
            onMouseEnter={e => { if (canSend) (e.currentTarget.style.background = '#F7F9FC'); }}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <PaperPlaneTiltIcon size={14} style={{ color: '#7691A8', width: 14 }} /> Envoyer
          </button>

          <div style={{ height: 1, background: '#EEF2F7', margin: '4px 0' }} />

          <button
            style={{ ...itemSt, color: '#B91C1C' }}
            onClick={() => { onDelete(); setOpen(false); }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <TrashIcon size={14} style={{ color: '#EF4444', width: 14 }} /> Supprimer
          </button>
        </div>
      )}
    </td>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="animate-pulse" style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2F7', flexShrink: 0 }} />
          <div>
            <div className="animate-pulse" style={{ width: 140, height: 12, borderRadius: 4, background: '#EEF2F7', marginBottom: 6 }} />
            <div className="animate-pulse" style={{ width: 90, height: 10, borderRadius: 4, background: '#EEF2F7' }} />
          </div>
        </div>
      </td>
      {[100, 80, 90, 80, 80, 60].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="animate-pulse" style={{ width: w, height: 12, borderRadius: 4, background: '#EEF2F7' }} />
        </td>
      ))}
      <td style={{ padding: '14px 8px' }}>
        <div className="animate-pulse" style={{ width: 30, height: 30, borderRadius: 7, background: '#EEF2F7' }} />
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OfferListView({
  offers, loading,
  onRefresh, onNew,
  onView, onEdit, onDuplicate, onSend, onDelete,
}: OfferListViewProps) {
  const [search,  setSearch]  = useState('');
  const [tabKey,  setTabKey]  = useState<OfferStatus | 'tous'>('tous');
  const [perPage, setPerPage] = useState(20);
  const [page,    setPage]    = useState(1);

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Count per status from full list
  const countsByStatus = useMemo(() => {
    const map: Partial<Record<OfferStatus | 'tous', number>> = { tous: offers.length };
    for (const o of offers) {
      const s = computeOfferStatus(o);
      map[s] = (map[s] ?? 0) + 1;
    }
    return map;
  }, [offers]);

  // Filter
  const filtered = useMemo(() => {
    let list = offers;
    if (tabKey !== 'tous') list = list.filter(o => computeOfferStatus(o) === tabKey);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.client_name.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [offers, tabKey, search]);

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [tabKey, search, perPage]);

  return (
    <div style={{ padding: '28px 32px 64px', minHeight: '100%', overflowY: 'auto' }}>

      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <div style={{ fontSize: 12, color: '#9EB0C4', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#7691A8' }}>Tableau de bord</span>
        <CaretRightIcon size={10} style={{ color: '#C3D0DF' }} />
        <span style={{ color: '#7691A8' }}>Offres</span>
        <CaretRightIcon size={10} style={{ color: '#C3D0DF' }} />
        <span>{today}</span>
      </div>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1B2633', letterSpacing: -0.5, lineHeight: 1.15 }}>
          Offres
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            style={{
              height: 36, padding: '0 14px', border: '1px solid #DDE5EF', borderRadius: 8,
              background: '#fff', color: '#435869',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: '0 1px 2px rgba(18,58,38,.06)',
            }}
            onMouseEnter={e => { (e.currentTarget.style.background = '#F7F9FC'); (e.currentTarget.style.borderColor = '#C3D0DF'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = '#fff'); (e.currentTarget.style.borderColor = '#DDE5EF'); }}
          >
            <DownloadSimpleIcon size={14} /> Exporter CSV
          </button>
          <button
            onClick={onNew}
            style={{
              height: 36, padding: '0 16px', border: 'none', borderRadius: 8,
              background: '#1E5B3C', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(18,58,38,.08)',
            }}
          >
            <PlusIcon size={14} /> Nouvelle offre
          </button>
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>

        {/* Tabs bar — prototype .tabs-bar */}
        <div
          style={{
            display: 'inline-flex', gap: 2,
            background: '#F7F9FC', border: '1px solid #DDE5EF',
            borderRadius: 10, padding: 4,
          }}
        >
          {STATUS_TABS.map(t => {
            const active = tabKey === t.key;
            const count  = countsByStatus[t.key] ?? 0;
            return (
              <button
                key={t.key}
                onClick={() => setTabKey(t.key as OfferStatus | 'tous')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: active ? '#fff' : 'transparent',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? '#1B2633' : '#5A738A',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: active ? '0 1px 2px rgba(18,58,38,.06)' : 'none',
                  transition: 'background .1s, color .1s',
                }}
              >
                {t.label}
                {count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#5A738A' : '#9EB0C4' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 220, height: 36, border: '1px solid #DDE5EF', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6, color: '#9EB0C4', fontSize: 13 }}>
            <MagnifyingGlassIcon size={14} style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#1B2633' }}
            />
          </div>
          <button
            style={{
              height: 36, padding: '0 12px', border: '1px solid #DDE5EF', borderRadius: 8,
              background: '#fff', color: '#435869', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <FunnelSimpleIcon size={13} /> Filtres
          </button>
        </div>
      </div>

      {/* ── Table card ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff', border: '1px solid #DDE5EF',
          borderRadius: 14, boxShadow: '0 2px 8px rgba(18,58,38,.08)',
          overflow: 'visible',
        }}
      >
        <div style={{ overflowX: 'auto', borderRadius: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSt}>
                  <input type="checkbox" style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1E5B3C' }} />
                </th>
                <th style={thSt}>Offre</th>
                <th style={thSt}>Trajet</th>
                <th style={thSt}>Statut</th>
                <th style={{ ...thSt, textAlign: 'right' }}>Montant TTC (FCFA)</th>
                <th style={thSt}>Validité</th>
                <th style={thSt}>Activité</th>
                <th style={{ ...thSt, width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 36 }}>📋</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1B2633' }}>Aucune offre trouvée</div>
                      <div style={{ fontSize: 12, color: '#9EB0C4', maxWidth: 260, textAlign: 'center' }}>
                        {search ? 'Aucun résultat pour cette recherche.'
                          : tabKey !== 'tous' ? 'Aucune offre avec ce statut.'
                          : 'Créez votre première offre avec l\'agent IA.'}
                      </div>
                      {!search && tabKey === 'tous' && (
                        <button onClick={onNew} style={{ marginTop: 4, height: 36, padding: '0 20px', border: 'none', borderRadius: 8, background: '#1E5B3C', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(18,58,38,.08)' }}>
                          <PlusIcon size={14} weight="fill" /> Nouvelle offre
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map(offer => {
                  const status = computeOfferStatus(offer);
                  const pill   = STATUS_PILL[status];
                  const color  = hashColor(offer.client_name);
                  const init   = toInitials(offer.client_name) || '–';
                  const hasRoute = offer.origin_location !== '–' && offer.destination_location !== '–';

                  return (
                    <tr
                      key={offer.id}
                      onClick={() => onView(offer)}
                      style={{ borderBottom: '1px solid #EEF2F7', cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = '#F7F9FC')}
                      onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                    >
                      {/* Checkbox */}
                      <td style={tdSt} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1E5B3C' }} />
                      </td>

                      {/* Offre: avatar + client + ref */}
                      <td style={tdSt}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                              background: color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 700, fontSize: 13,
                            }}
                          >
                            {init}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1B2633', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {offer.client_name}
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#7691A8', marginTop: 1 }}>
                              {offer.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trajet */}
                      <td style={tdSt}>
                        {hasRoute ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 99,
                            background: '#EEF7F1', color: '#123A26',
                            fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                          }}>
                            <MapPinIcon size={11} />
                            {offer.origin_location.split(',')[0].trim()} → {offer.destination_location.split(',')[0].trim()}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#C3D0DF' }}>–</span>
                        )}
                      </td>

                      {/* Statut */}
                      <td style={tdSt}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 11px', borderRadius: 99,
                          fontSize: 12, fontWeight: 600,
                          background: pill.bg, color: pill.color,
                          whiteSpace: 'nowrap',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: pill.dot, display: 'inline-block', flexShrink: 0 }} />
                          {pill.label}
                        </span>
                      </td>

                      {/* Montant TTC */}
                      <td style={{ ...tdSt, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#1B2633', fontSize: 13 }}>
                        {offer.amount_total > 0 ? fmtOfferAmount(offer.amount_total, offer.currency ?? 'FCFA') : <span style={{ color: '#C3D0DF', fontFamily: 'inherit', fontWeight: 400 }}>–</span>}
                      </td>

                      {/* Validité */}
                      <td style={tdSt}>
                        <ValidityCell offer={offer} />
                      </td>

                      {/* Activité */}
                      <td style={{ ...tdSt, fontSize: 12, color: '#7691A8', whiteSpace: 'nowrap' }}>
                        {fmtRelative(offer.created_at)}
                      </td>

                      {/* Actions */}
                      <RowPopup
                        offer={offer}
                        status={status}
                        onView={() => onView(offer)}
                        onEdit={() => onEdit(offer)}
                        onDuplicate={() => onDuplicate(offer)}
                        onSend={() => onSend(offer)}
                        onDelete={() => onDelete(offer)}
                      />
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── List footer ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, fontSize: 12, color: '#7691A8' }}>
        {filtered.length > 0 && (
          <span>
            Affichage {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} sur {filtered.length} offre{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalPages > 1 && (
            <>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{ height: 28, padding: '0 10px', border: '1px solid #DDE5EF', borderRadius: 6, background: '#fff', color: '#435869', fontSize: 11, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}
              >
                ← Préc.
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)} style={{ width: 28, height: 28, borderRadius: 6, border: p === page ? 'none' : '1px solid #DDE5EF', background: p === page ? '#1E5B3C' : '#fff', color: p === page ? '#fff' : '#435869', fontSize: 12, fontWeight: p === page ? 600 : 400, cursor: 'pointer' }}>
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ height: 28, padding: '0 10px', border: '1px solid #DDE5EF', borderRadius: 6, background: '#fff', color: '#435869', fontSize: 11, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}
              >
                Suiv. →
              </button>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Afficher
            <select
              value={perPage}
              onChange={e => setPerPage(Number(e.target.value))}
              style={{ border: '1px solid #DDE5EF', borderRadius: 6, height: 28, padding: '0 8px', fontSize: 12, color: '#1B2633', background: '#fff', cursor: 'pointer' }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            par page
          </div>
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 12, fontSize: 11, color: '#7691A8', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: '#5A738A', textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10 }}>Validité :</span>
        {[
          { dot: '#10B981', label: 'Valide (J+4 et plus)' },
          { dot: '#F59E0B', label: 'Bientôt expirée (J-3 à J0)' },
          { dot: '#9EB0C4', label: 'Expirée / non applicable' },
        ].map(({ dot, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, paddingTop: 16, borderTop: '1px solid #DDE5EF', fontSize: 11, color: '#9EB0C4' }}>
        <span>W-05 · Offres Commerciales Web · Sprint S5</span>
        <span>PortaLis MVP V1.0 · INOV Consulting · INOV–PGH–PC–2026</span>
      </div>

    </div>
  );
}

// ── Shared cell styles ────────────────────────────────────────────────────────

const thSt: React.CSSProperties = {
  background: '#F7F9FC',
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#7691A8',
  borderBottom: '1px solid #DDE5EF',
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
};

const tdSt: React.CSSProperties = {
  padding: '14px 16px',
  verticalAlign: 'middle',
  fontSize: 13,
  color: '#435869',
};
