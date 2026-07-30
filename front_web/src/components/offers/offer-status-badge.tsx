'use client';

import { OFFER_STATUS_CONFIG, type OfferStatus } from '@/types/offer_type';

interface OfferStatusBadgeProps {
  status: OfferStatus;
  size?: 'sm' | 'md';
}

export function OfferStatusBadge({ status, size = 'md' }: OfferStatusBadgeProps) {
  const cfg = OFFER_STATUS_CONFIG[status];
  if (!cfg) return null;

  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: isSm ? '2px 8px' : '3px 10px',
        borderRadius: 99,
        fontSize: isSm ? 10 : 11,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: isSm ? 5 : 6,
          height: isSm ? 5 : 6,
          borderRadius: '50%',
          background: cfg.dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}
