import { NextRequest, NextResponse } from 'next/server';
import { i18n } from '@/config/i18n';

const publicPatterns = ['/api', '/_next', '/favicon.ico'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Ignorer les ressources statiques et API
  if (publicPatterns.some((pattern) => pathname.startsWith(pattern))) {
    return NextResponse.next();
  }

  // Vérifier si le chemin commence par une locale valide
  const pathnameHasLocale = i18n.locales.some((locale) =>
    pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Si le chemin ne commence pas par une locale, rediriger vers la locale par défaut
  if (pathname === '/' || pathname === '') {
    return NextResponse.redirect(
      new URL(`/${i18n.defaultLocale}`, request.url)
    );
  }

  // Rediriger les autres chemins vers le chemin avec la locale par défaut
  return NextResponse.redirect(
    new URL(`/${i18n.defaultLocale}${pathname}`, request.url)
  );
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
