import { fontVariables } from '@/lib/fonts';
import { getLocaleFromParams } from '@/lib/i18n';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: {
    locale: string;
  };
};

export default function LocaleLayout({ children, params }: Readonly<LocaleLayoutProps>) {
  const locale = getLocaleFromParams(params.locale);

  return (
    <html lang={locale} data-theme="light" className={fontVariables}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
