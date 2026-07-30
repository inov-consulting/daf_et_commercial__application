import { ShipmentDetail } from '@/types/transport_type';
import { FolderOpenIcon } from '@phosphor-icons/react';
import React from 'react'

const fmtAmount = (amount: number, currency?: string) => {
  return `${amount.toLocaleString('fr-FR')} ${currency ?? 'XOF'}`;
}

const PORTEUR_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  fournisseur: { label: 'Fournisseur', bg: '#FFF3E0', color: '#D97706' },
  entreprise:  { label: 'Entreprise',  bg: '#EBF5FD', color: '#085499' },
};

const CHARGE_STATE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  prevu:     { label: 'Prévu',    bg: '#F3F4F6', color: '#374151' },
  confirme:  { label: 'Confirmé', bg: '#ECFDF5', color: '#059669' },
  reel:      { label: 'Réel',     bg: '#ECFDF5', color: '#059669' },
  annule:    { label: 'Annulé',   bg: '#FEF2F2', color: '#DC2626' },
};

const ChargesSection = ({ detail }: { detail: ShipmentDetail }) => {
  const charges = detail.charges ?? [];
  if (charges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--tx-3)] gap-2">
        <FolderOpenIcon size={24} className="opacity-40" />
        <span className="text-[13px]">Aucune charge enregistrée</span>
      </div>
    );
  }
  const total = charges.reduce((s, c) => s + (c.amount ?? 0), 0);
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[var(--bd-def)]">
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-[var(--bg-sink)] border-b-2 border-[var(--bd-def)]">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)]">Désignation</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)]">Porteur</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)]">Statut</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--tx-3)]">Montant</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((c, i) => {
              const porteurCfg = c.porteur ? PORTEUR_CONFIG[c.porteur] : null;
              const stateCfg = c.state ? CHARGE_STATE_CONFIG[c.state] : null;
              return (
                <tr key={c.id ?? i} className="border-b border-[#F0F4F8] hover:bg-[#FAFCFF]">
                  <td className="px-3 py-2.5">
                    <div className="text-[var(--tx-1)] font-medium">{c.charge_type ?? '–'}</div>
                    {c.source === 'auto' && (
                      <div className="text-[10px] text-[var(--tx-3)] mt-0.5">Généré automatiquement</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {porteurCfg ? (
                      <span
                        className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: porteurCfg.bg, color: porteurCfg.color }}
                      >
                        {porteurCfg.label}
                      </span>
                    ) : (
                      <span className="text-[var(--tx-3)]">{c.porteur ?? '–'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {stateCfg ? (
                      <span
                        className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: stateCfg.bg, color: stateCfg.color }}
                      >
                        {stateCfg.label}
                      </span>
                    ) : (
                      <span className="text-[var(--tx-3)]">{c.state ?? '–'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-[var(--tx-1)] whitespace-nowrap">
                    {fmtAmount(c.amount, detail.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-[var(--bd-def)] bg-[var(--bg-sink)] font-bold">
            <tr>
              <td className="px-3 py-2.5 text-[13px] text-[var(--tx-1)]" colSpan={3}>Total charges</td>
              <td className="px-3 py-2.5 text-right font-mono text-primary whitespace-nowrap">
                {fmtAmount(total, detail.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default ChargesSection
