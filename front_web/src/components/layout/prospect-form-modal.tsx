'use client';

import { useState, useEffect } from 'react';
import { XIcon } from '@phosphor-icons/react';
import { SECTOR_STYLES, type ApiProspect, type UpdateProspectBody } from '@/types/prospect_type';

export interface ProspectFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ApiProspect;
  saving: boolean;
  serverError?: string | null;
  onClose: () => void;
  onSave: (body: UpdateProspectBody) => void;
}

export function ProspectFormModal({
  open, mode, initial, saving, serverError, onClose, onSave,
}: ProspectFormModalProps) {
  const [form, setForm] = useState<UpdateProspectBody>({
    company_name: '', opportunity_name: '', contact_name: '', email: '', phone: '',
    portalis_sector: '', expected_revenue: undefined, portalis_notes: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        company_name:     initial?.company_name     ?? '',
        opportunity_name: initial?.opportunity_name ?? '',
        contact_name:     initial?.contact_name     ?? '',
        email:            initial?.email            ?? '',
        phone:            initial?.phone            ?? '',
        portalis_sector:  initial?.portalis_sector  ?? '',
        expected_revenue: initial?.expected_revenue || undefined,
        portalis_notes:   initial?.portalis_notes   ?? '',
      });
      setLocalError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  function set<K extends keyof UpdateProspectBody>(k: K, v: UpdateProspectBody[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name?.trim()) {
      setLocalError("Le nom de l'entreprise est requis.");
      return;
    }
    setLocalError(null);
    onSave(form);
  }

  const inp = [
    'w-full h-9 px-3 rounded-lg border border-[var(--bd-def)] text-sm text-[var(--tx-1)] bg-white',
    'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
    'transition-colors placeholder:text-[var(--tx-3)]',
  ].join(' ');
  const lbl = 'block text-[12px] font-semibold text-[var(--tx-2)] mb-1.5';
  const displayError = localError ?? serverError;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-[var(--bd-def)] z-10">
          <h2 className="font-display text-[16px] font-bold text-[var(--tx-1)]">
            {mode === 'create' ? 'Nouveau prospect' : 'Modifier le prospect'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors">
            <XIcon size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
              {displayError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Entreprise <span className="text-red-500">*</span></label>
              <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Nom de l'entreprise" className={inp} />
            </div>
            <div>
              <label className={lbl}>Nom de l&apos;opportunité</label>
              <input value={form.opportunity_name ?? ''} onChange={e => set('opportunity_name', e.target.value)} placeholder="Ex : Audit DAF Q3" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Contact</label>
              <input value={form.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} placeholder="Nom du contact" className={inp} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="email@exemple.com" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Téléphone</label>
              <input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+221 77 000 0000" className={inp} />
            </div>
            <div>
              <label className={lbl}>Secteur</label>
              <select value={form.portalis_sector ?? ''} onChange={e => set('portalis_sector', e.target.value)} className={inp}>
                <option value="">— Sélectionner —</option>
                {Object.keys(SECTOR_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Revenu attendu (FCFA)</label>
            <input
              type="number" min={0}
              value={form.expected_revenue ?? ''}
              onChange={e => set('expected_revenue', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0" className={inp}
            />
          </div>

          {mode === 'edit' && (
            <div>
              <label className={lbl}>Notes Portalis</label>
              <textarea
                value={form.portalis_notes ?? ''}
                onChange={e => set('portalis_notes', e.target.value)}
                placeholder="Notes internes, remarques..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--bd-def)] text-sm text-[var(--tx-1)] bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-colors resize-none placeholder:text-[var(--tx-3)]"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-sm text-[var(--tx-2)] border border-[var(--bd-def)] hover:bg-[var(--bg-sink)] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-5 rounded-lg text-sm text-white font-semibold disabled:opacity-60 transition-all" style={{ background: 'var(--grad)' }}>
              {saving ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
