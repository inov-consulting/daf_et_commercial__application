import { ShipmentDetail } from '@/types/transport_type';
import { FolderOpenIcon } from '@phosphor-icons/react';
import React from 'react'

const fmtDate = (iso?: string) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const fmtAmount = (amount: number, currency?: string) => {
  return `${amount.toLocaleString('fr-FR')} ${currency ?? 'XOF'}`;
}

const ImmobilisationsSection = ({ detail }: { detail: ShipmentDetail }) => {
  const items = detail.immobilizations ?? [];
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--tx-3)] gap-2">
        <FolderOpenIcon size={24} className="opacity-40" />
        <span className="text-[13px]">Aucune immobilisation enregistrée</span>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={item.id ?? i}
          className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[var(--tx-1)]">
                {item.reason ?? `Immobilisation ${i + 1}`}
              </div>
              <div className="text-[11px] text-[var(--tx-3)] mt-1">
                {fmtDate(item.start_date)} – {item.end_date ? fmtDate(item.end_date) : 'En cours'}
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              {item.days != null && (
                <div className="text-[15px] font-bold text-[#D97706]">{item.days}j</div>
              )}
              {item.total_cost != null && (
                <div className="text-[11px] font-mono text-[var(--tx-1)]">
                  {fmtAmount(item.total_cost)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ImmobilisationsSection
