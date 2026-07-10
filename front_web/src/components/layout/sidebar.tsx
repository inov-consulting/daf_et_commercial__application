'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/redux/store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutKeycloak } from '@/lib/keycloak';
import {
  SquaresFourIcon, BrainIcon, UserIcon, TruckIcon, FunnelIcon,
  FilesIcon, FileTextIcon, DiamondIcon, ChartLineIcon, DownloadSimpleIcon,
  UsersIcon, GearIcon, SignOutIcon, XIcon, ClockCounterClockwiseIcon,
  FolderOpenIcon, BankIcon, CurrencyCircleDollarIcon, ReceiptIcon,
  BellIcon, ChartBarIcon, WalletIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { ApiUser, User as UserType } from '@/types/user_type';
import { getRoleAbbreviation } from '@/lib/roleAbbreviation';
import Image from 'next/image';

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

function buildNav(locale: string, prospectCount?: number): NavSection[] {
  return [
    {
      title: 'PRINCIPAL',
      items: [
        { href: `/${locale}/page/dashboard`, label: 'Tableau de bord', Icon: SquaresFourIcon },
        {
          href: `/${locale}/page/ia`, label: 'Centre IA', Icon: BrainIcon, badge: 3,
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
        { href: `/${locale}/page/prospects`, label: 'Prospections', Icon: UserIcon, badge: prospectCount },
      ],
    },
    {
      title: 'OPÉRATIONS',
      items: [
        { href: `/${locale}/page/documents`, label: 'Documents', Icon: FilesIcon },
        { href: `/${locale}/page/comptes-rendus`, label: 'Comptes-rendus', Icon: FileTextIcon },
      ],
    }, 
    {
      title: 'TRANSPORT',
      items: [
        { href: `/${locale}/page/transport`, label: 'Envois & voyages', Icon: FolderOpenIcon },
        { href: `/${locale}/page/offres`, label: 'Offres', Icon: DiamondIcon },
      ],
    },
    {
      title: 'FINANCES',
      items: [
        { href: `/${locale}/page/finances/dashboard-daf`, label: 'Dashboard DAF',    Icon: CurrencyCircleDollarIcon },
        { href: `/${locale}/page/finances/tresorerie`,    label: 'Trésorerie',       Icon: BankIcon                 },
        { href: `/${locale}/page/finances/dso-creances`,  label: 'DSO & Créances',   Icon: ReceiptIcon              },
        { href: `/${locale}/page/finances/dettes-fournisseurs`, label: 'Dettes fournisseurs', Icon: WalletIcon              },
        { href: `/${locale}/page/finances/alertes`,           label: 'Alertes',             Icon: BellIcon, badge: 3, badgeDanger: true },
        { href: `/${locale}/page/finances/reporting`,         label: 'Reporting',           Icon: ChartBarIcon            },
      ],
    },
    {
      title: 'RAPPORTS',
      items: [
        { href: `/${locale}/page/analytics`, label: 'Analytics', Icon: ChartLineIcon },
        // { href: `/${locale}/page/exports`, label: 'Exports', Icon: DownloadSimpleIcon },
      ],
    },
    {
      title: 'ADMIN',
      items: [
        { href: `/${locale}/page/utilisateurs`, label: 'Utilisateurs', Icon: UsersIcon },
        { href: `/${locale}/page/historique`, label: 'Historique des activités', Icon: ClockCounterClockwiseIcon },
        { href: `/${locale}/page/parametres`, label: 'Paramètres', Icon: GearIcon },
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
  const prospectTotal = useAppSelector(s => s.prospects.total);
  const sections = buildNav(locale, prospectTotal || undefined);
  const sidebarRef = useRef<HTMLElement>(null);
const isFirstRender = useRef(true);

  // Ferme la sidebar mobile à chaque changement de route
  // APRÈS — ignorer le premier render, réagir seulement aux navigations suivantes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      onClose();
    }
  }, [pathname, onClose]);

  // Gérer la touche Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

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
          className="fixed inset-0 bg-black/50 z-[59] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          'flex flex-col flex-shrink-0 overflow-hidden',
          'bg-[var(--bg-surf)] border-r border-[var(--bd-def)]',
          // Mobile : overlay fixe, glissement depuis la gauche
          'fixed inset-y-0 left-0 z-[60] w-72 h-full',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop : in-flow, transition de largeur
          'md:relative md:inset-y-auto md:left-auto md:z-auto md:h-auto',
          'md:translate-x-0 md:transition-all md:duration-300',
          open ? 'md:w-60' : 'md:w-16',
        )}
      >
        {/* Barre de couleur gradient gauche */}
        <div
          className="absolute left-0 top-0 h-full w-[3px] z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #1B6B45 0%, #2E7D52 50%, #8B6914 100%)' }}
        />

        {/* Bouton fermer sur mobile */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tx-2)] hover:bg-[var(--bg-sink)] z-20"
          aria-label="Fermer le menu"
        >
          <XIcon size={18} />
        </button>

        {/* En-tête workspace */}
        <div className="border-b border-[var(--bd-def)] px-3 py-2">
          {open ? (
            <div className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors text-left">
              <div className="min-w-0">
                <p className="text-[var(--tx-1)] text-[13px] font-semibold truncate">Group Holding</p>
                <div className="flex items-center gap-1 text-[var(--tx-3)] text-[11px] min-w-0">
                  <span>Sénégal</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <Image src="https://flagcdn.com/16x12/sn.png" width={16} height={12} alt="" className="rounded-[2px] flex-shrink-0" />
                  <span>·</span>
                  <span className="truncate">Côte d&apos;Ivoire</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <Image src="https://flagcdn.com/16x12/ci.png" width={16} height={12} alt="" className="rounded-[2px] flex-shrink-0" />
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
                        ? 'bg-[rgba(27,107,69,0.08)] text-[var(--p500)]'
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
                              badgeDanger
                                ? 'bg-error text-white'
                                : 'bg-[rgba(27,107,69,0.1)] text-[var(--p500)]',
                            )}
                          >
                            {badge}
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[var(--tx-3)] text-[11px] truncate">{role}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => logoutKeycloak()}
                className="text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors p-1 rounded flex-shrink-0"
              >
                <SignOutIcon size={15} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--grad)' }}
              >
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              {role && (
                <div className="w-6 h-6 rounded-full bg-[var(--bg-sink)] border border-[var(--bd-def)] flex items-center justify-center">
                  <span className="text-[8px] font-bold text-[var(--tx-3)]">
                    {getRoleAbbreviation(role)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}