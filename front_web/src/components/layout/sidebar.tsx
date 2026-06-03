'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquaresFour, Brain, UserCircle, Truck, Funnel,
  Files, FileText, Diamond, ChartLine, DownloadSimple,
  Users, Gear, SignOut, CaretUpDown,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  Icon: React.ElementType;
  badge?: number;
  badgeDanger?: boolean;
};

type NavSection = { title: string; items: NavItem[] };

function buildNav(locale: string): NavSection[] {
  return [
    {
      title: 'PRINCIPAL',
      items: [
        { href: `/${locale}/page/dashboard`, label: 'Tableau de bord', Icon: SquaresFour },
        { href: `/${locale}/page/ia`, label: 'Centre IA', Icon: Brain, badge: 3, badgeDanger: true },
        { href: `/${locale}/page/prospects`, label: 'Prospects', Icon: UserCircle, badge: 47 },
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
}

export default function Sidebar({ locale, open }: SidebarProps) {
  const pathname = usePathname();
  const sections = buildNav(locale);

  return (
    <aside
      className={cn(
        'flex flex-col h-screen flex-shrink-0 overflow-hidden',
        'transition-[width] duration-300 ease-in-out',
        open ? 'w-60' : 'w-16',
      )}
      style={{ background: 'linear-gradient(160deg, #0A1627 0%, #0C1E3A 100%)' }}
    >
      {/* Brand */}
      <div className="h-14 flex items-center flex-shrink-0 px-4 border-b border-white/[0.06]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-display font-bold text-white text-sm"
          style={{ background: 'var(--grad)' }}
        >
          P
        </div>
        {open && (
          <div className="ml-3 overflow-hidden whitespace-nowrap">
            <p className="font-display font-bold text-white text-[15px] leading-none">PortaLis</p>
            <p className="text-[#6B8BAD] text-[10px] mt-0.5 leading-none">by INOV Consulting</p>
          </div>
        )}
      </div>

      {/* Entity selector */}
      {open && (
        <div className="px-3 py-2.5 border-b border-white/[0.06]">
          <button className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left">
            <div className="min-w-0">
              <p className="text-white text-[13px] font-medium truncate">Group Holding</p>
              <p className="text-[#6B8BAD] text-[11px] truncate">Sénégal 🇸🇳 · Côte d&apos;Ivoire 🇨🇮</p>
            </div>
            <CaretUpDown size={13} className="text-[#6B8BAD] flex-shrink-0 ml-2" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {sections.map((section) => (
          <div key={section.title} className="mb-3">
            {open && (
              <p className="px-2.5 mb-1 text-[10px] font-semibold tracking-[.08em] text-[#4A6280] uppercase select-none">
                {section.title}
              </p>
            )}
            {section.items.map(({ href, label, Icon, badge, badgeDanger }) => {
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
                      ? 'bg-[rgba(14,134,232,0.15)] text-white'
                      : 'text-[#8BA4C0] hover:bg-white/[0.05] hover:text-[#C3D0DF]',
                  )}
                >
                  <Icon size={17} weight={active ? 'fill' : 'regular'} className="flex-shrink-0" />
                  {open && (
                    <>
                      <span className="flex-1 text-[13px] font-medium truncate">{label}</span>
                      {badge !== undefined && (
                        <span className={cn(
                          'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                          badgeDanger
                            ? 'bg-error/20 text-error'
                            : 'bg-[rgba(14,134,232,0.2)] text-[#3CA0F0]',
                        )}>
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

      {/* User profile */}
      <div className="flex-shrink-0 border-t border-white/[0.06] p-3">
        {open ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#6B35C9] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">HK</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-medium truncate">Hawa Konaté</p>
              <p className="text-[#6B8BAD] text-[11px] truncate">Directrice Générale</p>
            </div>
            <button className="text-[#6B8BAD] hover:text-white transition-colors p-1 rounded">
              <SignOut size={15} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-[#6B35C9] flex items-center justify-center">
              <span className="text-white text-xs font-bold">HK</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}