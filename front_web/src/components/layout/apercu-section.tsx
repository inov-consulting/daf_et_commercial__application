import { SHIPMENT_MODE_CONFIG, ShipmentDetail } from '@/types/transport_type';
import React from 'react'

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">{label}</span>
      <div className="px-3 py-2 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-lg text-[12px] text-[var(--tx-1)] font-medium min-h-[34px] flex items-center">
        {value}
      </div>
    </div>
  );
}

const LocationRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) {
    return <InfoRow label={label} value="–" />;
  }
  const parts = value.split(',').map(p => p.trim()).filter(Boolean);
  const primary = parts[0];
  const secondary = parts.slice(1).join(', ');
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">{label}</span>
      <div className="px-3 py-2 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-lg min-h-[34px]">
        <div className="text-[12px] font-semibold text-[var(--tx-1)] leading-snug">{primary}</div>
        {secondary && (
          <div className="text-[10px] text-[var(--tx-3)] mt-0.5 leading-snug">{secondary}</div>
        )}
      </div>
    </div>
  );
}

const fmtDate = (iso?: string) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const fmtAmount = (amount: number, currency?: string) => {
  return `${amount.toLocaleString('fr-FR')} ${currency ?? 'XOF'}`;
}

const ApercuSection = ({ detail }: { detail: ShipmentDetail }) => {
  const marginPct = detail.revenue && detail.margin != null
    ? ((detail.margin / detail.revenue) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] mb-2">Informations</p>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Partenaire" value={detail.partner ?? '–'} />
          <InfoRow label="Mode" value={
            detail.transport_mode
              ? (SHIPMENT_MODE_CONFIG[detail.transport_mode]?.label ?? detail.transport_mode)
              : '–'
          } />
          <InfoRow label="Entreprise" value={detail.company ?? '–'} />
          <InfoRow label="Type véhicule" value={detail.vehicle_subtype ?? '–'} />
          <LocationRow label="Origine" value={detail.origin_location} />
          <LocationRow label="Destination" value={detail.destination_location} />
          <InfoRow label="Date départ" value={fmtDate(detail.date_start)} />
          <InfoRow label="Date arrivée" value={fmtDate(detail.date_end)} />
          {detail.date_order && (
            <InfoRow label="Date commande" value={fmtDate(detail.date_order)} />
          )}
          {detail.planned_qty != null && (
            <InfoRow label="Qté planifiée" value={String(detail.planned_qty)} />
          )}
          {detail.distance_km != null && detail.distance_km > 0 && (
            <InfoRow label="Distance" value={`${detail.distance_km.toLocaleString('fr-FR')} km`} />
          )}
          {detail.voyage_count != null && (
            <InfoRow label="Voyages" value={String(detail.voyage_count)} />
          )}
        </div>
      </div>

      {detail.product_description && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">Description produit</span>
          <div className="px-3 py-2 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-lg text-[12px] text-[var(--tx-1)] leading-relaxed">
            {detail.product_description}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)] mb-2">Financier</p>
        <div className="grid grid-cols-2 gap-3">
          {detail.sale_price_unit != null && (
            <InfoRow label="Prix unitaire" value={fmtAmount(detail.sale_price_unit, detail.currency)} />
          )}
          {detail.total_charges != null && (
            <InfoRow label="Charges totales" value={fmtAmount(detail.total_charges, detail.currency)} />
          )}
          {detail.revenue != null && (
            <InfoRow label="Chiffre d'affaires" value={
              <span className="font-mono font-semibold text-[#085499]">{fmtAmount(detail.revenue, detail.currency)}</span>
            } />
          )}
          {detail.margin != null && (
            <InfoRow label="Marge" value={
              <span className={`font-mono font-semibold ${detail.margin >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                {fmtAmount(detail.margin, detail.currency)}
                {marginPct && <span className="ml-1 text-[10px] font-normal opacity-70">({marginPct}%)</span>}
              </span>
            } />
          )}
        </div>
      </div>

      {detail.notes && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">Notes</span>
          <div className="px-3 py-2 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-lg text-[12px] text-[var(--tx-1)] leading-relaxed">
            {detail.notes}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApercuSection
