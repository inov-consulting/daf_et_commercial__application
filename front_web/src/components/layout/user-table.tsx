'use client';

import { useState } from 'react';
import {
  MagnifyingGlass, PencilSimple, PaperPlaneTilt, X,
  DotsThreeVertical, DeviceMobile, Desktop, Devices,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { User, UserStatus, UserRole } from '../../types/user_type';

type FilterTab = UserStatus | 'all';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'pending', label: 'En attente' },
  { key: 'inactive', label: 'Inactifs' },
];

const ROLE_STYLE: Record<UserRole, { bg?: string; cls: string }> = {
  DG: { bg: 'linear-gradient(135deg,#C2257A,#6B35C9)', cls: 'text-white' },
  Commercial: { cls: 'bg-primary-500 text-white' },
  DAF: { cls: 'bg-accent-500 text-white' },
  Opérations: { cls: 'bg-success text-white' },
};

function RoleBadge({ role, pending }: { role: UserRole; pending?: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex items-center px-2.5 py-[3px] rounded-full font-display text-[11px] font-bold bg-warning-50 text-warning-600 border border-warning">
        {role}
      </span>
    );
  }
  const s = ROLE_STYLE[role];
  return (
    <span
      className={cn('inline-flex items-center px-2.5 py-[3px] rounded-full font-display text-[11px] font-bold', s.cls)}
      style={s.bg ? { background: s.bg } : undefined}
    >
      {role}
    </span>
  );
}

interface UserTableProps {
  users: User[];
  selectedUid: string | null;
  onSelectUser: (uid: string) => void;
  onEditUser: (uid: string) => void;
  onResendInvite?: (uid: string) => void;
}

export function UserTable({
  users,
  selectedUid,
  onSelectUser,
  onEditUser,
  onResendInvite,
}: UserTableProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const filtered = users.filter(u => {
    const matchStatus = filter === 'all' || u.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.email.toLowerCase().includes(q) ||
      `${u.prenom} ${u.nom}`.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex-1 bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 w-56 h-9 bg-surface-sink border border-border rounded-lg px-3">
          <MagnifyingGlass size={14} className="text-foreground-3 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-3 outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'h-7 px-3 rounded-full text-xs font-medium border transition-colors',
                filter === tab.key
                  ? 'bg-primary-50 text-primary-600 border-primary-200 font-semibold'
                  : 'bg-surface text-foreground-3 border-border hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="font-mono text-[11px] text-foreground-3">
          {filtered.length} compte{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="h-10 bg-surface-sink border-b border-border">
              {['Utilisateur', 'Rôle', 'Groupes', 'Entreprise', 'Statut', 'Accès', 'Actions'].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 text-[10px] font-display font-bold text-foreground-3 uppercase tracking-[.07em] whitespace-nowrap',
                    i === 6 ? 'text-right' : 'text-left',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr
                key={user.uid}
                onClick={() => onSelectUser(user.uid)}
                className={cn(
                  'h-16 border-b border-surface-sink cursor-pointer transition-colors last:border-0',
                  selectedUid === user.uid
                    ? 'bg-primary-50 shadow-[inset_3px_0_0_var(--p500)]'
                    : 'hover:bg-surface-sink',
                )}
              >
                {/* Utilisateur */}
                <td className="px-4">
                  {user.status === 'pending' ? (
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full border-[1.5px] border-dashed border-border-strong bg-surface-sink flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 20 16" width="16" height="13" fill="none">
                          <rect x="1" y="1" width="18" height="14" rx="2" stroke="#9EB0C4" strokeWidth="1.5" />
                          <path d="M1 4l9 5.5L19 4" stroke="#9EB0C4" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] text-foreground-2 truncate">{user.email}</p>
                        <p className="text-[10px] text-foreground-3 italic">
                          Invitation envoyée le 1 juin 2026
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-white text-[13px] flex-shrink-0"
                        style={{ background: user.bg }}
                      >
                        {user.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-[13px] text-foreground truncate">
                          {user.prenom} {user.nom}
                        </p>
                        <p className="text-[11px] text-foreground-3 truncate">{user.email}</p>
                      </div>
                    </div>
                  )}
                </td>
                {/* Rôle */}
                <td className="px-4">
                  <RoleBadge role={user.role} pending={user.status === 'pending'} />
                </td>
                {/* Groupes */}
                <td className="px-4">
                  {user.groupes.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {user.groupes.slice(0, 2).map(g => (
                        <span
                          key={g}
                          className="px-2 py-[2px] rounded-full text-[11px] font-medium text-foreground-2 bg-surface-sink border border-border"
                        >
                          {g}
                        </span>
                      ))}
                      {user.groupes.length > 2 && (
                        <span className="px-2 py-[2px] rounded-full text-[11px] font-medium text-foreground-3 bg-surface-sink border border-border">
                          +{user.groupes.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-foreground-3">—</span>
                  )}
                </td>
                {/* Entreprise */}
                <td className="px-4">
                  <div className="flex flex-col gap-[3px]">
                    {user.entreprises.slice(0, 2).map(e => (
                      <span
                        key={e}
                        className="font-mono text-[11px] text-foreground-2 bg-surface-sink border border-border px-2 py-[2px] rounded-md whitespace-nowrap inline-block"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </td>
                {/* Statut */}
                <td className="px-4">
                  {user.status === 'active' && (
                    <Badge color="success" variant="subtle" dot>Actif</Badge>
                  )}
                  {user.status === 'pending' && (
                    <Badge color="warning" variant="subtle" dot>En attente</Badge>
                  )}
                  {user.status === 'inactive' && (
                    <Badge color="neutral" variant="subtle" dot>Inactif</Badge>
                  )}
                </td>
                {/* Accès */}
                <td className="px-4">
                  {user.status !== 'pending' ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-foreground-3">
                      {user.surface === 'Mobile' && <DeviceMobile size={13} />}
                      {user.surface === 'Web' && <Desktop size={13} />}
                      {user.surface === 'Mobile + Web' && <Devices size={13} />}
                      {user.surface}
                    </span>
                  ) : (
                    <span className="text-[11px] text-foreground-3">—</span>
                  )}
                </td>
                {/* Actions */}
                <td className="px-4">
                  <div className="flex items-center gap-1 justify-end">
                    {user.status === 'pending' ? (
                      <>
                        <button
                          title="Renvoyer l'invitation"
                          onClick={e => { e.stopPropagation(); onResendInvite?.(user.uid); }}
                          className="w-[30px] h-[30px] rounded-md border border-border bg-surface flex items-center justify-center text-foreground-3 hover:bg-surface-sink hover:text-foreground transition-colors"
                        >
                          <PaperPlaneTilt size={13} weight="fill" />
                        </button>
                        <button
                          title="Révoquer"
                          onClick={e => e.stopPropagation()}
                          className="w-[30px] h-[30px] rounded-md border border-border bg-surface flex items-center justify-center text-foreground-3 hover:bg-error-50 hover:text-error hover:border-error transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          title="Modifier"
                          onClick={e => { e.stopPropagation(); onEditUser(user.uid); }}
                          className="w-[30px] h-[30px] rounded-md border border-border bg-surface flex items-center justify-center text-foreground-3 hover:bg-surface-sink hover:text-foreground transition-colors"
                        >
                          <PencilSimple size={13} />
                        </button>
                        <button
                          title="Plus d'actions"
                          onClick={e => e.stopPropagation()}
                          className="w-[30px] h-[30px] rounded-md border border-border bg-surface flex items-center justify-center text-foreground-3 hover:bg-surface-sink hover:text-foreground transition-colors"
                        >
                          <DotsThreeVertical size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
