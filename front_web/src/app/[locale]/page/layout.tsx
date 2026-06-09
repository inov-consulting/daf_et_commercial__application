import DashboardShell from '@/components/layout/dashboard-shell';

interface PageLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default function PageLayout({ children, params }: PageLayoutProps) {
  return (
    <DashboardShell locale={params.locale}>
      {children}
    </DashboardShell>
  );
}