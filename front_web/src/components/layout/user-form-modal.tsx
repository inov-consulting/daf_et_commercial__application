'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  XIcon, CheckIcon, CaretDownIcon, DeviceMobileIcon, DesktopIcon, DevicesIcon,
  UserPlusIcon, PencilSimpleIcon, PaperPlaneTiltIcon, MagnifyingGlassIcon, SpinnerIcon,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GROUPES_LIST, ROLES, SURFACES, type User, type UserRole, type AccessSurface, type ApiUser } from '../../types/user_type';
import { useInfiniteCompanies } from '@/hooks/useInfiniteCompanies';
import { ApiCompany } from '@/types/company_type';

export type UserFormSubmitData = Partial<User> & { company_ids: string[] };

interface UserFormModalProps {
  mode: 'invite' | 'edit';
  user?: User;
  rawUser?: ApiUser;
  onClose: () => void;
  onSubmit: (data: UserFormSubmitData) => Promise<{ ok: boolean; error?: string }>;
}

export function UserFormModal({ mode, user, rawUser, onClose, onSubmit }: UserFormModalProps) {
  const [nom, setNom] = useState(user?.nom ?? '');
  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole | ''>(user?.role ?? '');
  const [selectedCompanies, setSelectedCompanies] = useState<ApiCompany[]>(rawUser?.companies ?? []);
  const [groupes, setGroupes] = useState<string[]>(user?.groupes ?? []);
  const [surface, setSurface] = useState<AccessSurface>(user?.surface ?? 'Mobile');
  const [ddOpen, setDdOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Recherche entreprises avec debounce
  const [companySearch, setCompanySearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(companySearch), 300);
    return () => clearTimeout(t);
  }, [companySearch]);

  const { items: companyItems, loading: companiesLoading, hasMore, loadMore } = useInfiniteCompanies(debouncedSearch);

  // Sentinel IntersectionObserver pour le scroll infini
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ddOpen || !sentinelRef.current) return;
    const node = sentinelRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ddOpen, loadMore]);

  // Fermer le dropdown en cliquant hors
  const ddRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setDdOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleCompany = useCallback((company: ApiCompany) => {
    setSelectedCompanies(prev =>
      prev.some(c => c.id === company.id)
        ? prev.filter(c => c.id !== company.id)
        : [...prev, company],
    );
  }, []);

  function toggleGroupe(g: string) {
    setGroupes(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g],
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    const result = await onSubmit({
      nom, prenom, email,
      role: role as UserRole,
      entreprises: selectedCompanies.map(c => c.name ?? c.id),
      groupes,
      surface,
      company_ids: selectedCompanies.map(c => c.id),
    });
    // Si ok : le parent ferme la modal → démontage naturel
    // Si erreur : le parent affiche le toast, on relâche juste le bouton
    if (!result.ok) setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="bg-surface rounded-2xl border border-border shadow-[var(--sh-xl)] w-full max-w-[580px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: mode === 'edit' && user ? user.bg : 'var(--grad)' }}
          >
            {mode === 'edit'
              ? <PencilSimpleIcon size={15} className="text-white" />
              : <UserPlusIcon size={16} className="text-white" />
            }
          </div>
          <p className="flex-1 font-display font-bold text-foreground">
            {mode === 'edit' ? `Modifier · ${user?.prenom} ${user?.nom}` : 'Nouvel utilisateur'}
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground-3 hover:bg-surface-sink transition-colors"
          >
            <XIcon size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 max-h-[460px] overflow-y-auto sidebar-scrollbar space-y-4">
          {/* Nom + Prénom */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nom"
              placeholder="Nom de famille"
              value={nom}
              onChange={e => setNom(e.target.value)}
            />
            <Input
              label="Prénom"
              placeholder="Prénom"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
            />
          </div>

          {/* Email */}
          <Input
            label="Adresse email professionnelle"
            placeholder="email@entreprise.com"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          {/* Rôle */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-sm font-medium text-foreground">Rôle</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 rounded-lg bg-surface text-sm border-[1.5px] border-border-strong outline-none cursor-pointer appearance-none transition-[border-color,box-shadow] hover:border-primary-400 focus:border-border-focus focus:shadow-[0_0_0_3px_rgba(14,134,232,.14)]"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239EB0C4' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              <option value="">Sélectionner un rôle…</option>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Entreprise(s) — infinite scroll */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-sm font-medium text-foreground">Entreprise(s)</label>
            <div className="relative" ref={ddRef}>
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setDdOpen(v => !v)}
                className={cn(
                  'w-full h-10 flex items-center justify-between px-3 rounded-lg border-[1.5px] text-sm bg-surface transition-all',
                  ddOpen
                    ? 'border-primary-400 shadow-[0_0_0_3px_rgba(14,134,232,.1)]'
                    : 'border-border-strong hover:border-primary-400',
                )}
              >
                <span className={cn('flex items-center gap-1.5', selectedCompanies.length === 0 ? 'text-foreground-3' : 'text-foreground')}>
                  {selectedCompanies.length === 0 ? (
                    'Sélectionner une entreprise…'
                  ) : (
                    <>
                      <span className="w-[18px] h-[18px] rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {selectedCompanies.length}
                      </span>
                      {selectedCompanies.length} entreprise{selectedCompanies.length > 1 ? 's' : ''}
                    </>
                  )}
                </span>
                <CaretDownIcon size={12} className={cn('text-foreground-3 transition-transform', ddOpen && 'rotate-180')} />
              </button>

              {/* Dropdown */}
              {ddOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-surface border border-border rounded-xl shadow-md overflow-hidden">
                  {/* Search */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                    <MagnifyingGlassIcon size={13} className="text-foreground-3 flex-shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Rechercher une entreprise…"
                      value={companySearch}
                      onChange={e => setCompanySearch(e.target.value)}
                      className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-foreground-3"
                    />
                    {companySearch && (
                      <button type="button" onClick={() => setCompanySearch('')} className="text-foreground-3 hover:text-foreground">
                        <XIcon size={11} />
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-44 overflow-y-auto">
                    {companyItems.length === 0 && !companiesLoading && (
                      <p className="px-4 py-3 text-sm text-foreground-3 text-center">Aucune entreprise trouvée</p>
                    )}
                    {companyItems.map(company => {
                      const checked = selectedCompanies.some(c => c.id === company.id);
                      return (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => toggleCompany(company)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors',
                            checked ? 'bg-primary-50' : 'hover:bg-surface-sink',
                          )}
                        >
                          <span className={cn(
                            'w-4 h-4 rounded-[4px] border-[1.5px] flex items-center justify-center flex-shrink-0',
                            checked ? 'bg-primary-500 border-primary-500' : 'border-border-strong bg-surface',
                          )}>
                            {checked && <CheckIcon size={9} className="text-white" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-foreground font-medium block truncate">
                              {company.name ?? company.id}
                            </span>
                            {company.country && (
                              <span className="text-[10px] text-foreground-3">{company.country}</span>
                            )}
                          </div>
                          {company.is_active === false && (
                            <span className="text-[10px] text-foreground-3 bg-surface-sink px-1.5 py-0.5 rounded flex-shrink-0">
                              inactif
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Sentinel infinite scroll */}
                    <div ref={sentinelRef} className="h-1" />

                    {companiesLoading && (
                      <div className="flex items-center justify-center gap-2 py-2 text-foreground-3">
                        <SpinnerIcon size={13} className="animate-spin" />
                        <span className="text-xs">Chargement…</span>
                      </div>
                    )}
                    {!hasMore && companyItems.length > 0 && (
                      <p className="text-center text-[10px] text-foreground-3 py-1.5">
                        {companyItems.length} entreprise{companyItems.length > 1 ? 's' : ''} au total
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Chips des entreprises sélectionnées */}
            {selectedCompanies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedCompanies.map(c => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1 px-2.5 py-[3px] bg-primary-50 border border-primary-200 rounded-full text-xs font-medium text-primary-700"
                  >
                    {c.name ?? c.id}
                    <button
                      type="button"
                      onClick={() => toggleCompany(c)}
                      className="w-[14px] h-[14px] rounded-full bg-primary-200 flex items-center justify-center hover:bg-primary-300 transition-colors"
                    >
                      <XIcon size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Groupes */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-sm font-medium text-foreground">Groupes</label>
            <div className="grid grid-cols-2 gap-2">
              {GROUPES_LIST.map(g => {
                const checked = groupes.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGroupe(g)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-sm text-left transition-colors',
                      checked
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'border-border-strong bg-surface text-foreground-2 hover:bg-surface-sink',
                    )}
                  >
                    <span className={cn(
                      'w-4 h-4 rounded-[4px] border-[1.5px] flex items-center justify-center flex-shrink-0',
                      checked ? 'bg-primary-500 border-primary-500' : 'border-border-strong bg-surface',
                    )}>
                      {checked && <CheckIcon size={9} className="text-white" />}
                    </span>
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Surface d'accès */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-sm font-medium text-foreground">Surface d&apos;accès</label>
            <div className="flex border-[1.5px] border-border-strong rounded-lg overflow-hidden">
              {SURFACES.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSurface(s)}
                  className={cn(
                    'flex-1 h-10 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors',
                    i < SURFACES.length - 1 && 'border-r border-border',
                    surface === s
                      ? 'bg-primary-50 text-primary-600 font-semibold'
                      : 'bg-surface text-foreground-2 hover:bg-surface-sink',
                  )}
                >
                  {s === 'Mobile' && <DeviceMobileIcon size={13} />}
                  {s === 'Web' && <DesktopIcon size={13} />}
                  {s === 'Mobile + Web' && <DevicesIcon size={13} />}
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <p className="text-[11px] text-foreground-3">
            {mode === 'invite'
              ? '✉ Un email d\'invitation sera envoyé automatiquement'
              : '✓ Les modifications prennent effet immédiatement'}
          </p>
          <div className="flex gap-2.5">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Annuler</Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><SpinnerIcon size={13} className="animate-spin" />En cours…</>
              ) : (
                <>
                  {mode === 'invite'
                    ? <PaperPlaneTiltIcon size={13} weight="fill" />
                    : <CheckIcon size={13} weight="bold" />
                  }
                  {mode === 'invite' ? 'Créer & inviter' : 'Enregistrer'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
