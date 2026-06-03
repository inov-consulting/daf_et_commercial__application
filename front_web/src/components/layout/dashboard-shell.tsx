'use client';

import { useState } from 'react';
import Sidebar from './sidebar';
import TopBar from './top-bar';

interface DashboardShellProps {
  locale: string;
  children: React.ReactNode;
}

export default function DashboardShell({ locale, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[var(--bg-page)] overflow-hidden">
      <Sidebar locale={locale} open={sidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}