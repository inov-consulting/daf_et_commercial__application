'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchAppConfig, updateSmtp } from '@/redux/features/app-config/appConfigSlice';
import { AppConfig } from '@/types/app_config_type';
import {
  EnvelopeIcon,
  SphereIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockSimpleIcon,
} from '@phosphor-icons/react';

type SmtpForm = AppConfig['smtp'];

const EMPTY_SMTP: SmtpForm = {
  host: '',
  port: 587,
  username: '',
  password: '',
  use_tls: true,
  from_email: '',
  from_name: 'Portalis',
};

interface SmtpSectionProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function SmtpSection({ showToast }: SmtpSectionProps) {
  const dispatch = useAppDispatch();
  const { config, loading, saving, saveError } = useAppSelector(s => s.appConfig);

  const [form, setForm] = useState<SmtpForm>(EMPTY_SMTP);
  const [dirty, setDirty] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!config) dispatch(fetchAppConfig());
  }, [config, dispatch]);

  useEffect(() => {
    if (config?.smtp) {
      setForm({ ...config.smtp, password: '' });
      setDirty(false);
    }
  }, [config]);

  function set<K extends keyof SmtpForm>(key: K, value: SmtpForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    const result = await dispatch(updateSmtp(form));
    if (updateSmtp.fulfilled.match(result)) {
      showToast('Configuration SMTP enregistrée', 'success');
      setDirty(false);
    } else {
      showToast(saveError ?? 'Erreur lors de la sauvegarde SMTP', 'error');
    }
  }

  return (
    <section className="bg-white border border-[#DDE5EF] rounded-xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
          <EnvelopeIcon size={16} className="text-blue-700" weight="bold" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--tx-1)] leading-tight">
            Configuration SMTP
          </h3>
          <p className="text-[11px] text-[var(--tx-3)] mt-0.5">
            Serveur d&apos;envoi pour les notifications email de la plateforme
          </p>
        </div>
      </div>

      {loading && !config ? (
        <div className="flex items-center gap-2 text-[12px] text-[var(--tx-3)]">
          <ArrowsClockwiseIcon size={14} className="animate-spin" />
          Chargement…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Serveur */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
            <Field
              label="Hôte SMTP"
              icon={<SphereIcon size={13} className="text-[var(--tx-3)]" />}
            >
              <input
                type="text"
                value={form.host}
                onChange={e => set('host', e.target.value)}
                placeholder="smtp.example.com"
                className={inputCls}
              />
            </Field>
            <Field label="Port">
              <input
                type="number"
                value={form.port}
                onChange={e => set('port', Number(e.target.value))}
                min={1}
                max={65535}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Authentification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nom d'utilisateur">
              <input
                type="text"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="user@example.com"
                className={inputCls}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Mot de passe"
              icon={<LockSimpleIcon size={13} className="text-[var(--tx-3)]" />}
            >
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pr-8`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--tx-3)] hover:text-[var(--tx-1)]"
                >
                  {showPassword
                    ? <EyeSlashIcon size={13} />
                    : <EyeIcon size={13} />}
                </button>
              </div>
            </Field>
          </div>

          {/* Expéditeur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Email expéditeur">
              <input
                type="email"
                value={form.from_email}
                onChange={e => set('from_email', e.target.value)}
                placeholder="noreply@portalis.app"
                className={inputCls}
              />
            </Field>
            <Field label="Nom expéditeur">
              <input
                type="text"
                value={form.from_name}
                onChange={e => set('from_name', e.target.value)}
                placeholder="Portalis"
                className={inputCls}
              />
            </Field>
          </div>

          {/* TLS toggle */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={form.use_tls}
              onClick={() => set('use_tls', !form.use_tls)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                form.use_tls ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                  form.use_tls ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-[12px] text-[var(--tx-1)] font-medium">Activer TLS/STARTTLS</span>
          </div>
        </div>
      )}

      {/* Footer */}
      {!loading && (
        <div className="flex items-center justify-between pt-2 border-t border-[#EEF2F7]">
          <div className="text-[11px]">
            {dirty ? (
              <span className="flex items-center gap-1 text-amber-600">
                <WarningCircleIcon size={12} weight="fill" />
                Modifications non enregistrées
              </span>
            ) : config ? (
              <span className="flex items-center gap-1 text-primary-600">
                <CheckCircleIcon size={12} weight="fill" />
                Configuration à jour
              </span>
            ) : null}
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-primary-800 text-white hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <><ArrowsClockwiseIcon size={13} className="animate-spin" />Enregistrement…</>
            ) : (
              <><CheckCircleIcon size={13} weight="bold" />Enregistrer</>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-2.5 py-1.5 text-[12px] border border-[#DDE5EF] rounded-lg bg-white text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500';

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-[11px] font-semibold text-[var(--tx-2)]">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
