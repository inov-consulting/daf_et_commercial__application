export const i18n = {
  locales: ['fr', 'en'] as const,
  defaultLocale: 'fr' as const,
} as const;

export type Locale = (typeof i18n.locales)[number];

export const localeNames = {
  fr: 'Français',
  en: 'English',
} as const;

export const isLocale = (value: string | undefined): value is Locale =>
  Boolean(value && i18n.locales.includes(value as Locale));
