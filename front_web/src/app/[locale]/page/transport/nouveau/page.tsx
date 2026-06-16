'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon, CaretRightIcon, SparkleIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import {
  type DossierTransport, type CreateDossierBody,
  type DossierMode, type DossierEntite,
} from '@/types/transport_type';
import { cn } from '@/lib/utils';

/* ── Section label ────────────────────────────────────────────────────────── */

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.06em] text-[var(--tx-3)] mb-4 mt-2">
      <div className="flex-1 h-px bg-[var(--bd-def)]" />
      <span className="flex items-center gap-1.5 px-1 flex-shrink-0">
        <span className="text-base">{icon}</span>
        <span className="whitespace-nowrap">{children}</span>
      </span>
      <div className="flex-1 h-px bg-[var(--bd-def)]" />
    </div>
  );
}

/* ── Form field ───────────────────────────────────────────────────────────── */

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--tx-3)]">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Styles communs ────────────────────────────────────────────────────────── */

const inputBaseCls = cn(
  'w-full h-9 rounded-lg border border-[var(--bd-def)] bg-white',
  'px-3 text-[12px] text-[var(--tx-1)]',
  'placeholder:text-[var(--tx-3)]',
  'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200',
  'hover:border-primary-400',
  'transition-colors duration-150',
  'disabled:bg-surface-sink disabled:cursor-not-allowed disabled:opacity-60',
);

const selectBaseCls = cn(
  inputBaseCls,
  'cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center]',
  'pr-8',
);

const selectArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239EB0C4' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`;

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function NouveauDossierPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  /* Form state */
  const [form, setForm] = useState<{
    offre_ref: string;
    client_name: string;
    contact_name: string;
    commercial: string;
    origine: string;
    destination: string;
    mode: DossierMode | '';
    incoterm: string;
    volume: string;
    devise: string;
    date_depart: string;
    date_livraison: string;
    entite: DossierEntite | '';
    ca_estime: string;
  }>({
    offre_ref: '', client_name: '', contact_name: '', commercial: '',
    origine: '', destination: '', mode: '', incoterm: '', volume: '',
    devise: 'XOF', date_depart: '', date_livraison: '',
    entite: '', ca_estime: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const isValid = form.client_name.trim() && form.origine.trim() &&
    form.destination.trim() && form.mode && form.entite;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || saving) return;

    setSaving(true);
    setError(null);

    const body: CreateDossierBody = {
      offre_ref: form.offre_ref || undefined,
      client_name: form.client_name.trim(),
      contact_name: form.contact_name || undefined,
      origine: form.origine.trim(),
      destination: form.destination.trim(),
      mode: form.mode as DossierMode,
      incoterm: form.incoterm || undefined,
      volume: form.volume || undefined,
      devise: form.devise || undefined,
      date_depart: form.date_depart || undefined,
      date_livraison: form.date_livraison || undefined,
      entite: form.entite as DossierEntite,
      ca_estime: form.ca_estime ? Number(form.ca_estime) : undefined,
    };

    const res = await PostData<DossierTransport, CreateDossierBody>({
      url: ApiRoutes.TRANSPORT_DOSSIERS,
      data: body,
      protected: true,
    });

    setSaving(false);
    if (res.ok && res.data) {
      router.push(`/${locale}/page/transport/${res.data.id}`);
    } else {
      setError(res.error ?? 'Erreur lors de la création du dossier');
    }
  }

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-4 sm:p-7 pb-16 max-w-3xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-4 sm:mb-5">
        <Button
          variant="link"
          size="xs"
          onClick={() => router.push(`/${locale}/page/transport`)}
          className="gap-1 !text-[11px] sm:!text-[12px]"
        >
          <ArrowLeftIcon size={12} />
          Dossiers transport
        </Button>
        <CaretRightIcon size={10} className="text-[var(--tx-3)]" />
        <span className="text-[11px] sm:text-[12px] text-[var(--tx-3)]">Nouveau dossier</span>
      </div>

      {/* Header */}
      <div className="mb-5 sm:mb-7">
        <h1 className="font-display text-xl sm:text-[26px] font-bold text-foreground tracking-tight">
          Nouveau dossier transport
        </h1>
        <p className="text-[var(--tx-3)] text-[11px] sm:text-[12px] mt-0.5">
          W-03 · Création depuis offre signée · {dateStr}
        </p>
      </div>

      {/* Card */}
      <div className="bg-white border border-[var(--bd-def)] rounded-2xl shadow-sm overflow-hidden">
        <div className="h-[3px]" style={{ background: 'var(--grad)' }} />

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">

          {/* Pre-fill banner */}
          {form.offre_ref && (
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 mb-5 sm:mb-6 text-[11px] sm:text-[12px]"
              style={{ background: 'linear-gradient(135deg,rgba(14,134,232,.06),rgba(107,53,201,.06))', border: '1px solid rgba(107,53,201,.2)' }}
            >
              <SparkleIcon size={15} className="flex-shrink-0 mt-0.5 sm:mt-0" style={{ color: '#6B35C9' }} />
              <span style={{ color: '#5829A8' }}>
                Champs pré-remplis depuis l&apos;offre{' '}
                <span className="font-mono font-semibold">{form.offre_ref}</span>{' '}
                — vérifiez et complétez avant de créer.
              </span>
            </div>
          )}

          {/* Section: Client & Offre */}
          <SectionTitle icon="🤝">Client & Offre</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2">
            <Field label="Référence offre signée">
              <input
                type="text"
                value={form.offre_ref}
                onChange={e => set('offre_ref', e.target.value)}
                placeholder="OFF-2026-XXXX"
                className={cn(inputBaseCls, 'font-mono')}
              />
            </Field>
            <Field label="Client" required>
              <input
                type="text"
                value={form.client_name}
                onChange={e => set('client_name', e.target.value)}
                placeholder="Nom du client"
                required
                className={inputBaseCls}
              />
            </Field>
            <Field label="Interlocuteur">
              <input
                type="text"
                value={form.contact_name}
                onChange={e => set('contact_name', e.target.value)}
                placeholder="Prénom Nom · Fonction"
                className={inputBaseCls}
              />
            </Field>
            <Field label="Commercial responsable">
              <input
                type="text"
                value={form.commercial}
                onChange={e => set('commercial', e.target.value)}
                placeholder="Prénom Nom"
                className={inputBaseCls}
              />
            </Field>
          </div>

          {/* Section: Transport */}
          <SectionTitle icon="🚚">Transport</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2">
            <Field label="Origine" required>
              <input
                type="text"
                value={form.origine}
                onChange={e => set('origine', e.target.value)}
                placeholder="Ville, Pays"
                required
                className={inputBaseCls}
              />
            </Field>
            <Field label="Destination" required>
              <input
                type="text"
                value={form.destination}
                onChange={e => set('destination', e.target.value)}
                placeholder="Ville, Pays"
                required
                className={inputBaseCls}
              />
            </Field>
            <Field label="Mode de transport" required>
              <select
                className={selectBaseCls}
                value={form.mode}
                onChange={e => set('mode', e.target.value)}
                required
                style={{ backgroundImage: selectArrow }}
              >
                <option value="">Sélectionner…</option>
                <option value="maritime">Maritime</option>
                <option value="multimodal">Multimodal</option>
                <option value="routier">Routier</option>
              </select>
            </Field>
            <Field label="Incoterm">
              <select
                className={selectBaseCls}
                value={form.incoterm}
                onChange={e => set('incoterm', e.target.value)}
                style={{ backgroundImage: selectArrow }}
              >
                <option value="">Sélectionner…</option>
                {['CFR', 'FOB', 'CIF', 'EXW', 'DAP', 'DDP'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Volume / Marchandise">
              <input
                type="text"
                value={form.volume}
                onChange={e => set('volume', e.target.value)}
                placeholder="Ex : 2 × 20ft · 40T frigorifique"
                className={inputBaseCls}
              />
            </Field>
            <Field label="Devise principale">
              <select
                className={selectBaseCls}
                value={form.devise}
                onChange={e => set('devise', e.target.value)}
                style={{ backgroundImage: selectArrow }}
              >
                <option value="XOF">XOF (FCFA)</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
          </div>

          {/* Section: Dates & Entité */}
          <SectionTitle icon="📅">Dates & Entité</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Date prévue départ">
              <input
                className={inputBaseCls}
                type="date"
                value={form.date_depart}
                onChange={e => set('date_depart', e.target.value)}
              />
            </Field>
            <Field label="Date prévue livraison">
              <input
                className={inputBaseCls}
                type="date"
                value={form.date_livraison}
                onChange={e => set('date_livraison', e.target.value)}
              />
            </Field>
            <Field label="Entité facturation" required>
              <select
                className={selectBaseCls}
                value={form.entite}
                onChange={e => set('entite', e.target.value)}
                required
                style={{ backgroundImage: selectArrow }}
              >
                <option value="">Sélectionner…</option>
                <option value="SN">🇸🇳 PortaLis Sénégal</option>
                <option value="CI">🇨🇮 PortaLis Côte d&apos;Ivoire</option>
              </select>
            </Field>
            <Field label="CA estimé (XOF)">
              <input
                type="number"
                value={form.ca_estime}
                onChange={e => set('ca_estime', e.target.value)}
                placeholder="Ex : 18 500 000"
                min={0}
                className={inputBaseCls}
              />
            </Field>
          </div>

          {/* Error */}
          {error && (
            <Alert type="error" className="mt-5" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 mt-6 sm:mt-7 pt-5 sm:pt-6 border-t border-[var(--bd-def)]">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => router.push(`/${locale}/page/transport`)}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="gradient"
              size="md"
              disabled={!isValid || saving}
              className="w-full sm:w-auto"
              style={{ boxShadow: saving ? 'none' : '0 2px 12px rgba(107,53,201,0.3)', minWidth: 160 }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <CircleNotchIcon size={15} className="animate-spin" />
                  Création en cours…
                </span>
              ) : (
                'Créer le dossier'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}