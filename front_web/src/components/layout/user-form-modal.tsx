'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, Check, CaretDown, DeviceMobile, Desktop, Devices,
  UserPlus, PencilSimple, PaperPlaneTilt,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { COMPANIES, GROUPES_LIST, ROLES, SURFACES, type User, type UserRole, type AccessSurface } from '../../types/user_type';

interface UserFormModalProps {
  mode: 'invite' | 'edit';
  user?: User;
  onClose: () => void;
  onSubmit: (data: Partial<User>) => void;
}

export function UserFormModal({ mode, user, onClose, onSubmit }: UserFormModalProps) {
  const [nom, setNom] = useState(user?.nom ?? '');
  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole | ''>(user?.role ?? '');
  const [entreprises, setEntreprises] = useState<string[]>(user?.entreprises ?? []);
  const [groupes, setGroupes] = useState<string[]>(user?.groupes ?? []);
  const [surface, setSurface] = useState<AccessSurface>(user?.surface ?? 'Mobile');
  const [ddOpen, setDdOpen] = useState(false);
  const [saved, setSaved] = useState(false);

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

  function toggleCompany(c: string) {
    setEntreprises(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c],
    );
  }

  function toggleGroupe(g: string) {
    setGroupes(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g],
    );
  }

  function handleSubmit() {
    setSaved(true);
    onSubmit({ nom, prenom, email, role: role as UserRole, entreprises, groupes, surface });
    setTimeout(onClose, 900);
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
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
              ? <PencilSimple size={15} className="text-white" />
              : <UserPlus size={16} className="text-white" />
            }
          </div>
          <p className="flex-1 font-display font-bold text-foreground">
            {mode === 'edit' ? `Modifier · ${user?.prenom} ${user?.nom}` : 'Nouvel utilisateur'}
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground-3 hover:bg-surface-sink transition-colors"
          >
            <X size={13} />
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

          {/* Entreprise(s) */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-sm font-medium text-foreground">Entreprise(s)</label>
            <div className="relative" ref={ddRef}>
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
                <span className={cn('flex items-center gap-1.5', entreprises.length === 0 ? 'text-foreground-3' : 'text-foreground')}>
                  {entreprises.length === 0 ? (
                    'Sélectionner une entreprise…'
                  ) : (
                    <>
                      <span className="w-[18px] h-[18px] rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {entreprises.length}
                      </span>
                      {entreprises.length} entreprise{entreprises.length > 1 ? 's' : ''}
                    </>
                  )}
                </span>
                <CaretDown size={12} className={cn('text-foreground-3 transition-transform', ddOpen && 'rotate-180')} />
              </button>

              {ddOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-surface border border-border rounded-xl shadow-md overflow-hidden">
                  {COMPANIES.map(company => {
                    const checked = entreprises.includes(company);
                    return (
                      <button
                        key={company}
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
                          {checked && <Check size={9} className="text-white" />}
                        </span>
                        <span className="text-sm text-foreground font-medium">{company}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {entreprises.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {entreprises.map(e => (
                  <span
                    key={e}
                    className="flex items-center gap-1 px-2.5 py-[3px] bg-primary-50 border border-primary-200 rounded-full text-xs font-medium text-primary-700"
                  >
                    {e}
                    <button
                      type="button"
                      onClick={() => toggleCompany(e)}
                      className="w-[14px] h-[14px] rounded-full bg-primary-200 flex items-center justify-center hover:bg-primary-300 transition-colors"
                    >
                      <X size={8} />
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
                      {checked && <Check size={9} className="text-white" />}
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
                  {s === 'Mobile' && <DeviceMobile size={13} />}
                  {s === 'Web' && <Desktop size={13} />}
                  {s === 'Mobile + Web' && <Devices size={13} />}
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
            <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
            <Button
              variant={saved ? 'success' : 'gradient'}
              size="sm"
              onClick={handleSubmit}
              disabled={saved}
            >
              {saved ? (
                <><Check size={13} />{mode === 'invite' ? 'Invitation envoyée !' : 'Enregistré !'}</>
              ) : (
                <>
                  {mode === 'invite'
                    ? <PaperPlaneTilt size={13} weight="fill" />
                    : <Check size={13} weight="bold" />
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
