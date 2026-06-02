import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import { i18n } from '@/config/i18n';

type LocalePageProps = {
  params: {
    locale: string;
  };
};

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

export default async function LocalePage({ params }: LocalePageProps) {
  const locale = i18n.locales.includes(params.locale as any)
    ? (params.locale as typeof i18n.locales[number])
    : i18n.defaultLocale;

  const dictionary = await getDictionary(locale);
  const switchLocale = locale === 'fr' ? 'en' : 'fr';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            DAF & Commercial
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {dictionary.pageTitle}
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">{dictionary.pageDescription}</p>
          <p className="mt-6 text-sm text-slate-500">{dictionary.currentLocale}</p>
          <Link href={`/${switchLocale}`} className="mt-8 inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-white transition hover:bg-slate-700">
            {dictionary.switchLocale}
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dictionary.features.map((feature) => (
            <div key={feature} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-medium text-slate-900">{feature}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
