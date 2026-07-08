'use client';

import { useState } from 'react';
import {
  ArrowRightIcon,
  CircleNotchIcon,
  XIcon,
  ArrowArcRightIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { NextStepBody, NextStepResponse } from '@/types/transport_type';

interface NextStepModalProps {
  shipmentId: number;
  shipmentName: string;
  currentStep?: string;
  onClose: () => void;
  onSuccess: (result: NextStepResponse) => void;
}

export function NextStepModal({
  shipmentId,
  shipmentName,
  currentStep,
  onClose,
  onSuccess,
}: NextStepModalProps) {
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<NextStepResponse | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const body: NextStepBody = note.trim() ? { note: note.trim() } : {};
    const res = await PostData<NextStepResponse, NextStepBody>({
      url: ApiRoutes.TRANSPORT_SHIPMENT_NEXT_STEP(shipmentId),
      data: body,
      protected: true,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error ?? 'Impossible d\'avancer le workflow'); return; }
    setResult(res.data!);
    onSuccess(res.data!);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[81] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[var(--bd-def)] overflow-hidden pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header gradient stripe */}
          <div className="h-[3px] w-full" style={{ background: 'var(--grad)' }} />

          <div className="p-5">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1B6B45,#8B6914)' }}
                  >
                    <ArrowArcRightIcon size={14} weight="bold" className="text-white" />
                  </div>
                  <h2 className="text-[15px] font-bold text-[var(--tx-1)]">Avancer le workflow</h2>
                </div>
                <p className="text-[12px] text-[var(--tx-3)] ml-9">
                  <span className="font-mono font-semibold text-primary">{shipmentName}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:text-[var(--tx-1)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
              >
                <XIcon size={15} />
              </button>
            </div>

            {result ? (
              /* ── Résultat ── */
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 p-3 bg-[#ECFDF5] border border-[rgba(16,185,129,.25)] rounded-xl">
                  <CheckCircleIcon size={18} className="text-primary-500 flex-shrink-0" weight="fill" />
                  <span className="text-[13px] font-semibold text-primary-600">Workflow avancé avec succès</span>
                </div>

                {/* Step transition */}
                <div className="flex items-center gap-3 p-4 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl">
                  {/* Previous */}
                  <div className="text-center flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tx-3)] mb-1">Étape précédente</div>
                    <div className="text-[12px] font-semibold text-[var(--tx-2)] line-through opacity-60">{result.previous_step || '–'}</div>
                  </div>

                  <ArrowRightIcon size={16} className="text-primary flex-shrink-0" weight="bold" />

                  {/* Current */}
                  <div className="text-center flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tx-3)] mb-1">Étape actuelle</div>
                    <span className="inline-block text-[12px] font-bold text-primary bg-[#EBF5FD] px-2.5 py-1 rounded-lg">
                      {result.current_step}
                    </span>
                  </div>

                  <ArrowRightIcon size={14} className="text-[var(--tx-3)] flex-shrink-0" />

                  {/* Next */}
                  <div className="text-center flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tx-3)] mb-1">Prochaine étape</div>
                    <div className="text-[12px] font-medium text-[var(--tx-3)]">{result.next_step || 'Terminé'}</div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full h-10 rounded-xl text-[13px] font-semibold bg-primary-600 text-white hover:bg-primary transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              /* ── Formulaire ── */
              <div className="flex flex-col gap-4">
                {/* Current step info */}
                {currentStep && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-[#EBF5FD] border border-[rgba(14,134,232,.2)] rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-[12px] text-primary-600">
                      Étape actuelle : <strong>{currentStep}</strong>
                    </span>
                  </div>
                )}

                <p className="text-[12px] text-[var(--tx-3)] leading-relaxed">
                  Cette action fera avancer le dossier à la prochaine étape du workflow. Une note optionnelle peut être ajoutée pour tracer la transition.
                </p>

                {/* Note */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tx-3)] mb-1.5 block">
                    Note de transition <span className="normal-case font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={3}
                    placeholder="Ex: Marchandise chargée, départ confirmé pour Abidjan…"
                    className="w-full px-3 py-2.5 text-[13px] text-[var(--tx-1)] bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl focus:outline-none focus:border-[#0E86E8] focus:ring-1 focus:ring-[#0E86E8]/20 resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <WarningCircleIcon size={15} className="flex-shrink-0 mt-0.5" />
                    <span className="text-[12px]">{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={onClose}
                    className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-[var(--tx-2)] bg-[var(--bg-sink)] border border-[var(--bd-def)] hover:bg-[var(--bd-def)] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#1B6B45,#8B6914)' }}
                  >
                    {loading
                      ? <><CircleNotchIcon size={14} className="animate-spin" /> En cours…</>
                      : <><ArrowArcRightIcon size={14} weight="bold" /> Avancer le workflow</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
