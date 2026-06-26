'use client';

import { InvoiceTable } from "./invoice-table";
import { PaymentCard } from "./payment-card";
import { PlanCard } from "./plan-card";
import { UsageBlock } from "./usage-block";

interface FacturationTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function FacturationTab({ showToast }: FacturationTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 sm:gap-5 items-start">
      {/* Colonne principale */}
      <div className="min-w-0 space-y-4 sm:space-y-5">
        <PlanCard showToast={showToast} />
        <PaymentCard showToast={showToast} />
        <InvoiceTable showToast={showToast} />
      </div>
      
      {/* Sidebar - Usage */}
      <div className="lg:sticky lg:top-[88px]">
        <UsageBlock />
      </div>
    </div>
  );
}