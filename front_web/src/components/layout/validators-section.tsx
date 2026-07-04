'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchAppConfig, updateValidators } from '@/redux/features/app-config/appConfigSlice';
import { fetchUsers } from '@/redux/features/users/usersSlice';
import { UserCircleIcon, ShieldCheckIcon, ArrowsClockwiseIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';

interface ValidatorsSectionProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ValidatorsSection({ showToast }: ValidatorsSectionProps) {
  const dispatch = useAppDispatch();
  const { config, loading, saving, saveError } = useAppSelector(s => s.appConfig);
  const { list: users, loading: usersLoading } = useAppSelector(s => s.users);

  const [offerValidatorId, setOfferValidatorId] = useState<string>('');
  const [crValidatorId, setCrValidatorId] = useState<string>('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    dispatch(fetchAppConfig());
    if (users.length === 0) dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    if (config) {
      setOfferValidatorId(config.validators.offer_validator?.id ?? '');
      setCrValidatorId(config.validators.cr_validator?.id ?? '');
      setDirty(false);
    }
  }, [config]);

  function handleOfferValidator(id: string) {
    setOfferValidatorId(id);
    setDirty(true);
  }

  function handleCrValidator(id: string) {
    setCrValidatorId(id);
    setDirty(true);
  }

  async function handleSave() {
    const result = await dispatch(updateValidators({
      offer_validator_user_id: offerValidatorId || null,
      cr_validator_user_id: crValidatorId || null,
    }));
    if (updateValidators.fulfilled.match(result)) {
      showToast('Validateurs mis à jour avec succès', 'success');
      setDirty(false);
    } else {
      showToast(saveError ?? 'Erreur lors de la mise à jour', 'error');
    }
  }

  const userOptions = users.map(u => ({
    id: u.id,
    label: `${u.first_name} ${u.last_name}`.trim() || u.email,
    email: u.email,
  }));

  return (
    <section className="bg-white border border-[#DDE5EF] rounded-xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <ShieldCheckIcon size={16} className="text-emerald-700" weight="bold" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--tx-1)] leading-tight">
            Validateurs métier
          </h3>
          <p className="text-[11px] text-[var(--tx-3)] mt-0.5">
            Utilisateurs autorisés à valider les offres et comptes-rendus avant envoi vers Odoo
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[12px] text-[var(--tx-3)]">
          <ArrowsClockwiseIcon size={14} className="animate-spin" />
          Chargement de la configuration…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Offer validator */}
          <ValidatorPicker
            label="Validateur des offres transport"
            description="Seul cet utilisateur peut passer une offre au statut « Validée » et l'envoyer vers Odoo."
            value={offerValidatorId}
            onChange={handleOfferValidator}
            options={userOptions}
            loading={usersLoading}
            currentDisplay={config?.validators.offer_validator?.display_name}
          />

          {/* CR validator */}
          <ValidatorPicker
            label="Validateur des comptes-rendus"
            description="Seul cet utilisateur peut valider les comptes-rendus avant archivage."
            value={crValidatorId}
            onChange={handleCrValidator}
            options={userOptions}
            loading={usersLoading}
            currentDisplay={config?.validators.cr_validator?.display_name}
          />
        </div>
      )}

      {/* Save row */}
      {!loading && (
        <div className="flex items-center justify-between pt-2 border-t border-[#EEF2F7]">
          <div className="text-[11px] text-[var(--tx-3)]">
            {dirty ? (
              <span className="flex items-center gap-1 text-amber-600">
                <WarningCircleIcon size={12} weight="fill" />
                Modifications non enregistrées
              </span>
            ) : config ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircleIcon size={12} weight="fill" />
                Configuration à jour
              </span>
            ) : null}
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-emerald-800 text-white hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <ArrowsClockwiseIcon size={13} className="animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <CheckCircleIcon size={13} weight="bold" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────

interface ValidatorPickerProps {
  label: string;
  description: string;
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string; email: string }[];
  loading: boolean;
  currentDisplay?: string;
}

function ValidatorPicker({
  label, description, value, onChange, options, loading, currentDisplay,
}: ValidatorPickerProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-[var(--tx-1)]">
        {label}
      </label>
      <p className="text-[11px] text-[var(--tx-3)] leading-snug">{description}</p>

      <div className="relative mt-1">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <UserCircleIcon size={14} className="text-[var(--tx-3)]" />
        </span>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={loading}
          className="w-full pl-7 pr-3 py-2 text-[12px] border border-[#DDE5EF] rounded-lg bg-white text-[var(--tx-1)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:opacity-60 appearance-none cursor-pointer"
        >
          <option value="">— Aucun validateur —</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.label} ({opt.email})
            </option>
          ))}
        </select>
      </div>

      {currentDisplay && !value && (
        <p className="text-[10px] text-[var(--tx-3)] italic">
          Actuel : {currentDisplay}
        </p>
      )}
    </div>
  );
}
