'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquaresFour, Brain, User, Truck, Funnel,
  Files, FileText, Diamond, ChartLine, DownloadSimple,
  Users, Gear, SignOut,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { ApiUser, User as UserType } from '@/types/user_type';

type NavItem = {
  href: string;
  label: string;
  Icon: React.ElementType;
  customIcon?: React.ReactNode;
  badge?: number;
  badgeDanger?: boolean;
  customBadge?: React.ReactNode;
};

type NavSection = { title: string; items: NavItem[] };

function buildNav(locale: string): NavSection[] {
  return [
    {
      title: 'PRINCIPAL',
      items: [
        { href: `/${locale}/page/dashboard`, label: 'Tableau de bord', Icon: SquaresFour },
        {
          href: `/${locale}/page/ia`, label: 'Centre IA', Icon: Brain, badge: 3,
          customIcon: (
            <span className="flex-shrink-0 w-[18px] h-[18px] rounded-[4px] flex items-center justify-center text-white text-[9px] font-bold leading-none" style={{ background: 'var(--grad)' }}>
              IA
            </span>
          ),
          customBadge: (
            <span
              className="min-w-5 h-7 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: 'var(--grad)' }}
            >
              3
            </span>
          ),
        },
        { href: `/${locale}/page/prospects`, label: 'Prospects', Icon: User, badge: 47 },
        { href: `/${locale}/page/missions`, label: 'Missions', Icon: Truck, badge: 4, badgeDanger: true },
        { href: `/${locale}/page/pipeline`, label: 'Pipeline', Icon: Funnel },
      ],
    },
    {
      title: 'OPÉRATIONS',
      items: [
        { href: `/${locale}/page/documents`, label: 'Documents', Icon: Files },
        { href: `/${locale}/page/comptes-rendus`, label: 'Comptes-rendus', Icon: FileText },
        { href: `/${locale}/page/offres`, label: 'Offres', Icon: Diamond },
      ],
    },
    {
      title: 'RAPPORTS',
      items: [
        { href: `/${locale}/page/analytics`, label: 'Analytics', Icon: ChartLine },
        { href: `/${locale}/page/exports`, label: 'Exports', Icon: DownloadSimple },
      ],
    },
    {
      title: 'ADMIN',
      items: [
        { href: `/${locale}/page/utilisateurs`, label: 'Utilisateurs', Icon: Users },
        { href: `/${locale}/page/parametres`, label: 'Paramètres', Icon: Gear },
      ],
    },
  ];
}

interface SidebarProps {
  locale: string;
  open: boolean;
  onClose: () => void;
  user: UserType | null;
  rawUser: ApiUser | null;
}

export default function Sidebar({ locale, open, onClose, user, rawUser }: SidebarProps) {
  const pathname = usePathname();
  const sections = buildNav(locale);

  // Ferme la sidebar mobile à chaque changement de route
  useEffect(() => {
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const initials = user?.initials ||
    `${rawUser?.first_name?.[0] ?? ''}${rawUser?.last_name?.[0] ?? ''}`.toUpperCase() ||
    '?';
  const fullName = (user?.prenom || user?.nom)
    ? `${user.prenom} ${user.nom}`.trim()
    : rawUser?.email?.split('@')[0] ?? 'Utilisateur';
  const role = user?.role ?? '';

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[59] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'relative flex flex-col flex-shrink-0 overflow-hidden',
          'bg-[var(--bg-surf)] border-r border-[var(--bd-def)]',
          // Mobile : overlay fixe, glissement depuis la gauche
          'fixed inset-y-0 left-0 z-[60] w-72 h-full',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop : in-flow, transition de largeur
          'md:relative md:inset-y-auto md:left-auto md:z-auto md:h-auto',
          'md:translate-x-0 md:transition-[width]',
          open ? 'md:w-60' : 'md:w-16',
        )}
      >
        {/* Barre de couleur gradient gauche */}
        <div
          className="absolute left-0 top-0 h-full w-[3px] z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #0E86E8 0%, #6B35C9 50%, #C2257A 100%)' }}
        />

        {/* En-tête workspace */}
        <div className="border-b border-[var(--bd-def)] px-3 py-2">
          {open ? (
            <div className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors text-left">
              <div className="min-w-0">
                <p className="text-[var(--tx-1)] text-[13px] font-semibold truncate">Group Holding</p>
                <div className="flex items-center gap-1 text-[var(--tx-3)] text-[11px] min-w-0">
                  <span>Sénégal</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://flagcdn.com/16x12/sn.png" width={16} height={12} alt="" className="rounded-[2px] flex-shrink-0" />
                  <span>·</span>
                  <span className="truncate">Côte d&apos;Ivoire</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://flagcdn.com/16x12/ci.png" width={16} height={12} alt="" className="rounded-[2px] flex-shrink-0" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1.5">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: 'var(--grad-subtle)' }}
              >
                <span className="text-[10px] font-bold text-[var(--p500)]">GH</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scrollbar py-3 px-2">
          {sections.map((section, idx) => (
            <div
              key={section.title}
              className={idx > 0 ? 'mt-1 pt-3 border-t border-[var(--bd-def)]' : ''}
            >
              {open && (
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase select-none">
                  {section.title}
                </p>
              )}
              {section.items.map(({ href, label, Icon, customIcon, badge, badgeDanger, customBadge }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    title={!open ? label : undefined}
                    className={cn(
                      'flex items-center rounded-lg transition-colors duration-150 mb-0.5',
                      open ? 'gap-2.5 px-2.5 py-[7px]' : 'justify-center p-[9px]',
                      active
                        ? 'bg-[rgba(14,134,232,0.08)] text-[var(--p500)]'
                        : 'text-[var(--tx-2)] hover:bg-[var(--bg-sink)] hover:text-[var(--tx-1)]',
                    )}
                  >
                    {customIcon ?? <Icon size={17} weight={active ? 'fill' : 'regular'} className="flex-shrink-0" />}
                    {open && (
                      <>
                        <span className="flex-1 text-[13px] font-medium truncate">{label}</span>
                        {badge !== undefined && (
                          <span
                            className={cn(
                              'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                              customBadge
                                ? 'text-white'
                                : badgeDanger
                                  ? 'bg-error text-white'
                                  : 'bg-[rgba(14,134,232,0.1)] text-[var(--p500)]',
                            )}
                          >
                            {customBadge || badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Profil utilisateur */}
        <div className="flex-shrink-0 border-t border-[var(--bd-def)] p-3">
          {open ? (
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--grad)' }}
              >
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--tx-1)] text-[13px] font-medium truncate">{fullName}</p>
                {role && (
                  <p className="text-[var(--tx-3)] text-[11px] truncate">{role}</p>
                )}
              </div>
              <button className="text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors p-1 rounded flex-shrink-0">
                <SignOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--grad)' }}
              >
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
