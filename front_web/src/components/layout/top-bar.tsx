'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ListIcon, MagnifyingGlassIcon, BellIcon, CaretDownIcon, UserIcon, GearIcon, SignOutIcon, XIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { logoutKeycloak } from '@/lib/keycloak';
import type { ApiUser, User } from '@/types/user_type';
import { getRoleAbbreviation } from '@/lib/roleAbbreviation';
import Image from 'next/image';
import { useAppSelector } from '@/redux/store';
import { NotificationsDrawer } from '@/components/layout/notifications-drawer';

const MENU_ITEMS = [
  { Icon: UserIcon, label: 'Mon profil', danger: false },
  { Icon: GearIcon, label: 'Paramètres', danger: false },
  { Icon: SignOutIcon, label: 'Déconnexion', danger: true },
] as const;

interface DropdownPos { top: number; right: number }

interface TopBarProps {
  onToggleSidebar: () => void;
  user: User | null;
  rawUser: ApiUser | null;
}

export default function TopBar({ onToggleSidebar, user, rawUser }: TopBarProps) {
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showUserMenu, setShowUserMenu]       = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [menuPos, setMenuPos]   = useState<DropdownPos>({ top: 0, right: 0 });
  const [mounted, setMounted]   = useState(false);

  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const unreadCount = useAppSelector(s => s.notifications.unreadCount);

  useEffect(() => { setMounted(true); }, []);

  const closeAll = useCallback(() => {
    setShowUserMenu(false);
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    const update = () => {
      if (showUserMenu && menuBtnRef.current) {
        const r = menuBtnRef.current.getBoundingClientRect();
        setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
      }
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [showUserMenu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { closeAll(); setShowNotifDrawer(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeAll]);

  const handleMenuToggle = (e: React.PointerEvent) => {
    e.preventDefault();
    if (menuBtnRef.current) {
      const r = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setShowUserMenu(v => !v);
  };

  const initials = user?.initials ||
    `${rawUser?.first_name?.[0] ?? ''}${rawUser?.last_name?.[0] ?? ''}`.toUpperCase() ||
    '?';
  const fullName = (user?.prenom || user?.nom)
    ? `${user.prenom} ${user.nom}`.trim()
    : rawUser?.email?.split('@')[0] ?? 'Utilisateur';
  const roleAbbr = getRoleAbbreviation(user?.role);

  return (
    <>
      {/* Backdrop menu utilisateur */}
      {mounted && showUserMenu && createPortal(
        <div className="fixed inset-0 z-[198]" onClick={closeAll} aria-hidden="true" />,
        document.body,
      )}

      {/* Dropdown Menu utilisateur */}
      {mounted && showUserMenu && createPortal(
        <div
          className="fixed z-[199] w-48 bg-white rounded-xl border border-[var(--bd-def)] shadow-[var(--sh-xl)] overflow-hidden py-1"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <div className="sm:hidden px-3.5 py-2.5 border-b border-[var(--bd-def)]">
            <p className="text-sm font-medium text-[var(--tx-1)] truncate">{fullName}</p>
            {user?.role && (
              <p className="text-xs text-[var(--tx-3)] mt-0.5">{user.role}</p>
            )}
          </div>
          {MENU_ITEMS.map(({ Icon, label, danger }) => (
            <button
              key={label}
              onClick={label === 'Déconnexion' ? () => logoutKeycloak() : undefined}
              className={cn(
                'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-[var(--bg-sink)]',
                danger ? 'text-error' : 'text-[var(--tx-1)]',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {/* Notifications drawer (via portal) */}
      {mounted && createPortal(
        <NotificationsDrawer
          isOpen={showNotifDrawer}
          onClose={() => setShowNotifDrawer(false)}
        />,
        document.body,
      )}

      <header className="bg-white border-b border-[var(--bd-def)] flex flex-col flex-shrink-0 relative z-50">
        <div className="flex items-center justify-between px-3 sm:px-4 h-14">

          {/* Gauche : toggle + brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="w-8 h-8 border rounded-lg flex items-center justify-center text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
              aria-label="Ouvrir/fermer le menu"
            >
              <ListIcon size={18} />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <Image
                src="/assets/images/Logo_Inov_C.png"
                alt="Portalis"
                width={400}
                height={200}
                unoptimized
                priority
                style={{ height: '50px', width: 'auto' }}
                className="flex-shrink-0"
              />
              <div className="hidden sm:flex items-center gap-1.5 bg-primary/5 border border-primary/40 text-primary rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                <span className="hidden lg:inline">IA active · 1 en cours</span>
                <span className="lg:hidden">IA</span>
              </div>
            </div>
          </div>

          {/* Centre : barre de recherche (desktop) */}
          <div className="flex-1 max-w-[320px] lg:max-w-[480px] mx-4 hidden md:block">
            <div className="relative">
              <MagnifyingGlassIcon
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Rechercher prospects, missions, documents..."
                className="w-full h-9 pl-9 pr-11 bg-[var(--bg-sink)] rounded-full text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] border border-transparent focus:border-[var(--bd-focus)] focus:bg-white focus:outline-none transition-all"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--tx-3)] bg-white border border-[var(--bd-def)] rounded px-1.5 py-0.5 font-mono hidden lg:block">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Droite : actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">

            {/* Bouton recherche mobile */}
            <button
              onClick={() => setShowMobileSearch(v => !v)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
              aria-label="Rechercher"
            >
              {showMobileSearch ? <XIcon size={18} /> : <MagnifyingGlassIcon size={18} />}
            </button>

            {/* Bouton notifications → ouvre le drawer */}
            <button
              onClick={() => { setShowNotifDrawer(v => !v); setShowUserMenu(false); }}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
              aria-label="Notifications"
            >
              <BellIcon size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-error rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Séparateur */}
            <div className="w-px h-6 bg-[var(--bd-def)] mx-0.5 sm:mx-1 hidden sm:block" />

            {/* Bouton utilisateur */}
            <button
              ref={menuBtnRef}
              onPointerDown={handleMenuToggle}
              className="flex items-center gap-1.5 sm:gap-2 h-9 pl-1 pr-2 sm:pr-2.5 rounded-lg hover:bg-[var(--bg-sink)] transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--grad)' }}
              >
                <span className="text-white text-[10px] sm:text-xs font-bold">{initials}</span>
              </div>
              <span className="text-sm font-medium text-[var(--tx-1)] hidden sm:block max-w-[80px] md:max-w-[120px] truncate">
                {fullName}
              </span>
              {roleAbbr && (
                <div className="w-7 h-7 rounded-full bg-[var(--bg-sink)] border border-[var(--bd-def)] hidden sm:flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-[var(--tx-3)]">{roleAbbr}</span>
                </div>
              )}
              <CaretDownIcon size={12} className="text-[var(--tx-3)] hidden sm:block" />
            </button>
          </div>
        </div>

        {/* Barre de recherche mobile dépliable */}
        {showMobileSearch && (
          <div className="md:hidden px-3 pb-3 bg-white border-t border-[var(--bd-def)]">
            <div className="relative mt-2">
              <MagnifyingGlassIcon
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
              />
              <input
                autoFocus
                type="text"
                placeholder="Rechercher..."
                className="w-full h-9 pl-9 pr-4 bg-[var(--bg-sink)] rounded-full text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] border border-transparent focus:border-[var(--bd-focus)] focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>
        )}
      </header>
    </>
  );
}
