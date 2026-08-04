'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { setActiveCompany } from '@/redux/features/activeCompany/activeCompanySlice';
import { setCompanyContext } from '@/lib/ApiService';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { logoutKeycloak } from '@/lib/keycloak';
import {
  SquaresFourIcon, BrainIcon, UserIcon, TruckIcon, FunnelIcon,
  FilesIcon, FileTextIcon, DiamondIcon, ChartLineIcon, DownloadSimpleIcon,
  UsersIcon, GearIcon, SignOutIcon, XIcon, ClockCounterClockwiseIcon,
  FolderOpenIcon, BankIcon, CurrencyCircleDollarIcon, ReceiptIcon,
  BellIcon, ChartBarIcon, WalletIcon, ChatCircleDotsIcon, ActivityIcon,
  CrosshairIcon, CaretDownIcon, CheckIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { ApiUser, User as UserType } from '@/types/user_type';
import { getRoleAbbreviation } from '@/lib/roleAbbreviation';
import { hasPermission } from '@/lib/permissions';
import { LogoutConfirmModal } from '@/components/layout/logout-confirm-modal';

type NavItem = {
  href: string;
  label: string;
  Icon: React.ElementType;
  customIcon?: React.ReactNode;
  badge?: number;
  badgeDanger?: boolean;
  customBadge?: React.ReactNode;
  /** Permission requise pour afficher ce lien (absente = toujours visible). */
  permission?: string | string[];
};

type NavSection = { title: string; items: NavItem[] };

function buildNav(locale: string, prospectCount?: number, alerteCount?: number, unreadMessages?: number): NavSection[] {
  return [
    {
      title: 'PRINCIPAL',
      items: [
        { href: `/${locale}/page/dashboard`, label: 'Tableau de bord', Icon: SquaresFourIcon },
        // {
        //   href: `/${locale}/page/ia`, label: 'Centre IA', Icon: BrainIcon, badge: 3,
        //   customIcon: (
        //     <span className="flex-shrink-0 w-[18px] h-[18px] rounded-[4px] flex items-center justify-center text-white text-[9px] font-bold leading-none" style={{ background: 'var(--grad)' }}>
        //       IA
        //     </span>
        //   ),
        //   customBadge: (
        //     <span
        //       className="min-w-5 h-7 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
        //       style={{ background: 'var(--grad)' }}
        //     >
        //       3
        //     </span>
        //   ),
        // },
        { href: `/${locale}/page/prospects`, label: 'Prospections', Icon: UserIcon, badge: prospectCount, permission: 'prospects:read' },
      ],
    },
    {
      title: 'OPÉRATIONS',
      items: [
        { href: `/${locale}/page/messagerie`, label: 'Messagerie', Icon: ChatCircleDotsIcon, badge: unreadMessages || undefined, permission: 'messaging:read' },
        // { href: `/${locale}/page/documents`, label: 'Documents', Icon: FilesIcon },
        { href: `/${locale}/page/comptes-rendus`, label: 'Comptes-rendus', Icon: FileTextIcon, permission: 'cr:read' },
      ],
    },
    {
      title: 'TRANSPORT',
      items: [
        { href: `/${locale}/page/transport`, label: 'Envois & voyages', Icon: FolderOpenIcon, permission: 'transport:read' },
        { href: `/${locale}/page/offres`, label: 'Offres', Icon: DiamondIcon, permission: 'transport:read' },
        {
          href: `/${locale}/page/predictions`,
          label: 'Prédictions',
          Icon: CrosshairIcon,
          permission: 'commercial:read',
        },
      ],
    },
    {
      title: 'FINANCES',
      items: [
        { href: `/${locale}/page/finances/dashboard-daf`, label: 'Dashboard DAF',    Icon: CurrencyCircleDollarIcon, permission: 'daf:read' },
        { href: `/${locale}/page/finances/tresorerie`,    label: 'Trésorerie',       Icon: BankIcon,                 permission: 'daf:read' },
        { href: `/${locale}/page/finances/dso-creances`,  label: 'DSO & Créances',   Icon: ReceiptIcon,              permission: 'daf:read' },
        { href: `/${locale}/page/finances/dettes-fournisseurs`, label: 'Dettes fournisseurs', Icon: WalletIcon,     permission: 'daf:read' },
        { href: `/${locale}/page/finances/alertes`, label: 'Alertes', Icon: BellIcon, badge: alerteCount, badgeDanger: true, permission: 'daf:read' },
        { href: `/${locale}/page/finances/reporting`,         label: 'Reporting',           Icon: ChartBarIcon,     permission: 'daf:read' },
      ],
    },
    {
      title: 'RAPPORTS',
      items: [
        { href: `/${locale}/page/analytics`, label: 'Analytics', Icon: ChartLineIcon, permission: 'app:read' },
        // { href: `/${locale}/page/exports`, label: 'Exports', Icon: DownloadSimpleIcon },
      ],
    },
    {
      title: 'ADMIN',
      items: [
        { href: `/${locale}/page/utilisateurs`, label: 'Utilisateurs', Icon: UsersIcon, permission: 'user:read' },
        { href: `/${locale}/page/historique`, label: 'Historique des activités', Icon: ClockCounterClockwiseIcon, permission: 'admin' },
        { href: `/${locale}/page/monitoring`, label: 'Monitoring', Icon: ActivityIcon, permission: 'app:read' },
        { href: `/${locale}/page/parametres`, label: 'Paramètres', Icon: GearIcon, permission: 'system:configure' },
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
  const prospectTotal    = useAppSelector(s => s.prospects.total);
  const proposedActions  = useAppSelector(s => s.daf.proposedActions);
  const pendingCount     = proposedActions.filter(a => a.status === 'pending').length;
  const unreadMessages   = useAppSelector(s => s.whatsapp.conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0));
  const perms = rawUser?.permissions ?? [];
  // eslint-disable-next-line no-console
  console.log('[sidebar debug] rawUser?.permissions =', rawUser?.permissions);
  const sections = buildNav(locale, prospectTotal || undefined, pendingCount || undefined, unreadMessages || undefined)
    .map(section => ({ ...section, items: section.items.filter(item => hasPermission(perms, item.permission)) }))
    .filter(section => section.items.length > 0);
  const dispatch = useAppDispatch();
  const sidebarRef = useRef<HTMLElement>(null);
  const wsDropdownRef = useRef<HTMLDivElement>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const isFirstRender = useRef(true);

  // Ferme le dropdown workspace quand on clique à l'extérieur
  useEffect(() => {
    if (!wsDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [wsDropdownOpen]);

  function handleCompanySelect(id: string) {
    if (id === selectedId) { setWsDropdownOpen(false); return; }
    setCompanyContext(id);
    dispatch(setActiveCompany(id));
    setWsDropdownOpen(false);
  }

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
  const avatarSrc = user?.avatar_url ?? rawUser?.avatar_url ?? null;
  const fullName = (user?.prenom || user?.nom)
    ? `${user.prenom} ${user.nom}`.trim()
    : rawUser?.email?.split('@')[0] ?? 'Utilisateur';
  const role = user?.role ?? '';

  // Workspace info — follows the globally selected company
  const wsCompanies  = rawUser?.companies ?? [];
  const selectedId   = useAppSelector(s => s.activeCompany.selectedId);
  const activeCompany = wsCompanies.find(c => c.id === selectedId) ?? wsCompanies[0] ?? null;
  const wsName       = activeCompany?.name ?? 'Organisation';
  const wsInitials   = wsName.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
  const wsCountryCode = activeCompany?.country_code?.toLowerCase() ?? '';
  const wsCountry     = activeCompany?.country ?? '';

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
        <div className="border-b border-[var(--bd-def)] px-3 py-2 relative" ref={wsDropdownRef}>
          {open ? (
            <>
              <button
                onClick={() => wsCompanies.length > 1 && setWsDropdownOpen(v => !v)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-left',
                  wsCompanies.length > 1 ? 'hover:bg-[var(--bg-sink)] cursor-pointer' : 'cursor-default',
                )}
              >
                <div
                  className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'var(--grad-subtle)' }}
                >
                  <span className="text-[10px] font-bold text-[var(--p500)]">{wsInitials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--tx-1)] text-[13px] font-semibold truncate">{wsName}</p>
                  {wsCountryCode && (
                    <div className="flex items-center gap-1.5 text-[var(--tx-3)] text-[11px] mt-0.5">
                      <Image src={`https://flagcdn.com/16x12/${wsCountryCode}.png`} width={16} height={12} alt={wsCountry} className="rounded-[2px] flex-shrink-0" />
                      <span>{wsCountry}</span>
                    </div>
                  )}
                </div>
                {wsCompanies.length > 1 && (
                  <CaretDownIcon
                    size={13}
                    className={cn(
                      'text-[var(--tx-3)] flex-shrink-0 transition-transform duration-200',
                      wsDropdownOpen && 'rotate-180',
                    )}
                  />
                )}
              </button>

              {/* Dropdown liste entreprises */}
              {wsDropdownOpen && wsCompanies.length > 1 && (
                <div
                  className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-[var(--bd-def)] overflow-hidden"
                  style={{ background: 'var(--bg-surf)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                >
                  {wsCompanies.map(company => {
                    const isActive = company.id === selectedId;
                    const compInitials = (company.name ?? '?').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
                    const compCode = company.country_code?.toLowerCase() ?? '';
                    return (
                      <button
                        key={company.id}
                        onClick={() => handleCompanySelect(company.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                          isActive ? 'bg-[rgba(27,107,69,0.07)]' : 'hover:bg-[var(--bg-sink)]',
                        )}
                      >
                        <div
                          className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center"
                          style={{ background: isActive ? 'var(--grad)' : 'var(--grad-subtle)' }}
                        >
                          <span className={cn('text-[9px] font-bold', isActive ? 'text-white' : 'text-[var(--p500)]')}>
                            {compInitials}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-[12px] font-medium truncate', isActive ? 'text-[var(--p500)]' : 'text-[var(--tx-1)]')}>
                            {company.name ?? 'Entreprise'}
                          </p>
                          {compCode && (
                            <div className="flex items-center gap-1 text-[10px] text-[var(--tx-3)] mt-0.5">
                              <Image src={`https://flagcdn.com/16x12/${compCode}.png`} width={12} height={9} alt="" className="rounded-[2px] flex-shrink-0" />
                              <span>{company.country}</span>
                            </div>
                          )}
                        </div>
                        {isActive && <CheckIcon size={13} weight="bold" className="text-[var(--p500)] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-center py-1.5">
              <div className="relative">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: 'var(--grad-subtle)' }}
                >
                  <span className="text-[10px] font-bold text-[var(--p500)]">{wsInitials}</span>
                </div>
                {wsCompanies.length > 1 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--p500)] border-2 border-[var(--bg-surf)]" />
                )}
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
                        {customBadge !== undefined
                          ? customBadge
                          : badge !== undefined && (
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
              {/* Avatar + nom → lien vers Mon profil */}
              <Link
                href={`/${locale}/page/profil`}
                className="flex items-center gap-2.5 flex-1 min-w-0 rounded-lg hover:bg-[var(--bg-sink)] px-1.5 py-1 -mx-1.5 -my-1 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: avatarSrc ? undefined : 'var(--grad)' }}
                >
                  {avatarSrc
                    ? <Image src={avatarSrc} alt={initials} width={32} height={32} className="w-full h-full object-cover" />
                    : <span className="text-white text-xs font-bold">{initials}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--tx-1)] text-[13px] font-medium truncate">{fullName}</p>
                  {role && (
                    <span className="text-[var(--tx-3)] text-[11px] truncate block">{role}</span>
                  )}
                  {activeCompany?.name && (
                    <span className="text-[var(--p500)] text-[10px] font-medium truncate block">{activeCompany.name}</span>
                  )}
                </div>
              </Link>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="text-[var(--tx-3)] hover:text-error transition-colors p-1 rounded flex-shrink-0"
                aria-label="Se déconnecter"
              >
                <SignOutIcon size={15} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Link
                href={`/${locale}/page/profil`}
                title="Mon profil"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity overflow-hidden"
                style={{ background: avatarSrc ? undefined : 'var(--grad)' }}
              >
                {avatarSrc
                  ? <Image src={avatarSrc} alt={initials} width={32} height={32} className="w-full h-full object-cover" />
                  : <span className="text-white text-xs font-bold">{initials}</span>
                }
              </Link>
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

      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={() => { setShowLogoutModal(false); logoutKeycloak(); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
}