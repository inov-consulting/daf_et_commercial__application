'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquaresFour, Brain, User, Truck, Funnel,
  Files, FileText, Diamond, ChartLine, DownloadSimple,
  Users, Gear, SignOut, CaretUpDown,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

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
              style={{ background: 'var(--grad)'}}
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
}

export default function Sidebar({ locale, open }: SidebarProps) {
  const pathname = usePathname();
  const sections = buildNav(locale);

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full flex-shrink-0 overflow-hidden',
        'transition-[width] duration-300 ease-in-out',
        'bg-[var(--bg-surf)] border-r border-[var(--bd-def)]',
        open ? 'w-60' : 'w-16',
      )}
    >
      <div
        className="absolute left-0 top-0 h-full w-[3px] z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #0E86E8 0%, #6B35C9 50%, #C2257A 100%)' }}
      />

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
                            :badgeDanger
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

      <div className="flex-shrink-0 border-t border-[var(--bd-def)] p-3">
        {open ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad)' }}>
              <span className="text-white text-xs font-bold">HK</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--tx-1)] text-[13px] font-medium truncate">Hawa Konaté</p>
              <p className="text-[var(--tx-3)] text-[11px] truncate">Directrice Générale</p>
            </div>
            <button className="text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors p-1 rounded">
              <SignOut size={15} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--grad)' }}>
              <span className="text-white text-xs font-bold">HK</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}