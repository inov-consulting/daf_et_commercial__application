'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CameraIcon, LockSimpleIcon, InfoIcon, WarningIcon,
  CheckIcon, CircleNotchIcon, XIcon,
} from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchMe } from '@/redux/features/me/meSlice';
import { updateUser } from '@/redux/features/users/usersSlice';
import { fetchCompanies } from '@/redux/features/companies/companiesSlice';
import { cn } from '@/lib/utils';
import { ImageCropModal } from '@/components/ui/image-crop-modal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '–';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConfirmConfig {
  variant: 'warn' | 'danger';
  title: string;
  desc: string;
  label: string;
  onConfirm: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfilPage() {
  const dispatch = useAppDispatch();
  const { me, loading: meLoading } = useAppSelector(s => s.me);
  const { updating } = useAppSelector(s => s.users);
  const { items: companies, loading: companiesLoading } = useAppSelector(s => s.companies);

  const [prenom, setPrenom] = useState('');
  const [nom, setNom]       = useState('');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc,    setCropSrc]    = useState<string | null>(null);
  const [toast, setToast]     = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const fileRef    = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!me) dispatch(fetchMe());
    if (companies.length === 0) dispatch(fetchCompanies({ limit: 100 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (me) {
      setPrenom(me.first_name ?? '');
      setNom(me.last_name ?? '');
      // L'API retourne `companies` (objets complets), pas `company_ids`
      setSelectedCompanyIds(
        me.companies?.map(c => c.id) ?? me.company_ids ?? [],
      );
    }
  }, [me]);

  const meCompanyIds = me?.companies?.map(c => c.id) ?? me?.company_ids ?? [];
  const companiesChanged = me !== null && (
    selectedCompanyIds.length !== meCompanyIds.length ||
    selectedCompanyIds.some(id => !meCompanyIds.includes(id))
  );
  const isDirty =
    me !== null && (
      prenom !== (me.first_name ?? '') ||
      nom    !== (me.last_name  ?? '') ||
      avatarPreview !== null ||
      companiesChanged
    );
  const isValid = (prenom.trim() + nom.trim()).length >= 1;

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    if (!me || !isDirty || !isValid || updating) return;
    const result = await dispatch(updateUser({
      id: me.id,
      payload: {
        ...(prenom !== (me.first_name ?? '') ? { first_name: prenom } : {}),
        ...(nom    !== (me.last_name  ?? '') ? { last_name:  nom    } : {}),
        ...(companiesChanged ? { company_ids: selectedCompanyIds } : {}),
      },
    }));
    if (updateUser.fulfilled.match(result)) {
      setAvatarPreview(null);
      dispatch(fetchMe());
      showToast('Modifications enregistrées');
    } else {
      showToast("Erreur lors de l'enregistrement");
    }
  }

  function handleCancel() {
    if (!me) return;
    setPrenom(me.first_name ?? '');
    setNom(me.last_name ?? '');
    setSelectedCompanyIds(me.companies?.map(c => c.id) ?? me.company_ids ?? []);
    setAvatarPreview(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const avatarText = ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase() || '?';

  if (meLoading || !me) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--tx-3)] text-sm">
        Chargement du profil…
      </div>
    );
  }

  const avatarSrc = avatarPreview ?? me.avatar_url ?? null;

  return (
    <div className="p-5 sm:p-7 pb-20">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-[var(--tx-1)] tracking-tight leading-tight">
          Mon profil
        </h1>
        <p className="text-[13px] text-[var(--tx-3)] mt-1 max-w-xl">
          Gérez votre photo et votre nom d&apos;affichage. L&apos;email reste fixe : il identifie votre compte.
        </p>
      </div>

      <div className="max-w-[640px] mx-auto flex flex-col gap-5">

        {/* ── Summary card ──────────────────────────────────────────────── */}
        <div className="bg-white border border-[var(--bd-def)] rounded-xl p-8 flex flex-col items-center text-center shadow-xs">

          {/* Avatar */}
          <div className="relative w-[88px] h-[88px] mb-4">
            <div
              className="w-full h-full rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-[30px] select-none"
              style={{ background: avatarSrc ? 'transparent' : 'var(--grad)' }}
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="Photo de profil" className="w-full h-full object-cover rounded-full" />
              ) : avatarText}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-[-2px] right-[-2px] w-8 h-8 rounded-full flex items-center justify-center border-[3px] border-white hover:opacity-90 transition-opacity"
              style={{ background: 'var(--p500)' }}
              aria-label="Changer la photo de profil"
            >
              <CameraIcon size={14} weight="fill" className="text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              onChange={handlePhotoChange}
              aria-label="Sélectionner une photo de profil"
              tabIndex={-1}
            />
          </div>

          <p className="text-[18px] font-bold text-[var(--tx-1)] leading-tight">
            {[prenom, nom].filter(Boolean).join(' ') || '–'}
          </p>
          <p className="text-[13px] text-[var(--tx-2)] mt-1">{me.email}</p>

          <div className="flex items-center gap-2 mt-3.5 flex-wrap justify-center">
            <span
              className="text-[11px] font-bold px-3 py-[5px] rounded-full text-white"
              style={{ background: 'var(--p500)' }}
            >
              Commercial
            </span>
            <span
              className="text-[11px] font-bold px-3 py-[5px] rounded-full flex items-center gap-1.5"
              style={{ color: 'var(--p500)', background: 'rgba(27,107,69,0.08)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--p500)' }} />
              Actif
            </span>
          </div>
        </div>

        {/* ── Identité ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-[var(--bd-def)] rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-[var(--bd-def)]">
            <h2 className="text-[10px] font-bold tracking-[.08em] uppercase text-[var(--tx-3)]">Identité</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">

            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="prenom" className="text-[13px] font-semibold text-[var(--tx-1)]">Prénom</label>
                <input
                  id="prenom"
                  type="text"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  autoComplete="given-name"
                  className="w-full px-3 py-2.5 border border-[var(--bd-def)] rounded-lg text-[13px] text-[var(--tx-1)] outline-none transition-colors focus:border-[var(--p500)] focus:shadow-[0_0_0_3px_rgba(28,122,84,0.12)] bg-white"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nom" className="text-[13px] font-semibold text-[var(--tx-1)]">Nom</label>
                <input
                  id="nom"
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  autoComplete="family-name"
                  className="w-full px-3 py-2.5 border border-[var(--bd-def)] rounded-lg text-[13px] text-[var(--tx-1)] outline-none transition-colors focus:border-[var(--p500)] focus:shadow-[0_0_0_3px_rgba(28,122,84,0.12)] bg-white"
                />
              </div>
            </div>

            {/* Email (verrouillé) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[13px] font-semibold text-[var(--tx-1)]">Adresse email</label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={me.email}
                  disabled
                  className="w-full px-3 py-2.5 pr-10 border border-[var(--bd-def)] rounded-lg text-[13px] text-[var(--tx-2)] bg-[var(--bg-sink)] cursor-not-allowed"
                />
                <LockSimpleIcon
                  size={15}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--tx-3)]"
                />
              </div>
              <p className="text-[11px] text-[var(--tx-3)] flex items-start gap-1.5 leading-relaxed">
                <LockSimpleIcon size={12} className="flex-shrink-0 mt-0.5" />
                Non modifiable — cette adresse sert d&apos;identifiant pour les invitations. Contactez un administrateur pour la changer.
              </p>
            </div>
          </div>
        </div>

        {/* ── Entreprise & accès ────────────────────────────────────────── */}
        <div className="bg-white border border-[var(--bd-def)] rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-[var(--bd-def)]">
            <h2 className="text-[10px] font-bold tracking-[.08em] uppercase text-[var(--tx-3)]">Entreprise &amp; accès</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">

            {/* Organisations (multi-select) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[var(--tx-1)]">Organisations rattachées</span>
                {selectedCompanyIds.length > 0 && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: 'var(--p500)', background: 'rgba(27,107,69,0.08)' }}
                  >
                    {selectedCompanyIds.length} sélectionnée{selectedCompanyIds.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {companiesLoading && companies.length === 0 ? (
                <p className="text-[12px] text-[var(--tx-3)] py-1">Chargement des entreprises…</p>
              ) : companies.length === 0 ? (
                <p className="text-[12px] text-[var(--tx-3)] py-1">Aucune entreprise disponible</p>
              ) : (
                <div className="flex flex-col gap-0.5 border border-[var(--bd-def)] rounded-lg overflow-hidden">
                  {companies.map((c, idx) => {
                    const checked = selectedCompanyIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          'flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors',
                          idx < companies.length - 1 && 'border-b border-[var(--bd-def)]',
                          checked ? 'bg-[rgba(27,107,69,0.04)]' : 'hover:bg-[var(--bg-sink)]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => setSelectedCompanyIds(prev =>
                            e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                          )}
                          className="w-4 h-4 rounded border-[var(--bd-def)] flex-shrink-0"
                          style={{ accentColor: 'var(--p500)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[var(--tx-1)] truncate">{c.name ?? c.id}</p>
                          {c.country && (
                            <p className="text-[11px] text-[var(--tx-3)] truncate">{c.country}</p>
                          )}
                        </div>
                        {checked && (
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: 'var(--p500)' }}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-[var(--tx-3)] flex items-center gap-1">
                <InfoIcon size={11} />
                Sélectionnez toutes les entités auxquelles vous êtes rattaché·e
              </p>
            </div>

            {/* Autres infos (lecture seule) */}
            {([
              { k: 'Rôle',           v: 'Commercial' },
              { k: 'Surface',        v: 'Mobile + Web' },
              { k: 'Compte créé le', v: fmtDate(me.created_at) },
            ] as { k: string; v: string }[]).map(({ k, v }) => (
              <div key={k} className="flex items-center justify-between py-0.5">
                <span className="text-[13px] text-[var(--tx-2)]">{k}</span>
                <span className="text-[13px] font-semibold text-[var(--tx-1)]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sécurité & accès ─────────────────────────────────────────── */}
        <div className="bg-white border border-[var(--bd-def)] rounded-xl p-2 flex flex-col gap-2 shadow-xs">

          {/* Mot de passe */}
          <div className="flex items-center justify-between gap-4 px-3 py-3.5 border-b border-[var(--bd-def)]">
            <div>
              <p className="text-[13px] font-semibold text-[var(--tx-1)]">Mot de passe</p>
              <p className="text-[11px] text-[var(--tx-3)]">Envoie un lien de réinitialisation à votre adresse email</p>
            </div>
            <button
              onClick={() => showToast('Lien de réinitialisation envoyé à ' + me.email)}
              className="flex-shrink-0 h-10 px-4 rounded-lg border border-[var(--bd-def)] text-[13px] font-semibold text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
            >
              Réinitialiser
            </button>
          </div>

          {/* Désactiver (amber) */}
          <div className="flex items-center gap-3 px-3 py-3.5 rounded-lg" style={{ background: '#FBF1DF' }}>
            <div
              className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(156,107,20,0.14)' }}
            >
              <WarningIcon size={17} style={{ color: '#9C6B14' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: '#7C5610' }}>Désactiver mon compte</p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#9C6B14' }}>
                Suspend immédiatement votre accès — réversible par un administrateur
              </p>
            </div>
            <button
              onClick={() => setConfirm({
                variant: 'warn',
                title: 'Désactiver votre compte ?',
                desc: "Vous perdrez immédiatement l'accès à PortaLis. Un administrateur pourra réactiver votre compte à tout moment.",
                label: 'Désactiver mon compte',
                onConfirm: () => showToast('Compte désactivé'),
              })}
              className="flex-shrink-0 h-10 px-4 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: '#9C6B14' }}
            >
              Désactiver
            </button>
          </div>

          {/* Supprimer (danger) */}
          <div className="flex items-center gap-3 px-3 py-3.5 rounded-lg" style={{ background: '#FBEAE9' }}>
            <div
              className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(179,48,43,0.12)' }}
            >
              <WarningIcon size={17} style={{ color: '#B3302B' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: '#8A241E' }}>Supprimer mon compte</p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#B3302B' }}>
                Efface définitivement et irréversiblement votre profil et vos accès
              </p>
            </div>
            <button
              onClick={() => setConfirm({
                variant: 'danger',
                title: 'Supprimer définitivement votre compte ?',
                desc: "Cette action est irréversible. Votre profil, vos accès et votre historique d'activité seront définitivement effacés.",
                label: 'Supprimer mon compte',
                onConfirm: () => showToast('Compte supprimé'),
              })}
              className="flex-shrink-0 h-10 px-4 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: '#B3302B' }}
            >
              Supprimer
            </button>
          </div>
        </div>

        {/* ── Save bar ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-[var(--bd-def)] rounded-xl px-5 py-4 flex items-center gap-3 shadow-xs">
          {isDirty ? (
            <p className="mr-auto flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#9C6B14' }}>
              <InfoIcon size={13} style={{ color: '#9C6B14' }} />
              Modifications non enregistrées
            </p>
          ) : (
            <span className="mr-auto" />
          )}

          {isDirty && (
            <button
              onClick={handleCancel}
              className="h-10 px-4 rounded-lg text-[13px] font-semibold text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
            >
              Annuler
            </button>
          )}

          <button
            disabled={!isDirty || !isValid || updating}
            onClick={handleSave}
            className={cn(
              'h-10 px-5 rounded-lg text-[13px] font-bold text-white flex items-center gap-2 transition-colors',
              isDirty && isValid && !updating
                ? 'hover:opacity-90'
                : 'cursor-not-allowed',
            )}
            style={{
              background: isDirty && isValid && !updating
                ? 'var(--p500)'
                : 'var(--bd-def)',
              color: isDirty && isValid && !updating ? '#fff' : 'var(--tx-3)',
            }}
          >
            {updating
              ? <CircleNotchIcon size={14} className="animate-spin" />
              : <CheckIcon size={14} weight="bold" />
            }
            Enregistrer les modifications
          </button>
        </div>

      </div>

      {/* ── Crop modal ────────────────────────────────────────────────────── */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onConfirm={dataUrl => { setAvatarPreview(dataUrl); setCropSrc(null); }}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-[13px] font-semibold shadow-2xl z-[60] whitespace-nowrap"
          style={{ background: 'var(--tx-1)' }}
        >
          <CheckIcon size={15} weight="bold" style={{ color: 'var(--p500)' }} />
          {toast}
        </div>
      )}

      {/* ── Confirm modal ─────────────────────────────────────────────────── */}
      {confirm && (
        <div
          className="fixed inset-0 z-[40] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,33,28,0.45)' }}
          onClick={() => setConfirm(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden relative z-[41]"
            onClick={e => e.stopPropagation()}
          >
            {/* Accent top bar */}
            <div
              className="h-[3px] w-full"
              style={{ background: confirm.variant === 'warn' ? '#9C6B14' : '#B3302B' }}
            />
            <div className="p-6">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: confirm.variant === 'warn' ? '#FBF1DF' : '#FBEAE9' }}
              >
                <WarningIcon
                  size={22}
                  style={{ color: confirm.variant === 'warn' ? '#9C6B14' : '#B3302B' }}
                />
              </div>
              <h3 className="text-[15px] font-bold text-[var(--tx-1)] mb-2">{confirm.title}</h3>
              <p className="text-[13px] text-[var(--tx-2)] leading-relaxed">{confirm.desc}</p>
            </div>
            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-[var(--bd-def)]">
              <button
                onClick={() => setConfirm(null)}
                className="h-10 px-4 rounded-lg border border-[var(--bd-def)] text-[13px] font-semibold text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { setConfirm(null); confirm.onConfirm(); }}
                className="h-10 px-4 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: confirm.variant === 'warn' ? '#9C6B14' : '#B3302B' }}
              >
                {confirm.label}
              </button>
            </div>
            <button
              onClick={() => setConfirm(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
