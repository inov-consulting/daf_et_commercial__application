import { cn } from '@/lib/utils';
import { FolderSimpleIcon, XIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import React, { useState } from 'react'

const FOLDERS = [
  { group: 'Dossier lié', id: 'dos-0142', name: 'DOS-2026-0142 — Sonatrans SA', count: null, current: true },
  { group: 'Opérations', id: 'crs', name: 'Comptes-rendus', count: 14 },
  { group: 'Opérations', id: 'crs-sn', name: 'Sénégal', count: 6, indent: true },
  { group: 'Opérations', id: 'crs-ci', name: "Côte d'Ivoire", count: 8, indent: true },
  { group: 'Opérations', id: 'offres', name: 'Offres', count: 9 },
  { group: 'Prospections', id: 'pros-sn', name: 'Sénégal', count: 23 },
  { group: 'Prospections', id: 'pros-ci', name: "Côte d'Ivoire", count: 17 },
  { group: 'Missions', id: 'mis-dkr', name: 'Transport DKR–ABJ', count: 5 },
] as const;

const FolderModal = ({
  open, onClose, onSave,
}: { open: boolean; onClose: () => void; onSave: (name: string) => void }) => {
  const [selected, setSelected] = useState<string | null>(null);

  if (!open) return null;

  const groups = Array.from(new Set(FOLDERS.map(f => f.group)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(27,38,51,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-[360px] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bd-def)]">
          <span className="text-[14px] font-bold text-[var(--tx-1)] font-display">Enregistrer dans un dossier</span>
          <Button variant="ghost" iconOnly size="xs" onClick={onClose} aria-label="Fermer">
            <XIcon size={14} />
          </Button>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-2">
          {groups.map(group => (
            <div key={group}>
              <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] font-mono">{group}</div>
              {FOLDERS.filter(f => f.group === group).map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelected(f.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors',
                    'indent' in f && f.indent && 'pl-8',
                    selected === f.id ? 'bg-[rgba(14,134,232,0.07)] text-[#0A6DC0]' : 'hover:bg-[var(--bg-sink)] text-[var(--tx-2)]',
                  )}
                >
                  <FolderSimpleIcon size={14} className={selected === f.id ? 'text-primary' : 'text-[var(--tx-3)]'} />
                  <span className="text-[13px] font-medium flex-1">{f.name}</span>
                  {'current' in f && f.current && (
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#0E86E8', border: '1px solid rgba(16,185,129,0.25)' }}>
                      Actuel
                    </span>
                  )}
                  {f.count !== null && !('current' in f) && (
                    <span className="text-[11px] text-[var(--tx-3)]">{f.count}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--bd-def)]">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="gradient"
            size="sm"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              const folder = FOLDERS.find(f => f.id === selected);
              onSave(folder?.name ?? selected);
            }}
          >
            Enregistrer ici
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FolderModal
