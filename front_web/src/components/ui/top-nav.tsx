'use client';

import { HTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface NavLink {
  key: string;
  label: string;
  href: string;
}

export interface TopNavProps extends HTMLAttributes<HTMLElement> {
  logo?: ReactNode;
  links?: NavLink[];
  activeKey?: string;
  actions?: ReactNode;
  userInitials?: string;
  hasNotification?: boolean;
}

export function TopNav({
  logo,
  links = [],
  activeKey,
  actions,
  userInitials,
  hasNotification = false,
  className,
  ...props
}: TopNavProps) {
  return (
    <header
      className={cn(
        'flex items-center gap-3 h-[58px] px-5 bg-surface border border-border rounded-2xl shadow-sm',
        className,
      )}
      {...props}
    >
      {/* Logo */}
      <span className="font-display text-base font-bold text-gradient whitespace-nowrap shrink-0">
        {logo ?? 'INOV'}
      </span>

      {links.length > 0 && (
        <>
          <div className="w-px h-[18px] bg-border mx-[.125rem] shrink-0" aria-hidden="true" />
          <nav className="flex items-center gap-[.125rem] flex-1 min-w-0" aria-label="Navigation principale">
            {links.map((link) => {
              const isActive = link.key === activeKey;
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  className={cn(
                    'px-3 py-[.375rem] text-sm font-medium rounded-lg whitespace-nowrap',
                    'transition-all duration-fast',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-[3px]',
                    isActive
                      ? 'bg-[rgba(27,107,69,.1)] text-primary-600 font-semibold dark:text-primary-400'
                      : 'text-foreground-2 hover:bg-surface-mute hover:text-foreground',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {/* Actions slot */}
      <div className="flex items-center gap-[.375rem] ml-auto">
        {actions}

        {/* User avatar */}
        {userInitials && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Profil utilisateur"
            className={cn(
              'w-[30px] h-[30px] rounded-full flex items-center justify-center cursor-pointer',
              'text-xs font-bold text-white border-2 border-border',
              'hover:border-primary-400 transition-[border-color] duration-fast',
            )}
            style={{ background: 'var(--grad)' }}
          >
            {userInitials}
          </div>
        )}
      </div>
    </header>
  );
}

export interface IconNavButtonProps extends HTMLAttributes<HTMLButtonElement> {
  label: string;
  badge?: boolean;
}

export function IconNavButton({ label, badge = false, className, children, ...props }: IconNavButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'relative w-[34px] h-[34px] rounded-lg bg-transparent text-foreground-3',
        'flex items-center justify-center border-0 cursor-pointer',
        'hover:bg-surface-mute hover:text-foreground transition-all duration-fast',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-[3px]',
        className,
      )}
      {...props}
    >
      {children}
      {badge && (
        <span
          className="absolute top-[6px] right-[6px] w-[7px] h-[7px] bg-error rounded-full border-[1.5px] border-surface"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
