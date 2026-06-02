import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getLocaleFromParams } from '@/lib/i18n';
import { i18n } from '@/config/i18n';

export const metadata: Metadata = {
  title: 'PortaLis — Tableau de bord',
  description: 'Pilotez votre activité transport en temps réel.',
};

export function generateStaticParams() {
  return i18n.locales.map(locale => ({ locale }));
}

type Props = { params: { locale: string } };

export default function HomePage({ params }: Props) {
  const locale = getLocaleFromParams(params.locale);
  const cookieStore = cookies();
  const isAuthenticated = !!cookieStore.get('portalis_at')?.value;

  redirect(isAuthenticated ? `/${locale}/dashboard` : `/${locale}/auth/login`);
}
