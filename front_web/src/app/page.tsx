import { APP_CONFIG } from '@/config/app';

const features = [
  'Architecture Next.js App Router',
  'TypeScript strict mode',
  'Tailwind CSS prêt à l’emploi',
  'Structure scalable par domaine',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            {APP_CONFIG.name}
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Base frontend prête pour votre application DAF & Commercial.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Projet Next.js structuré selon les bonnes pratiques pour construire une application maintenable, typée et évolutive.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-medium text-slate-900">{feature}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
