import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PortaLis — Tableau de bord',
};

export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
    </main>
  );
}
