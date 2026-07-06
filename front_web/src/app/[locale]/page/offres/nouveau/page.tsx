'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchOffers } from '@/redux/features/offers/offersSlice';
import { transportListItemToOffer } from '@/types/offer_type';
import type { Offer } from '@/types/offer_type';
import { OfferCreateView } from '@/components/offers/offer-create-view';

export default function NouvelleOffrePage() {
  const params   = useParams();
  const router   = useRouter();
  const dispatch = useAppDispatch();

  const locale = typeof params.locale === 'string' ? params.locale : Array.isArray(params.locale) ? params.locale[0] : 'fr';

  const { list } = useAppSelector(s => s.offers);

  useEffect(() => {
    if (!list.length) dispatch(fetchOffers());
  }, [dispatch, list.length]);

  const recentOffers: Offer[] = list.slice(0, 5).map(transportListItemToOffer);

  function backToList() {
    router.push(`/${locale}/page/offres`);
  }

  function handleOfferCreated(offerId: string) {
    router.push(`/${locale}/page/offres/${offerId}`);
  }

  function goToDetail(offer: Offer) {
    router.push(`/${locale}/page/offres/${offer.id}`);
  }

  return (
    <OfferCreateView
      editingOffer={null}
      recentOffers={recentOffers}
      onBack={backToList}
      onSave={async () => { throw new Error('Création manuelle désactivée'); }}
      onGenerate={async () => { throw new Error('Génération directe désactivée'); }}
      onSend={() => {}}
      onViewRecent={goToDetail}
      onDuplicate={() => {}}
      onOfferCreated={handleOfferCreated}
    />
  );
}
