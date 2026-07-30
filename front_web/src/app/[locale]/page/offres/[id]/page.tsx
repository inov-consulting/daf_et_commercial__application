'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchOffers,
  fetchOfferDetail,
  validateOffer,
  confirmOffer,
  cancelOffer,
} from '@/redux/features/offers/offersSlice';
import { transportListItemToOffer, transportDetailToOffer } from '@/types/offer_type';
import type { Offer } from '@/types/offer_type';
import { OfferDetailView } from '@/components/offers/offer-detail-view';

export default function OfferDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const dispatch = useAppDispatch();

  const id     = typeof params.id     === 'string' ? params.id     : Array.isArray(params.id)     ? params.id[0]     : '';
  const locale = typeof params.locale === 'string' ? params.locale : Array.isArray(params.locale) ? params.locale[0] : 'fr';

  const { list, detail, detailLoading } = useAppSelector(s => s.offers);

  useEffect(() => {
    if (!id) return;
    // Abort annule la première requête si StrictMode démonte/remonte le composant,
    // évitant ainsi le double appel en développement.
    const promise = dispatch(fetchOfferDetail(id));
    return () => { promise.abort(); };
  }, [dispatch, id]);

  // Si la liste est vide (navigation directe via URL), on la charge pour avoir le fallback.
  useEffect(() => {
    if (!list.length) dispatch(fetchOffers());
  }, [dispatch, list.length]);

  function backToList() {
    router.push(`/${locale}/page/offres`);
  }

  async function handleValidate(offer: Offer) {
    await dispatch(validateOffer(offer.id));
    dispatch(fetchOfferDetail(offer.id));
  }

  async function handleConfirm(offer: Offer) {
    await dispatch(confirmOffer(offer.id));
    dispatch(fetchOfferDetail(offer.id));
  }

  async function handleCancel(offer: Offer) {
    if (!confirm(`Annuler l'offre "${offer.name}" ?`)) return;
    await dispatch(cancelOffer(offer.id));
    backToList();
  }

  // Priorité : détail complet > item de la liste > rien (skeleton)
  // TransportOfferDetail utilise offer_id (et non id)
  const hasDetail  = !!detail && detail.offer_id === id;
  const listItem   = list.find(o => o.id === id);

  // odoo_linked et odoo_shipment_name viennent du listItem (mis à jour après confirm/validate)
  // TransportOfferDetail ne contient pas odoo_shipment_id, on ne peut pas déduire ça du détail seul.
  const odooOverrides = {
    odoo_linked:         !!listItem?.odoo_shipment_id,
    odoo_shipment_name:  listItem?.odoo_shipment_name ?? null,
  };

  const offer: Offer | null = hasDetail
    ? { ...transportDetailToOffer(detail!), ...odooOverrides }
    : listItem
    ? transportListItemToOffer(listItem)
    : null;

  // Skeleton uniquement si aucune donnée disponible (pas dans la liste, détail pas encore chargé)
  const isLoading = !offer;

  return (
    <OfferDetailView
      offer={offer ?? ({} as Offer)}
      detail={hasDetail ? detail : null}
      loading={isLoading}
      onBack={backToList}
      onEdit={(o) => router.push(`/${locale}/page/offres/nouveau?edit=${o.id}`)}
      onDuplicate={() => {}}
      onSend={() => {}}
      onRegenerate={() => { dispatch(fetchOfferDetail(id)); }}
      onValidate={handleValidate}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
