import { SHIPMENT_STATE_CONFIG, ShipmentDetail } from '@/types/transport_type';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { FolderOpenIcon } from '@phosphor-icons/react/dist/ssr/FolderOpen';
import React from 'react'

const fmtDate = (iso?: string) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const fmtAmount = (amount: number, currency?: string) => {
  return `${amount.toLocaleString('fr-FR')} ${currency ?? 'XOF'}`;
}

const VoyagesSection = ({ detail }: { detail: ShipmentDetail }) => {
  const voyages = detail.voyages ?? [];
  if (voyages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--tx-3)] gap-2">
        <FolderOpenIcon size={24} className="opacity-40" />
        <span className="text-[13px]">Aucun voyage enregistré</span>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {voyages.map((v, i) => {
        const stateCfg = v.state ? SHIPMENT_STATE_CONFIG[v.state as keyof typeof SHIPMENT_STATE_CONFIG] : null;
        return (
          <div key={v.id ?? i} className="border border-[var(--bd-def)] rounded-xl overflow-hidden">
            {/* Voyage header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-sink)] border-b border-[var(--bd-def)]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] font-semibold text-[#085499]">
                  {v.name ?? `Voyage ${i + 1}`}
                </span>
                {v.mode_operatoire && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3EFFE] text-[#5829A8]">
                    {v.mode_operatoire}
                  </span>
                )}
              </div>
              {stateCfg ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: stateCfg.bg, color: stateCfg.color }}
                >
                  <span className="w-[5px] h-[5px] rounded-full" style={{ background: stateCfg.dot }} />
                  {stateCfg.label}
                </span>
              ) : v.state ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF5FD] text-[#085499]">
                  {v.state}
                </span>
              ) : null}
            </div>

            <div className="p-4 space-y-3">
              {/* Véhicule & chauffeur */}
              {(v.vehicle || v.driver) && (
                <div className="grid grid-cols-2 gap-3">
                  {v.vehicle && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">Véhicule</span>
                      <span className="text-[12px] font-medium text-[var(--tx-1)]">{v.vehicle}</span>
                    </div>
                  )}
                  {v.driver && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">Chauffeur</span>
                      <span className="text-[12px] font-medium text-[var(--tx-1)]">{v.driver}</span>
                    </div>
                  )}
                  {v.vehicle_subtype && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">Type</span>
                      <span className="text-[12px] font-medium text-[var(--tx-1)]">{v.vehicle_subtype}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Trajet & dates */}
              <div className="bg-[var(--bg-sink)] rounded-lg px-3 py-2.5">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
                  <div>
                    {v.origin_location ? (() => {
                      const parts = v.origin_location.split(',').map(p => p.trim()).filter(Boolean);
                      return (
                        <>
                          <div className="text-[12px] font-semibold text-[var(--tx-1)]">{parts[0]}</div>
                          {parts.length > 1 && <div className="text-[10px] text-[var(--tx-3)] mt-0.5">{parts.slice(1).join(', ')}</div>}
                        </>
                      );
                    })() : <span className="text-[12px] text-[var(--tx-3)]">–</span>}
                    <div className="text-[10px] text-[var(--tx-3)] mt-1">{v.date_departure ? fmtDate(v.date_departure) : '–'}</div>
                  </div>
                  <ArrowRightIcon size={12} className="text-[var(--tx-3)] mt-1 flex-shrink-0" />
                  <div className="text-right">
                    {v.destination_location ? (() => {
                      const parts = v.destination_location.split(',').map(p => p.trim()).filter(Boolean);
                      return (
                        <>
                          <div className="text-[12px] font-semibold text-[var(--tx-1)]">{parts[0]}</div>
                          {parts.length > 1 && <div className="text-[10px] text-[var(--tx-3)] mt-0.5">{parts.slice(1).join(', ')}</div>}
                        </>
                      );
                    })() : <span className="text-[12px] text-[var(--tx-3)]">–</span>}
                    <div className="text-[10px] text-[var(--tx-3)] mt-1">{v.date_arrival_dest ? fmtDate(v.date_arrival_dest) : 'Arrivée prévue'}</div>
                  </div>
                </div>
              </div>

              {/* Carburant */}
              {(v.fuel_allowance != null || v.fuel_actual != null) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)] mb-1.5">Carburant</p>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    {v.fuel_allowance != null && (
                      <div className="bg-[var(--bg-sink)] rounded-lg px-2.5 py-2 text-center">
                        <div className="text-[var(--tx-3)] text-[10px]">Prévu</div>
                        <div className="font-semibold text-[var(--tx-1)]">{v.fuel_allowance} L</div>
                      </div>
                    )}
                    {v.fuel_actual != null && (
                      <div className="bg-[var(--bg-sink)] rounded-lg px-2.5 py-2 text-center">
                        <div className="text-[var(--tx-3)] text-[10px]">Réel</div>
                        <div className="font-semibold text-[var(--tx-1)]">{v.fuel_actual} L</div>
                      </div>
                    )}
                    {v.fuel_variance != null && (
                      <div className="bg-[var(--bg-sink)] rounded-lg px-2.5 py-2 text-center">
                        <div className="text-[var(--tx-3)] text-[10px]">Écart</div>
                        <div className={`font-semibold ${v.fuel_variance === 0 ? 'text-[#0E86E8]' : v.fuel_variance > 0 ? 'text-[#DC2626]' : 'text-[#0E86E8]'}`}>
                          {v.fuel_variance > 0 ? '+' : ''}{v.fuel_variance} L
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Charges voyage */}
              {v.total_charges != null && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--bd-def)]">
                  <span className="text-[11px] text-[var(--tx-3)]">Charges voyage</span>
                  <span className="font-mono text-[12px] font-semibold text-[var(--tx-1)]">
                    {fmtAmount(v.total_charges, v.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default VoyagesSection
