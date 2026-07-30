'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CameraIcon, LockSimpleIcon, InfoIcon,
  CheckIcon, CircleNotchIcon, EyeIcon, EyeSlashIcon,
} from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchMe, changePassword, clearChangePasswordError } from '@/redux/features/me/meSlice';
import { updateUser, uploadAvatar } from '@/redux/features/users/usersSlice';
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

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? 'image/png';
  const bytes = atob(data);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new File([buffer], filename, { type: mime });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfilPage() {
  const dispatch = useAppDispatch();
  const { me, loading: meLoading, changingPassword, changePasswordError } = useAppSelector(s => s.me);
  const { updating, uploadingAvatar } = useAppSelector(s => s.users);
  const { items: companies, loading: companiesLoading } = useAppSelector(s => s.companies);

  const [prenom, setPrenom] = useState('');
  const [nom, setNom]       = useState('');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc,    setCropSrc]    = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Password modal state ──
  const [showPwdModal, setShowPwdModal]       = useState(false);
  const [currentPwd, setCurrentPwd]           = useState('');
  const [newPwd, setNewPwd]                   = useState('');
  const [confirmPwd, setConfirmPwd]           = useState('');
  const [showCurrentPwd, setShowCurrentPwd]   = useState(false);
  const [showNewPwd, setShowNewPwd]           = useState(false);
  const [showConfirmPwd, setShowConfirmPwd]   = useState(false);

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
      setSelectedCompanyIds(
        me.companies?.map(c => c.id) ?? me.company_ids ?? [],
      );
    }
  }, [me]);

  // Ferme le modal mot de passe quand l'erreur API change
  useEffect(() => {
    if (changePasswordError) {
      showToast(changePasswordError, false);
    }
  }, [changePasswordError]);

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

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    if (!me || !isDirty || !isValid || updating || uploadingAvatar) return;

    // 1. Upload avatar si changé
    if (avatarPreview) {
      const file = dataUrlToFile(avatarPreview, 'avatar.png');
      const avatarResult = await dispatch(uploadAvatar({ id: me.id, file }));
      if (uploadAvatar.rejected.match(avatarResult)) {
        showToast("Erreur lors de l'upload de la photo", false);
        return;
      }
    }

    // 2. Mise à jour des champs texte si changés
    const hasFieldChanges =
      prenom !== (me.first_name ?? '') ||
      nom    !== (me.last_name  ?? '') ||
      companiesChanged;

    if (hasFieldChanges) {
      const result = await dispatch(updateUser({
        id: me.id,
        payload: {
          ...(prenom !== (me.first_name ?? '') ? { first_name: prenom } : {}),
          ...(nom    !== (me.last_name  ?? '') ? { last_name:  nom    } : {}),
          ...(companiesChanged ? { company_ids: selectedCompanyIds } : {}),
        },
      }));
      if (updateUser.rejected.match(result)) {
        showToast("Erreur lors de l'enregistrement", false);
        return;
      }
    }

    setAvatarPreview(null);
    dispatch(fetchMe());
    showToast('Modifications enregistrées');
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

  function openPwdModal() {
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    dispatch(clearChangePasswordError());
    setShowPwdModal(true);
  }

  async function handleChangePassword() {
    if (!newPwd || newPwd !== confirmPwd) return;
    const result = await dispatch(changePassword({ current_password: currentPwd, new_password: newPwd }));
    if (changePassword.fulfilled.match(result)) {
      setShowPwdModal(false);
      showToast('Mot de passe modifié avec succès');
    }
  }

  const pwdValid = currentPwd.length >= 1 && newPwd.length >= 8 && newPwd === confirmPwd;
  const avatarText = ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase() || '?';
  const isSaving = updating || uploadingAvatar;

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
              {uploadingAvatar
                ? <CircleNotchIcon size={14} className="text-white animate-spin" />
                : <CameraIcon size={14} weight="fill" className="text-white" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
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
              { k: 'Compte créé le', v: fmtDate(me.created_at) },
            ] as { k: string; v: string }[]).map(({ k, v }) => (
              <div key={k} className="flex items-center justify-between py-0.5">
                <span className="text-[13px] text-[var(--tx-2)]">{k}</span>
                <span className="text-[13px] font-semibold text-[var(--tx-1)]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sécurité ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-[var(--bd-def)] rounded-xl p-2 shadow-xs">
          <div className="flex items-center justify-between gap-4 px-3 py-3.5">
            <div>
              <p className="text-[13px] font-semibold text-[var(--tx-1)]">Mot de passe</p>
              <p className="text-[11px] text-[var(--tx-3)]">Modifiez votre mot de passe de connexion</p>
            </div>
            <button
              onClick={openPwdModal}
              className="flex-shrink-0 h-10 px-4 rounded-lg border border-[var(--bd-def)] text-[13px] font-semibold text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
            >
              Modifier
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
            disabled={!isDirty || !isValid || isSaving}
            onClick={handleSave}
            className={cn(
              'h-10 px-5 rounded-lg text-[13px] font-bold text-white flex items-center gap-2 transition-colors',
              isDirty && isValid && !isSaving ? 'hover:opacity-90' : 'cursor-not-allowed',
            )}
            style={{
              background: isDirty && isValid && !isSaving ? 'var(--p500)' : 'var(--bd-def)',
              color: isDirty && isValid && !isSaving ? '#fff' : 'var(--tx-3)',
            }}
          >
            {isSaving
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

      {/* ── Password modal ────────────────────────────────────────────────── */}
      {showPwdModal && (
        <div
          className="fixed inset-0 z-[50] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,33,28,0.45)' }}
          onClick={() => setShowPwdModal(false)}
        >
          <div
            className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-[3px] w-full" style={{ background: 'var(--p500)' }} />
            <div className="p-6 flex flex-col gap-4">
              <h3 className="text-[15px] font-bold text-[var(--tx-1)]">Changer le mot de passe</h3>

              {/* Mot de passe actuel */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[var(--tx-1)]">Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 pr-10 border border-[var(--bd-def)] rounded-lg text-[13px] text-[var(--tx-1)] outline-none focus:border-[var(--p500)] focus:shadow-[0_0_0_3px_rgba(28,122,84,0.12)] bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] hover:text-[var(--tx-2)]"
                  >
                    {showCurrentPwd ? <EyeSlashIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[var(--tx-1)]">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 pr-10 border border-[var(--bd-def)] rounded-lg text-[13px] text-[var(--tx-1)] outline-none focus:border-[var(--p500)] focus:shadow-[0_0_0_3px_rgba(28,122,84,0.12)] bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] hover:text-[var(--tx-2)]"
                  >
                    {showNewPwd ? <EyeSlashIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--tx-3)]">8 caractères minimum</p>
              </div>

              {/* Confirmer */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[var(--tx-1)]">Confirmer le nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    autoComplete="new-password"
                    className={cn(
                      'w-full px-3 py-2.5 pr-10 border rounded-lg text-[13px] text-[var(--tx-1)] outline-none focus:shadow-[0_0_0_3px_rgba(28,122,84,0.12)] bg-white',
                      confirmPwd && newPwd !== confirmPwd
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-[var(--bd-def)] focus:border-[var(--p500)]',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] hover:text-[var(--tx-2)]"
                  >
                    {showConfirmPwd ? <EyeSlashIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
                {confirmPwd && newPwd !== confirmPwd && (
                  <p className="text-[11px] text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              {/* Erreur API */}
              {changePasswordError && (
                <p className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{changePasswordError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-[var(--bd-def)]">
              <button
                onClick={() => setShowPwdModal(false)}
                className="h-10 px-4 rounded-lg border border-[var(--bd-def)] text-[13px] font-semibold text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={!pwdValid || changingPassword}
                onClick={handleChangePassword}
                className={cn(
                  'h-10 px-5 rounded-lg text-[13px] font-bold text-white flex items-center gap-2 transition-opacity',
                  pwdValid && !changingPassword ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed',
                )}
                style={{ background: 'var(--p500)' }}
              >
                {changingPassword && <CircleNotchIcon size={14} className="animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-[13px] font-semibold shadow-2xl z-[60] whitespace-nowrap"
          style={{ background: 'var(--tx-1)' }}
        >
          <CheckIcon size={15} weight="bold" style={{ color: toast.ok ? 'var(--p500)' : '#F87171' }} />
          {toast.msg}
        </div>
      )}

    </div>
  );
}
