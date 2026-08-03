'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MagnifyingGlassIcon, PencilSimpleIcon, PaperPlaneTiltIcon, XIcon,
  DotsThreeVerticalIcon, FunnelIcon, UserSwitchIcon, TrashIcon, ProhibitIcon,
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
  DG: { bg: 'linear-gradient(135deg, #1B6B45, #8B6914)', cls: 'text-white' },
  Commercial: { cls: 'bg-primary-500 text-white' },
  DAF: { cls: 'bg-accent-500 text-white' },
  Opérations: { cls: 'bg-success text-white' },
};

function RoleBadge({ role, pending }: { role: UserRole; pending?: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex items-center px-2 py-[2px] sm:px-2.5 sm:py-[3px] rounded-full font-display text-[10px] sm:text-[11px] font-bold bg-warning-50 text-warning-600 border border-warning whitespace-nowrap">
        {role}
      </span>
    );
  }
  const s = ROLE_STYLE[role];
  return (
    <span
      className={cn('inline-flex items-center px-2 py-[2px] sm:px-2.5 sm:py-[3px] rounded-full font-display text-[10px] sm:text-[11px] font-bold whitespace-nowrap', s.cls)}
      style={s.bg ? { background: s.bg } : undefined}
    >
      {role}
    </span>
  );
}

/* ── Menu contextuel ─────────────────────────────────────────────── */
interface ContextMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  onEditUser: () => void;
  onDeleteUser: () => void;
  onToggleActiveUser: () => void;
  user: User;
}

