'use client';

import { useState, useEffect } from 'react';
import {
  PencilSimpleIcon, ToggleLeftIcon, ToggleRightIcon, LockKeyIcon, TrashIcon,
  PaperPlaneTiltIcon, XCircleIcon, CheckIcon, EnvelopeSimpleIcon, CursorClickIcon,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import type { User } from '../../types/user_type';

type PanelMode = 'info' | 'disable' | 'disabled' | 'reset';

interface UserDetailPanelProps {
  user: User | null;
  onEdit: (uid: string) => void;
  onDelete: (uid: string) => void;
  onToggleActive?: (uid: string, active: boolean) => void;
  naked?: boolean;
  isSelf?: boolean;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-display font-bold uppercase tracking-[.08em] text-foreground-3 mb-2">
      {children}
    </p>
  );
}

function InfoRow({
  label, value, mono, warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs mb-1.5 last:mb-0">
      <span className="text-foreground-3 font-medium flex-shrink-0">{label}</span>
      <span className={cn(
        'text-right truncate',
        mono ? 'font-mono text-[11px] text-foreground-2' : 'font-semibold text-foreground',
        warn && 'text-warning-600',
      )}>
        {value}
      </span>
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  const map: Record<string, string> = {
    Commercial: 'bg-primary-500',
    DAF: 'bg-accent-500',
    Opérations: 'bg-success',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-[3px] rounded-full font-display text-[11px] font-bold text-white',
        map[role] ?? '',
      )}
      style={role === 'DG' ? { background: 'linear-gradient(135deg, #1B6B45, #8B6914)' } : undefined}
    >
      {role}
    </span>
  );
}

function PendingDetail({ user }: { user: User }) {
  const [sent, setSent] = useState(false);

  return (
    <>
      <div
        className="px-5 py-6 flex flex-col items-center text-center flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,rgba(245,158,11,.06) 0%,transparent 100%)' }}
      >
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-warning bg-warning-50 flex items-center justify-center text-warning mb-3">
          <EnvelopeSimpleIcon size={22} />
        </div>
        <p className="font-mono text-sm font-semibold text-foreground mb-0.5 truncate w-full">
          {user.email}
        </p>
        <p className="text-[11px] text-foreground-3 mb-3">Invitation · Expire le 7 juin</p>
        <Badge color="warning" variant="subtle" dot>En attente de confirmation</Badge>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scrollbar p-5 space-y-4">
        <div>
          <SectionTitle>Invitation</SectionTitle>
          <InfoRow label="Email" value={user.email} mono />
          <InfoRow label="Rôle invité" value={user.role} />
          <InfoRow label="Entreprise" value={user.entreprises[0] ?? '—'} />
        </div>
        <hr className="border-border" />
        <div>
          <SectionTitle>Statut de l&apos;envoi</SectionTitle>
          <InfoRow label="Date d'envoi" value={user.invitedAt ?? '—'} mono />
          <InfoRow label="Expiration" value={user.inviteExpires ?? '—'} mono warn />
          <InfoRow label="Tentatives" value="1 envoi" />
        </div>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-border space-y-2">
        <Button
          variant="gradient"
          size="sm"
          className="w-full"
          onClick={() => setSent(true)}
          disabled={sent}
        >
          {sent ? (
            <><CheckIcon size={14} weight="bold" />Invitation renvoyée</>
          ) : (
            <><PaperPlaneTiltIcon size={14} weight="fill" />Renvoyer l&apos;invitation</>
          )}
        </Button>
        <Button variant="danger" size="sm" className="w-full">
          <XCircleIcon size={14} />
          Révoquer l&apos;invitation
        </Button>
      </div>
    </>
  );
}

