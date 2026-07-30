'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchOffers } from '@/redux/features/offers/offersSlice';
import { transportListItemToOffer, transportDetailToOffer } from '@/types/offer_type';
import type { Offer, TransportOfferDetail } from '@/types/offer_type';
import { OfferCreateView } from '@/components/offers/offer-create-view';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

export default function NouvelleOffrePage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const dispatch     = useAppDispatch();

  const locale = typeof params.locale === 'string' ? params.locale : Array.isArray(params.locale) ? params.locale[0] : 'fr';

  const editId = searchParams.get('edit');

  const { list } = useAppSelector(s => s.offers);

  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [editLoading, setEditLoading]   = useState(false);

  useEffect(() => {
    if (!list.length) dispatch(fetchOffers());
  }, [dispatch, list.length]);

  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);
    GetData<TransportOfferDetail>({
      url: ApiRoutes.TRANSPORT_OFFERS_GET(editId),
      protected: true,
    })
      .then(res => {
        if (res.data) setEditingOffer(transportDetailToOffer(res.data));
      })
      .finally(() => setEditLoading(false));
  }, [editId]);

  const recentOffers: Offer[] = list.slice(0, 5).map(transportListItemToOffer);

  function backToList() {
    router.push(`/${locale}/page/offres`);
  }

  function handleOfferCreated(offerId: string) {
    router.push(`/${locale}/page/offres/${offerId}`);
  }

  function handleOfferUpdated(offerId: string) {
    router.push(`/${locale}/page/offres/${offerId}`);
  }

  function goToDetail(offer: Offer) {
    router.push(`/${locale}/page/offres/${offer.id}`);
  }

  if (editId && editLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--tx-3)] text-sm">
        Chargement de l&apos;offre…
      </div>
    );
  }

  return (
    <OfferCreateView
      editingOffer={editId ? editingOffer : null}
      recentOffers={recentOffers}
      onBack={backToList}
      onSave={async () => { throw new Error('Création manuelle désactivée'); }}
      onGenerate={async () => { throw new Error('Génération directe désactivée'); }}
      onSend={() => {}}
      onViewRecent={goToDetail}
      onDuplicate={() => {}}
      onOfferCreated={handleOfferCreated}
      onUpdated={handleOfferUpdated}
    />
  );
}
