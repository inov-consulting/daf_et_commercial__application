import type { OfferStatus } from '@/types/offer_type';
import { STATUS_PILL } from '@/lib/constants';

interface StatusBadgeProps {
  status: OfferStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const pill = STATUS_PILL[status];
  
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: pill.bg, color: pill.color }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 inline-block" 
        style={{ backgroundColor: pill.dot }} 
      />
      {pill.label}
    </span>
  );
}