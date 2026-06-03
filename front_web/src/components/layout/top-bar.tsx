'use client';

import { useState } from 'react';
import { List, MagnifyingGlass, Bell, CaretDown, User, Gear, SignOut, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const NOTIFICATIONS = [
  { id: 1, color: '#10B981', label: 'MIS-2026-0140 livré · SITARAIL', time: '13h47' },
  { id: 2, color: '#F59E0B', label: 'Retard · MIS-2026-0142 · ETA +48h', time: '10h22' },
  { id: 3, color: '#0E86E8', label: 'IA · 3 éléments à valider (R-05)', time: '09h14' },
] as const;

const MENU_ITEMS = [
  { Icon: User, label: 'Mon profil', danger: false },
  { Icon: Gear, label: 'Paramètres', danger: false },
  { Icon: SignOut, label: 'Déconnexion', danger: true },
] as const;

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const closeAll = () => { setShowNotifs(false); setShowUserMenu(false); };

  return (
    <>
      {(showNotifs || showUserMenu) && (
        <div className="fixed inset-0 z-40" onClick={closeAll} />
      )}

      <header className="h-14 bg-white border-b border-[var(--bd-def)] flex items-center justify-between px-4 flex-shrink-0 relative z-50">
        <div className="flex items-center gap-3">
          {/* Toggle sidebar */}
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 border rounded-lg flex items-center justify-center text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
          >
            <List size={18} />
          </button>

          {/* Brand + IA status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-display font-bold text-2xl text-gradient">PortaLis</span>
            <div className="hidden sm:flex items-center gap-1.5 bg-primary/5 border border-primary/40 text-primary rounded-full px-2.5 py-1 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              IA active · 1 en cours
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-[480px] mx-4 hidden md:block">
          <div className="relative">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Rechercher prospects, missions, documents..."
              className="w-full h-9 pl-9 pr-11 bg-[var(--bg-sink)] rounded-full text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] border border-transparent focus:border-[var(--bd-focus)] focus:bg-white focus:outline-none transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--tx-3)] bg-white border border-[var(--bd-def)] rounded px-1.5 py-0.5 font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs(v => !v); setShowUserMenu(false); }}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none">
                3
              </span>
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-[var(--bd-def)] shadow-[var(--sh-xl)] z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bd-def)]">
                  <p className="font-semibold text-sm text-[var(--tx-1)]">Notifications (3)</p>
                  <button onClick={() => setShowNotifs(false)} className="text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors">
                    <X size={14} />
                  </button>
                </div>
                {NOTIFICATIONS.map(n => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-sink)] transition-colors cursor-pointer border-b border-[var(--bd-def)] last:border-0">
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: n.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--tx-1)]">{n.label}</p>
                      <p className="text-xs text-[var(--tx-3)] mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-[var(--bd-def)] mx-1" />

          {/* User menu */}
          <div className="relative border rounded-full">
            <button
              onClick={() => { setShowUserMenu(v => !v); setShowNotifs(false); }}
              className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-lg hover:bg-[var(--bg-sink)] hover:rounded-full transition-colors"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad)' }}>
                <span className="text-white text-xs font-bold">HK</span>
              </div>
              <span className="text-sm font-medium text-[var(--tx-1)] hidden sm:block">Hawa Konaté</span>
              <div className="w-7 h-7 rounded-full bg-[var(--bg-sink)] border border-[var(--bd-def)]] hidden sm:block">
                <span className="text-[10px] font-bold text-[var(--tx-3)]">DG</span>
              </div>
              <CaretDown size={12} className="text-[var(--tx-3)]" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-[var(--bd-def)] shadow-[var(--sh-xl)] z-50 overflow-hidden py-1">
                {MENU_ITEMS.map(({ Icon, label, danger }) => (
                  <button
                    key={label}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-[var(--bg-sink)]',
                      danger ? 'text-error' : 'text-[var(--tx-1)]',
                    )}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}