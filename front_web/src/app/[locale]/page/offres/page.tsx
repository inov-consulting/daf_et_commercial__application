'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Offer } from '@/types/offer_type';
import { transportListItemToOffer, transportDetailToOffer } from '@/types/offer_type';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchOffers,
  fetchOfferDetail,
  validateOffer,
  confirmOffer,
  cancelOffer,
} from '@/redux/features/offers/offersSlice';
import { OfferListView }   from '@/components/offers/offer-list-view';
import { OfferDetailView } from '@/components/offers/offer-detail-view';
import { OfferCreateView } from '@/components/offers/offer-create-view';

type PageView = 'list' | 'create' | 'detail';

export default function OffresPage() {
  // ── Redux ────────────────────────────────────────────────────────────────────
  const dispatch = useAppDispatch();
  const { list, loading, detail, detailLoading } = useAppSelector(s => s.offers);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [view,          setView]          = useState<PageView>('list');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────────
  const loadOffers = useCallback(() => {
    dispatch(fetchOffers());
  }, [dispatch]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Mise à jour de l'offre sélectionnée quand le détail est chargé
  useEffect(() => {
    if (detail && view === 'detail') {
      setSelectedOffer(transportDetailToOffer(detail));
    }
  }, [detail, view]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function openNew() {
    setView('create');
  }

  function handleOfferCreated(offerId: string) {
    loadOffers();
    // Placeholder immédiat — sera remplacé quand fetchOfferDetail se termine
    setSelectedOffer({
      id: offerId,
      name: `OFF-${offerId.slice(0, 8).toUpperCase()}`,
      client_name: '–',
      origin_location: '–',
      destination_location: '–',
      unit_price: 0,
      amount_untaxed: 0,
      amount_tax: 0,
      amount_total: 0,
      validity_days: 0,
      date_emission: new Date().toISOString(),
      date_expiry: new Date().toISOString(),
      state: 'genere',
      created_at: new Date().toISOString(),
      ai_generated: true,
    } as Offer);
    dispatch(fetchOfferDetail(offerId));
    setView('detail');
  }

  async function openDetail(offer: Offer) {
    setSelectedOffer(offer);
    setView('detail');
    // Charge le document complet (sections, pricing, route, client)
    dispatch(fetchOfferDetail(offer.id));
  }

  function backToList() {
    setView('list');
    setSelectedOffer(null);
    loadOffers();
  }

  async function handleValidate(offer: Offer) {
    await dispatch(validateOffer(offer.id));
    // Recharge le détail pour refléter le nouveau statut
    dispatch(fetchOfferDetail(offer.id));
  }

  async function handleConfirm(offer: Offer) {
    await dispatch(confirmOffer(offer.id));
    dispatch(fetchOfferDetail(offer.id));
  }

  async function handleCancel(offer: Offer) {
    if (!confirm(`Annuler l'offre "${offer.name}" ?`)) return;
    await dispatch(cancelOffer(offer.id));
    if (view === 'detail' && selectedOffer?.id === offer.id) backToList();
    else loadOffers();
  }

  const displayOffers = list.map(transportListItemToOffer);

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        {view === 'list' && (
          <OfferListView
            offers={displayOffers}
            loading={loading}
            onRefresh={loadOffers}
            onNew={openNew}
            onView={openDetail}
            onEdit={() => {}}
            onDuplicate={() => {}}
            onSend={() => {}}
            onDelete={handleCancel}
          />
        )}

        {view === 'create' && (
          <OfferCreateView
            editingOffer={null}
            recentOffers={displayOffers.slice(0, 5)}
            onBack={backToList}
            onSave={async () => { throw new Error('Création manuelle désactivée'); }}
            onGenerate={async () => { throw new Error('Génération directe désactivée'); }}
            onSend={() => {}}
            onViewRecent={openDetail}
            onDuplicate={() => {}}
            onOfferCreated={handleOfferCreated}
          />
        )}

        {view === 'detail' && selectedOffer && (
          <OfferDetailView
            offer={selectedOffer}
            onBack={backToList}
            onEdit={() => {/* pas d'édition manuelle */}}
            onDuplicate={() => {/* pas de duplication */}}
            onSend={() => {/* pas d'envoi WhatsApp/email direct */}}
            onRegenerate={async (offer) => {
              await dispatch(fetchOfferDetail(offer.id));
            }}
          />
        )}

        {/* Indicateur de chargement du détail */}
        {detailLoading && view === 'detail' && (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(255,255,255,.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 13, color: '#7691A8' }}>Chargement du document…</div>
          </div>
        )}
      </div>
    </div>
  );
}
