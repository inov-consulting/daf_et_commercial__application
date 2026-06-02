import { HTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: ReactNode;
}

export function Breadcrumb({ items, separator = '/', className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Fil d'ariane" className={cn('flex items-center flex-wrap gap-1', className)} {...props}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={i} className="flex items-center gap-1 text-sm">
            {isLast ? (
              <span className="text-foreground font-medium" aria-current="page">
                {item.label}
              </span>
            ) : (
              <>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-foreground-3 hover:text-primary-500 hover:bg-surface-mute px-1 py-[.1rem] rounded-sm transition-all duration-fast"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-foreground-3">{item.label}</span>
                )}
                <span className="text-foreground-muted text-xs" aria-hidden="true">
                  {separator}
                </span>
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}