function ContextMenu({ isOpen, position, onClose, onEditUser, onDeleteUser, onToggleActiveUser, user }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Ajuster la position pour rester dans le viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menuEl = menuRef.current;
    const { width, height } = menuEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    let top = position.top;
    let left = position.left;

    // Ajustement horizontal
    if (left + width > viewportWidth - margin) {
      left = Math.max(margin, viewportWidth - width - margin);
    }
    if (left < margin) {
      left = margin;
    }

    // Ajustement vertical
    if (top + height > viewportHeight - margin) {
      // Essayer d'afficher au-dessus
      if (position.top - height - 4 > margin) {
        top = position.top - height - 4;
      } else {
        top = Math.max(margin, viewportHeight - height - margin);
      }
    }
    if (top < margin) {
      top = margin;
    }

    setAdjustedPosition({ top, left });
  }, [isOpen, position]);

  // Gestion du clic extérieur et Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Ajout d'un délai pour éviter la fermeture immédiate
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[300] bg-white border border-border rounded-xl shadow-lg py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
      style={{ top: adjustedPosition.top, left: adjustedPosition.left }}
    >
      <button
        onClick={() => { onEditUser(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-surface-sink transition-colors"
      >
        <PencilSimpleIcon size={14} />
        Modifier
      </button>

      <button
        onClick={() => { onToggleActiveUser(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-surface-sink transition-colors"
      >
        {user.status === 'active' ? (
          <>
            <ProhibitIcon size={14} />
            Désactiver le compte
          </>
        ) : (
          <>
            <UserSwitchIcon size={14} />
            Activer le compte
          </>
        )}
      </button>

      <div className="h-px bg-border my-1" />

      <button
        onClick={() => { onDeleteUser(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-error hover:bg-error-50 transition-colors"
      >
        <TrashIcon size={14} />
        Supprimer
      </button>
    </div>
  );
}

/* ── Mobile User Card ─────────────────────────────────────────────── */
function MobileUserCard({
  user,
  isSelected,
  onSelect,
  onEditUser,
  onDeleteUser,
  onToggleActiveUser,
  onResendInvite,
}: {
  user: User;
  isSelected: boolean;
  onSelect: (uid: string) => void;
  onEditUser: (uid: string) => void;
  onDeleteUser: (uid: string) => void;
  onToggleActiveUser: (uid: string, active: boolean) => void;
  onResendInvite?: (uid: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 180,
      });
    }
    setMenuOpen(true);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(user.uid)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(user.uid); }}
      className={cn(
        'p-3 border-b border-border cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary-50 border-l-[3px] border-l-[var(--p500)]'
          : 'hover:bg-surface-sink border-l-[3px] border-l-transparent',
      )}
    >
      {/* Header : Avatar + Name + Status */}
      <div className="flex items-center gap-2.5 mb-2">
        {user.status === 'pending' ? (
          <div className="w-9 h-9 rounded-full border-[1.5px] border-dashed border-border-strong bg-surface-sink flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 16" width="16" height="13" fill="none">
              <rect x="1" y="1" width="18" height="14" rx="2" stroke="#9EB0C4" strokeWidth="1.5" />
              <path d="M1 4l9 5.5L19 4" stroke="#9EB0C4" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-white text-[13px] flex-shrink-0 overflow-hidden"
            style={{ background: user.avatar ? undefined : user.bg }}
          >
            {user.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={user.avatar} alt={user.initials} className="w-full h-full object-cover" />
              : user.initials
            }
          </div>
        )}
        <div className="flex-1 min-w-0">
          {user.status === 'pending' ? (
            <p className="text-[13px] text-foreground-2 truncate">{user.email}</p>
          ) : (
            <>
              <p className="font-display font-semibold text-[13px] text-foreground truncate">
                {user.prenom} {user.nom}
              </p>
              <p className="text-[11px] text-foreground-3 truncate">{user.email}</p>
            </>
          )}
        </div>
        <div className="flex-shrink-0">
          {user.status === 'active' && <Badge color="success" variant="subtle" dot>Actif</Badge>}
          {user.status === 'pending' && <Badge color="warning" variant="subtle" dot>En attente</Badge>}
          {user.status === 'inactive' && <Badge color="neutral" variant="subtle" dot>Inactif</Badge>}
        </div>
      </div>

      {/* Details row */}
      <div className="flex flex-col gap-2 text-[11px] mb-2">
        <div>
          <span className="text-foreground-3">Rôle</span>
          <div className="mt-0.5">
            <RoleBadge role={user.role} pending={user.status === 'pending'} />
          </div>
        </div>
        {user.entreprises.length > 0 && (
          <div>
            <span className="text-foreground-3">Entreprise</span>
            <div className="mt-0.5 flex items-center gap-1 flex-nowrap">
              <span
                title={user.entreprises[0]}
                className="font-mono inline-flex items-center pl-1.5 pr-2 py-[3px] rounded-md text-[10px] max-w-[120px]"
                style={{ background: 'rgba(14,134,232,.06)', color: '#085499' }}
              >
                <span className="truncate">{user.entreprises[0]}</span>
              </span>
              {user.entreprises.length > 1 && (
                <span
                  title={user.entreprises.slice(1).join(', ')}
                  className="inline-flex items-center justify-center h-4 min-w-[18px] px-1 rounded-full text-[9px] font-bold flex-shrink-0"
                  style={{ background: 'rgba(14,134,232,.06)', color: '#085499', border: '1px solid rgba(14,134,232,.15)' }}
                >
                  +{user.entreprises.length - 1}
                </span>
              )}
            </div>
          </div>
        )}
        {user.groupes.length > 0 && (
          <div>
            <span className="text-foreground-3">Groupes</span>
            <div className="mt-0.5 flex items-center gap-1 flex-nowrap">
              <span
                title={user.groupes[0].name}
                className="inline-flex items-center gap-1 pl-1.5 pr-2 py-[3px] rounded-md text-[10px] font-medium max-w-[120px]"
                style={{ background: 'rgba(71,85,105,.07)', color: '#475569' }}
              >
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#94A3B8' }} />
                <span className="truncate">{user.groupes[0].name}</span>
              </span>
              {user.groupes.length > 1 && (
                <span
                  title={user.groupes.slice(1).map(g => g.name).join(', ')}
                  className="inline-flex items-center justify-center h-4 min-w-[18px] px-1 rounded-full text-[9px] font-bold flex-shrink-0"
                  style={{ background: 'rgba(71,85,105,.07)', color: '#6B7280', border: '1px solid rgba(71,85,105,.15)' }}
                >
                  +{user.groupes.length - 1}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 justify-end border-t border-border pt-2">
        {user.status === 'pending' ? (
          <>
            <button
              onClick={e => { e.stopPropagation(); onResendInvite?.(user.uid); }}
              className="h-8 px-2.5 rounded-md border border-border bg-surface flex items-center gap-1 text-[11px] text-foreground-3 hover:bg-surface-sink hover:text-foreground transition-colors"
            >
              <PaperPlaneTiltIcon size={13} weight="fill" />
              Renvoyer
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDeleteUser(user.uid); }}
              className="w-8 h-8 rounded-md border border-border bg-surface flex items-center justify-center text-foreground-3 hover:bg-error-50 hover:text-error hover:border-error transition-colors"
            >
              <XIcon size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={e => { e.stopPropagation(); onEditUser(user.uid); }}
              className="h-8 px-2.5 rounded-md border border-border bg-surface flex items-center gap-1 text-[11px] text-foreground-3 hover:bg-surface-sink hover:text-foreground transition-colors"
            >
              <PencilSimpleIcon size={13} />
              Modifier
            </button>
            <button
              ref={buttonRef}
              onClick={handleOpenMenu}
              className="w-8 h-8 rounded-md border border-border bg-surface flex items-center justify-center text-foreground-3 hover:bg-surface-sink hover:text-foreground transition-colors"
            >
              <DotsThreeVerticalIcon size={13} />
            </button>
          </>
        )}
      </div>

      {/* Menu contextuel mobile */}
      <ContextMenu
        isOpen={menuOpen}
        position={menuPosition}
        onClose={() => setMenuOpen(false)}
        onEditUser={() => onEditUser(user.uid)}
        onDeleteUser={() => onDeleteUser(user.uid)}
        onToggleActiveUser={() => onToggleActiveUser(user.uid, user.status !== 'active')}
        user={user}
      />
    </div>
  );
}

/* ── Tableau principal ────────────────────────────────────────────── */

interface UserTableProps {
  users: User[];
  selectedUid: string | null;
  onSelectUser: (uid: string) => void;
  onEditUser: (uid: string) => void;
  onDeleteUser: (uid: string) => void;
  onToggleActiveUser: (uid: string, active: boolean) => void;
  onResendInvite?: (uid: string) => void;
}

export function UserTable({
  users,
  selectedUid,
  onSelectUser,
  onEditUser,
  onDeleteUser,
  onToggleActiveUser,
  onResendInvite,
}: UserTableProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    uid: string;
    position: { top: number; left: number };
  } | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuButtonRef = useRef<HTMLButtonElement | null>(null);

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

  // Fermer le menu contextuel lors du scroll
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setContextMenu(null);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Recalculer la position lors du scroll
  useEffect(() => {
    if (!contextMenu || !contextMenuButtonRef.current) return;

    const updatePosition = () => {
      const button = contextMenuButtonRef.current;
      if (button) {
        const rect = button.getBoundingClientRect();
        setContextMenu(prev => prev ? {
          ...prev,
          position: {
            top: rect.bottom + 4,
            left: rect.right - 180,
          },
        } : null);
      }
    };

    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updatePosition, { passive: true });
      return () => container.removeEventListener('scroll', updatePosition);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    const button = e.currentTarget as HTMLElement;
    contextMenuButtonRef.current = button as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    setContextMenu({
      uid,
      position: {
        top: rect.bottom + 4,
        left: rect.right - 180,
      },
    });
  };

  const currentContextUser = contextMenu
    ? users.find(u => u.uid === contextMenu.uid)
    : null;

  return (
    <div className="w-full min-w-0 bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 sm:w-56 h-9 bg-surface-sink border border-border rounded-lg px-3 relative">
            <MagnifyingGlassIcon size={14} className="text-foreground-3 flex-shrink-0" />

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-3 outline-none min-w-0"
            />

            {search && (
              <button
                onClick={() => setSearch('')}
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-foreground-3 hover:text-foreground hover:bg-surface-sink transition-colors"
                title="Effacer la recherche"
              >
                <XIcon size={11} weight="bold" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden w-9 h-9 rounded-lg border border-border flex items-center justify-center text-foreground-3 hover:bg-surface-sink transition-colors flex-shrink-0"
          >
            <FunnelIcon size={15} weight={showFilters ? 'fill' : 'regular'} />
          </button>
        </div>

        {/* Filtres : toujours visible sur desktop, toggle sur mobile */}
        <div className={cn(
          'flex gap-1.5 flex-wrap',
          'sm:flex',
          showFilters ? 'flex' : 'hidden',
        )}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'h-7 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-medium border transition-colors whitespace-nowrap',
                filter === tab.key
                  ? 'bg-primary-50 text-primary-600 border-primary-200 font-semibold'
                  : 'bg-surface text-foreground-3 border-border hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex flex-1" />
        <span className="font-mono text-[10px] sm:text-[11px] text-foreground-3 text-right sm:text-left">
          {filtered.length} compte{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Vue Desktop : Tableau */}
      <div ref={tableContainerRef} className="hidden md:block overflow-auto relative">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="h-10 bg-surface-sink border-b border-border">
              {['Utilisateur', 'Rôle', 'Groupes', 'Entreprise', 'Statut', 'Actions'].map((h, i) => (
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
                tabIndex={0}
                onClick={() => onSelectUser(user.uid)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelectUser(user.uid); }}
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
                    <div className="flex items-center gap-1 flex-nowrap">
                      <span
                        title={user.groupes[0].name}
                        className="inline-flex items-center gap-1 pl-1.5 pr-2 py-[3px] rounded-md text-[11px] font-medium max-w-[120px]"
                        style={{ background: 'rgba(71,85,105,.07)', color: '#475569' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#94A3B8' }} />
                        <span className="truncate">{user.groupes[0].name}</span>
                      </span>
                      {user.groupes.length > 1 && (
                        <span
                          title={user.groupes.slice(1).map(g => g.name).join(', ')}
                          className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[9px] font-bold flex-shrink-0"
                          style={{ background: 'rgba(71,85,105,.07)', color: '#6B7280', border: '1px solid rgba(71,85,105,.15)' }}
                        >
                          +{user.groupes.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[12px] text-foreground-3">—</span>
                  )}
                </td>
                {/* Entreprise */}
                <td className="px-4">
                  {user.entreprises.length > 0 ? (
                    <div className="flex items-center gap-1 flex-nowrap">
                      <span
                        title={user.entreprises[0]}
                        className="font-mono inline-flex items-center pl-1.5 pr-2 py-[3px] rounded-md text-[11px] max-w-[120px]"
                        style={{ background: 'rgba(14,134,232,.06)', color: '#085499' }}
                      >
                        <span className="truncate">{user.entreprises[0]}</span>
                      </span>
                      {user.entreprises.length > 1 && (
                        <span
                          title={user.entreprises.slice(1).join(', ')}
                          className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[9px] font-bold flex-shrink-0"
                          style={{ background: 'rgba(14,134,232,.06)', color: '#085499', border: '1px solid rgba(14,134,232,.15)' }}
                        >
                          +{user.entreprises.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[12px] text-foreground-3">—</span>
                  )}
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
                          <PaperPlaneTiltIcon size={13} weight="fill" />
                        </button>
                        <button
                          title="Révoquer"
                          onClick={e => { e.stopPropagation(); onDeleteUser(user.uid); }}
                          className="w-[30px] h-[30px] rounded-md border border-border bg-surface flex items-center justify-center text-foreground-3 hover:bg-error-50 hover:text-error hover:border-error transition-colors"
                        >
                          <XIcon size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          title="Modifier"
                          onClick={e => { e.stopPropagation(); onEditUser(user.uid); }}
                          className="w-[30px] h-[30px] rounded-md border border-border bg-surface flex items-center justify-center text-foreground-3 hover:bg-surface-sink hover:text-foreground transition-colors"
                        >
                          <PencilSimpleIcon size={13} />
                        </button>
                        <button
                          title="Plus d'actions"
                          onClick={e => handleContextMenu(e, user.uid)}
                          className="w-[30px] h-[30px] rounded-md border border-border bg-surface flex items-center justify-center text-foreground-3 hover:bg-surface-sink hover:text-foreground transition-colors"
                        >
                          <DotsThreeVerticalIcon size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Menu contextuel desktop - suit le scroll */}
        {contextMenu && currentContextUser && (
          <ContextMenu
            isOpen={true}
            position={contextMenu.position}
            onClose={() => {
              setContextMenu(null);
              contextMenuButtonRef.current = null;
            }}
            onEditUser={() => onEditUser(currentContextUser.uid)}
            onDeleteUser={() => onDeleteUser(currentContextUser.uid)}
            onToggleActiveUser={() => onToggleActiveUser(currentContextUser.uid, currentContextUser.status !== 'active')}
            user={currentContextUser}
          />
        )}
      </div>

      {/* Vue Mobile/Tablette : Cards */}
      <div className="md:hidden overflow-auto max-h-[calc(100vh-300px)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-foreground-3">
            <MagnifyingGlassIcon size={32} className="mb-3 opacity-50" />
            <p className="text-sm">Aucun utilisateur trouvé</p>
            <p className="text-xs mt-1">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          filtered.map(user => (
            <MobileUserCard
              key={user.uid}
              user={user}
              isSelected={selectedUid === user.uid}
              onSelect={onSelectUser}
              onEditUser={onEditUser}
              onDeleteUser={onDeleteUser}
              onToggleActiveUser={onToggleActiveUser}
              onResendInvite={onResendInvite}
            />
          ))
        )}
      </div>

      {/* Empty state desktop */}
      {filtered.length === 0 && (
        <div className="hidden md:flex flex-col items-center justify-center py-12 text-foreground-3">
          <MagnifyingGlassIcon size={32} className="mb-3 opacity-50" />
          <p className="text-sm">Aucun utilisateur trouvé</p>
          <p className="text-xs mt-1">Essayez de modifier vos filtres</p>
        </div>
      )}
    </div>
  );
}