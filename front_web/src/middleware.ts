import { NextRequest, NextResponse } from 'next/server';
import { i18n } from '@/config/i18n';

const SKIP_PATTERNS = ['/api', '/_next', '/favicon.ico', '/silent-check-sso.html'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Ignorer les ressources statiques, API et fichiers Keycloak
  if (SKIP_PATTERNS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Vérifier si le chemin commence par une locale valide
  const pathnameHasLocale = i18n.locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!pathnameHasLocale) {
<<<<<<< Updated upstream
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
=======
    // Rediriger vers la locale par défaut
    const target = pathname === '/' || pathname === ''
      ? `/${i18n.defaultLocale}`
      : `/${i18n.defaultLocale}${pathname}`;
    return NextResponse.redirect(new URL(target, request.url));
>>>>>>> Stashed changes
  }

  // L'authentification est gérée entièrement par Keycloak JS côté client.
  // Le middleware ne bloque plus les routes — Keycloak redirige vers son
  // propre login si la session SSO est absente ou expirée.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|silent-check-sso.html).*)'],
};
