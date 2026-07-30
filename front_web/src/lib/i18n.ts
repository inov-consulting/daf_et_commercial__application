import { i18n, type Locale } from '@/config/i18n';

export type Dictionary = {
  pageTitle: string;
  pageDescription: string;
  features: string[];
  currentLocale: string;
  switchLocale: string;
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  switch (locale) {
    case 'en':
      return (await import('@/locales/en/common.json')).default;
    case 'fr':
    default:
      return (await import('@/locales/fr/common.json')).default;
  }
}

export function getLocaleFromParams(locale?: string): Locale {
  if (locale && i18n.locales.includes(locale as Locale)) {
    return locale as Locale;
  }

  return i18n.defaultLocale;
}
