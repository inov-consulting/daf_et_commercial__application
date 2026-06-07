import { NextRequest, NextResponse } from 'next/server';
import { i18n } from '@/config/i18n';

const publicPatterns = ['/api', '/_next', '/favicon.ico'];
const authRoutes = ['/auth/login'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Ignorer les ressources statiques et API
  if (publicPatterns.some((pattern) => pathname.startsWith(pattern))) {
    return NextResponse.next();
  }

  // Déterminer la locale active dans le chemin
  const activeLocale =
    i18n.locales.find(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    ) || i18n.defaultLocale;

  // Vérifier si le chemin commence par une locale valide
  const pathnameHasLocale = i18n.locales.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    // Si le chemin ne commence pas par une locale, rediriger vers la locale par défaut
    if (pathname === '/' || pathname === '') {
      return NextResponse.redirect(
        new URL(`/${i18n.defaultLocale}`, request.url)
      );
    }
    return NextResponse.redirect(
      new URL(`/${i18n.defaultLocale}${pathname}`, request.url)
    );
  }

  // Vérifier l'authentification via le cookie d'accès
  const isAuthenticated = !!request.cookies.get('portalis_at')?.value;
  const pathnameWithoutLocale =
    pathname.replace(new RegExp(`^/${activeLocale}`), '') || '/';
  const isAuthRoute = authRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  if (!isAuthenticated && !isAuthRoute) {
    // Rediriger vers la page de login si non authentifié
    return NextResponse.redirect(
      new URL(`/${activeLocale}/auth/login`, request.url)
    );
  }

  if (isAuthenticated && isAuthRoute) {
    // Rediriger vers le dashboard si déjà connecté et accès à une route d'auth
    return NextResponse.redirect(
      new URL(`/${activeLocale}/dashboard`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
