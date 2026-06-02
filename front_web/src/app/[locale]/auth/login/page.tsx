import type { Metadata } from 'next';
import { getLocaleFromParams } from '@/lib/i18n';
import LoginForm from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Connexion | PortaLis',
  description: 'Connectez-vous à votre tableau de bord PortaLis.',
};

type Props = {
  params: { locale: string };
  searchParams: { reason?: string };
};

const FEATURES = [
  'Pipeline commercial tracé',
  'Dossiers transport en temps réel',
  'Agent DAF IA supervisé',
] as const;

/* ── Sub-components (server-rendered, no state needed) ────── */

function SessionExpiredBanner() {
  return (
    <div className="bg-[#FFFBEB] border-b border-[#FCD34D] px-6 py-3">
      <p className="text-sm text-[#92400E] text-center">
        Session expirée — Veuillez vous reconnecter pour continuer.
      </p>
    </div>
  );
}

function FeatureChip({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-[#1E3A5F] w-fit">
      <span className="text-[#4A90D9] text-base leading-none select-none">✦</span>
      <span className="text-sm text-[#B8D0EC]">{label}</span>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function LoginPage({ params, searchParams }: Props) {
  const locale = getLocaleFromParams(params.locale);
  const sessionExpired = searchParams.reason === 'session_expired';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel (desktop only) ────────────────────────── */}
      <aside
        className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-shrink-0 flex-col p-10 xl:p-14"
        style={{ background: 'linear-gradient(160deg, #0A1627 0%, #0C1E3A 100%)' }}
      >
        {/* Brand */}
        <div className="mb-16">
          <p className="font-display font-bold text-xl text-white tracking-tight">PortaLis</p>
          <p className="text-[#6B8BAD] text-xs mt-0.5">by INOV Consulting</p>
        </div>

        {/* Headline */}
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="font-display font-bold text-white text-4xl xl:text-[2.75rem] leading-[1.15] mb-5">
            Pilotez votre activité transport en temps réel
          </h2>
          <p className="text-[#8BA4C0] text-sm mb-10">
            Agents IA · Multi-entités · Sénégal &amp; Côte d&apos;Ivoire
          </p>

          {/* Feature chips */}
          <div className="flex flex-col gap-3">
            {FEATURES.map(f => (
              <FeatureChip key={f} label={f} />
            ))}
          </div>
        </div>
      </aside>

      {/* ── Right panel ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col bg-[#EEF2F7] lg:bg-white">
        {/* Session expired banner */}
        {sessionExpired && <SessionExpiredBanner />}

        {/* Mobile: brand header */}
        <div className="lg:hidden pt-12 pb-6 px-6 text-center">
          <span className="font-display font-bold text-2xl text-gradient">PortaLis</span>
          <p className="text-[#7691A8] text-xs mt-0.5">by INOV Consulting</p>
          <p className="font-medium text-[#1B2633] text-lg mt-4 leading-snug">
            Pilotez votre activité transport
          </p>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 pb-10 lg:pb-0">
          {/*
            Mobile: white card with shadow
            Desktop: transparent wrapper, form floats in the white panel
          */}
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 lg:bg-transparent lg:shadow-none lg:rounded-none lg:max-w-[400px] xl:max-w-[420px] lg:p-0">
            <LoginForm locale={locale} />
          </div>
        </div>
      </main>
    </div>
  );
}
