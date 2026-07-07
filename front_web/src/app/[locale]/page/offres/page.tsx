'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Offer } from '@/types/offer_type';
import { transportListItemToOffer } from '@/types/offer_type';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchOffers, cancelOffer } from '@/redux/features/offers/offersSlice';
import { OfferListView } from '@/components/offers/offer-list-view';

export default function OffresPage() {
  const params   = useParams();
  const router   = useRouter();
  const dispatch = useAppDispatch();

  const locale = typeof params.locale === 'string' ? params.locale : Array.isArray(params.locale) ? params.locale[0] : 'fr';

  const { list, loading } = useAppSelector(s => s.offers);

  const loadOffers = useCallback(() => {
    dispatch(fetchOffers());
  }, [dispatch]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  async function handleCancel(offer: Offer) {
    if (!confirm(`Annuler l'offre "${offer.name}" ?`)) return;
    await dispatch(cancelOffer(offer.id));
    loadOffers();
  }

  const displayOffers = list.map(transportListItemToOffer);

  return (
    <div className="flex flex-col">
      <div className="flex-1 overflow-hidden">
        <OfferListView
          offers={displayOffers}
          loading={loading}
          onRefresh={loadOffers}
          onNew={() => router.push(`/${locale}/page/offres/nouveau`)}
          onView={(offer) => router.push(`/${locale}/page/offres/${offer.id}`)}
          onEdit={() => {}}
          onDuplicate={() => {}}
          onSend={() => {}}
          onDelete={handleCancel}
        />
      </div>
    </div>
  );
}
