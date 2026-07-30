'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { ROUTE_LABELS } from '@/lib/nav-config';
import { i18n } from '@/config/i18n';
import type { BreadcrumbItem } from '@/components/ui/breadcrumb';

export function useBreadcrumb(): BreadcrumbItem[] {
  const pathname = usePathname();

  return useMemo(() => {
    const locale =
      i18n.locales.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
      ) ?? i18n.defaultLocale;

    // Retire le préfixe de locale puis /page
    const withoutLocale = pathname.replace(new RegExp(`^/${locale}`), '');
    const withoutPage = withoutLocale.replace(/^\/page/, '');
    const segments = withoutPage.split('/').filter(Boolean);

    if (segments.length === 0) return [];

    const items: BreadcrumbItem[] = [];
    const currentSlug = segments[segments.length - 1];

    // Racine : "Tableau de bord" (avec lien), sauf si on est déjà dessus
    if (currentSlug !== 'dashboard') {
      items.push({
        label: ROUTE_LABELS.dashboard,
        href: `/${locale}/page/dashboard`,
      });
    }

    // Segments intermédiaires + page courante
    segments.forEach((seg, idx) => {
      const isLast = idx === segments.length - 1;
      const label = ROUTE_LABELS[seg] ?? seg;

      if (isLast) {
        items.push({ label }); // page courante, sans lien
      } else {
        items.push({
          label,
          href: `/${locale}/page/${segments.slice(0, idx + 1).join('/')}`,
        });
      }
    });

    return items;
  }, [pathname]);
}