function ActiveDetail({
  user, onEdit, onDelete, onToggleActive, isSelf,
}: {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive?: (active: boolean) => void;
  isSelf?: boolean;
}) {
  const [mode, setMode] = useState<PanelMode>(() => user.status === 'inactive' ? 'disabled' : 'info');
  const [resetSent, setResetSent] = useState(false);

  // Sync panel mode when switching to a different user or when status changes via API
  useEffect(() => {
    setMode(user.status === 'inactive' ? 'disabled' : 'info');
    setResetSent(false);
  }, [user.uid, user.status]);

  const isDisabled = mode === 'disabled';

  return (
    <>
      {/* Head */}
      <div
        className="px-5 py-5 flex flex-col items-center text-center flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,rgba(27,107,69,.04) 0%,transparent 100%)' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center font-display font-bold text-white text-xl mb-2.5 shadow-[0_2px_12px_rgba(27,107,69,.28)]"
          style={{ background: user.bg }}
        >
          {user.initials}
        </div>
        <p className="font-display font-bold text-base text-foreground mb-0.5">
          {user.prenom} {user.nom}
        </p>
        <p className="text-xs text-foreground-3 mb-3">{user.email}</p>
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <RolePill role={user.role} />
          {isDisabled
            ? <Badge color="neutral" variant="subtle" dot>Inactif</Badge>
            : <Badge color="success" variant="subtle" dot>Actif</Badge>
          }
        </div>
      </div>


      {/* Body */}
      <div className="flex-1 overflow-y-auto sidebar-scrollbar">
        <div className="p-5 space-y-4">
          <div>
            <SectionTitle>Identité</SectionTitle>
            <InfoRow label="Nom" value={user.nom} />
            <InfoRow label="Prénom" value={user.prenom} />
            <InfoRow label="Email" value={user.email} mono />
          </div>
          <hr className="border-border" />
          <div>
            <SectionTitle>Entreprises</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {user.entreprises.map(e => (
                <span
                  key={e}
                  className="px-2 py-[3px] rounded-full text-[11px] font-medium bg-primary-50 text-primary-700 border border-primary-200"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionTitle>Groupes</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {user.groupes.map(g => (
                <span
                  key={g.id}
                  className="px-2 py-[3px] rounded-full text-[11px] font-medium bg-surface-sink border border-border text-foreground-2"
                >
                  {g.name}
                </span>
              ))}
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <SectionTitle>Accès &amp; Activité</SectionTitle>
            {user.lastLogin && <InfoRow label="Dernière connexion" value={user.lastLogin} mono />}
            {user.created && <InfoRow label="Compte créé le" value={user.created} mono />}
          </div>

          {/* Inline states */}
          {mode === 'disable' && (
            <div className="rounded-xl bg-warning-50 border border-[#FDE68A] p-3">
              <p className="text-[12px] font-display font-bold text-foreground mb-1">
                Désactiver {user.prenom} {user.nom} ?
              </p>
              <p className="text-[11px] text-foreground-3 mb-3">
                Il/Elle perdra l&apos;accès à PortaLis immédiatement.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('info')}
                  className="flex-1 h-7 rounded-md border border-border bg-surface text-[11px] font-semibold text-foreground-2 hover:bg-surface-sink transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => { setMode('disabled'); onToggleActive?.(false); }}
                  className="flex-1 h-7 rounded-md border border-warning bg-warning-50 text-[11px] font-semibold text-warning-600 hover:bg-[#FEF3C7] transition-colors"
                >
                  Désactiver
                </button>
              </div>
            </div>
          )}

          {mode === 'disabled' && (
            <div className="rounded-xl bg-success-50 border border-[#A7F3D0] p-3">
              <p className="text-[12px] font-display font-bold text-foreground mb-1">
                Compte désactivé
              </p>
              <p className="text-[11px] text-foreground-3 mb-2">
                {user.prenom} n&apos;a plus accès à PortaLis.
              </p>
              <button
                onClick={() => { setMode('info'); onToggleActive?.(true); }}
                className="flex items-center gap-1 text-[11px] font-semibold text-success hover:underline"
              >
                <ToggleRightIcon size={12} />
                Réactiver le compte
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div className="rounded-xl bg-success-50 border border-[#A7F3D0] p-3">
              <div className="flex items-start gap-2">
                <CheckIcon size={13} className="text-success mt-0.5 flex-shrink-0" weight="bold" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-display font-bold text-foreground mb-0.5">
                    Email de réinitialisation envoyé
                  </p>
                  <p className="text-[11px] text-foreground-3 mb-2">
                    {user.email} · Lien valable 24h
                  </p>
                  <button
                    onClick={() => setResetSent(true)}
                    disabled={resetSent}
                    className="text-[11px] font-semibold text-success hover:underline disabled:opacity-50"
                  >
                    {resetSent ? 'Renvoyé ✓' : 'Renvoyer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions footer */}
      <div className="flex-shrink-0 p-4 border-t border-border space-y-2">
        <Button variant="gradient" size="sm" className="w-full" onClick={onEdit}>
          <PencilSimpleIcon size={14} />
          Modifier les informations
        </Button>

        {!isSelf && mode !== 'disabled' && (
          <button
            onClick={() => setMode('disable')}
            className="w-full h-[34px] rounded-lg border border-warning bg-surface text-[12px] font-display font-semibold text-warning-600 flex items-center justify-center gap-1.5 hover:bg-warning-50 transition-colors"
          >
            <ToggleLeftIcon size={14} />
            Désactiver le compte
          </button>
        )}

        <button
          onClick={() => { setMode('reset'); setResetSent(false); }}
          className="w-full h-[34px] rounded-lg border border-border bg-surface text-[12px] font-display font-semibold text-foreground-2 flex items-center justify-center gap-1.5 hover:bg-surface-sink transition-colors"
        >
          <LockKeyIcon size={14} />
          Réinitialiser le mot de passe
        </button>

        {!isSelf && (
          <button
            onClick={onDelete}
            className="w-full h-[34px] rounded-lg border border-error bg-surface text-[12px] font-display font-semibold text-error flex items-center justify-center gap-1.5 hover:bg-error-50 transition-colors"
          >
            <TrashIcon size={14} />
            Supprimer l&apos;utilisateur
          </button>
        )}
      </div>
    </>
  );
}

export function UserDetailPanel({ user, onEdit, onDelete, onToggleActive, naked, isSelf }: UserDetailPanelProps) {
  return (
    <div className={cn(
      'flex flex-col overflow-hidden',
      naked
        ? 'w-full'
        : 'flex-shrink-0 bg-surface rounded-2xl border border-border shadow-xs',
    )}>
      {!user ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<CursorClickIcon size={24} />}
            title="Sélectionnez un utilisateur"
            description="Cliquez sur une ligne pour afficher la fiche détaillée"
          />
        </div>
      ) : user.status === 'pending' ? (
        <PendingDetail user={user} />
      ) : (
        <ActiveDetail
          user={user}
          onEdit={() => onEdit(user.uid)}
          onDelete={() => onDelete(user.uid)}
          onToggleActive={(active) => onToggleActive?.(user.uid, active)}
          isSelf={isSelf}
        />
      )}
    </div>
  );
}
