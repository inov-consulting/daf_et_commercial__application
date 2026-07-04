import type { Offer } from '@/types/offer_type';
import { computeOfferStatus, hashColor, fmtOfferAmount, toInitials } from '@/types/offer_type';
import { MapPinIcon } from '@phosphor-icons/react';
import { StatusBadge } from './status-badge';
import { ValidityCell } from './validity-cell';
import { OfferRowPopup } from './offer-row-popup';
import { formatRelativeDate } from '@/lib/utils';

interface OfferRowProps {
  offer: Offer;
  onView: (offer: Offer) => void;
  onEdit: (offer: Offer) => void;
  onDuplicate: (offer: Offer) => void;
  onSend: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
}

export function OfferRow({ offer, onView, onEdit, onDuplicate, onSend, onDelete }: OfferRowProps) {
  const status = computeOfferStatus(offer);
  const clientColor = hashColor(offer.client_name);
  const initials = toInitials(offer.client_name) || '–';
  const hasRoute = offer.origin_location !== '–' && offer.destination_location !== '–';
  
  return (
    <tr
      className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => onView(offer)}
    >
      {/* Checkbox */}
      <td className="p-3.5" onClick={e => e.stopPropagation()}>
        <input 
          type="checkbox" 
          className="w-4 h-4 cursor-pointer accent-emerald-800" 
        />
      </td>
      
      {/* Offre */}
      <td className="p-3.5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: clientColor }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {offer.client_name}
            </div>
            <div className="font-mono text-xs text-gray-500 mt-0.5">
              {offer.name}
            </div>
          </div>
        </div>
      </td>
      
      {/* Trajet */}
      <td className="p-3.5">
        {hasRoute ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 text-xs font-medium whitespace-nowrap">
            <MapPinIcon size={11} />
            {offer.origin_location.split(',')[0].trim()} → {offer.destination_location.split(',')[0].trim()}
          </span>
        ) : (
          <span className="text-xs text-gray-300">–</span>
        )}
      </td>
      
      {/* Statut */}
      <td className="p-3.5">
        <StatusBadge status={status} />
      </td>
      
      {/* Montant TTC */}
      <td className="p-3.5 text-right font-mono font-semibold text-gray-900 text-sm">
        {offer.amount_total > 0 
          ? fmtOfferAmount(offer.amount_total, offer.currency ?? 'FCFA') 
          : <span className="text-gray-300 font-normal">–</span>
        }
      </td>
      
      {/* Validité */}
      <td className="p-3.5">
        <ValidityCell offer={offer} />
      </td>
      
      {/* Activité */}
      <td className="p-3.5 text-xs text-gray-500 whitespace-nowrap">
        {formatRelativeDate(offer.created_at)}
      </td>
      
      {/* Actions */}
      <OfferRowPopup
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
}