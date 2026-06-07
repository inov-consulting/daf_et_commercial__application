'use client';

import { useEffect, useState } from 'react';
import Sidebar from './sidebar';
import TopBar from './top-bar';
import FloatingChat from './floating-chat';
import { BreadcrumbBar } from './breadcrumb-bar';
import { useAppDispatch } from '@/redux/store';
import { fetchMe } from '@/redux/features/me/meSlice';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { SpinnerIcon } from '@phosphor-icons/react/dist/ssr/Spinner';

interface DashboardShellProps {
  locale: string;
  children: React.ReactNode;
}

export default function DashboardShell({ locale, children }: DashboardShellProps) {
  const dispatch = useAppDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, rawUser, loading } = useCurrentUser();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  if(loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <SpinnerIcon className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-lg text-[var(--tx-2)]">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-page)] overflow-hidden">
      <TopBar user={user} rawUser={rawUser} onToggleSidebar={() => setSidebarOpen(v => !v)} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar user={user} rawUser={rawUser} locale={locale} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <BreadcrumbBar />
          {children}
        </main>
      </div>
      <FloatingChat />
    </div>
  );
}