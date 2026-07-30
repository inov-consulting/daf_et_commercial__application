'use client';

import { TransportShipmentsSection } from '@/components/layout/transport-shipments-section';

export default function TransportPage() {
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-5 sm:p-7 pb-16">
      <div className="mb-6">
        <h1 className="font-display text-[24px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
          Transport
        </h1>
      </div>

      <TransportShipmentsSection />
    </div>
  );
}
