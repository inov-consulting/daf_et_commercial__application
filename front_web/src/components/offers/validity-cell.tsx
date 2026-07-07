import type { Offer } from '@/types/offer_type';
import { computeOfferStatus, offerDaysLeft } from '@/types/offer_type';

interface ValidityCellProps {
  offer: Offer;
}

export function ValidityCell({ offer }: ValidityCellProps) {
  const status = computeOfferStatus(offer);
  
  if (!offer.validity_days || status === 'validee' || status === 'refusee') {
    return <span className="text-xs text-gray-400">–</span>;
  }
  
  if (status === 'expiree') {
    const days = Math.abs(offerDaysLeft(offer));
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
        Expirée depuis {days}j
      </div>
    );
  }
  
  const days = offerDaysLeft(offer);
  const isWarning = days <= 3;
  
  return (
    <div 
      className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${
        isWarning ? 'text-amber-600' : 'text-emerald-600'
      }`}
    >
      <span 
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isWarning ? 'bg-amber-500' : 'bg-emerald-500'
        }`} 
      />
      {days}j restants
    </div>
  );
}