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
    <div className="flex flex-col h-screen bg-[var(--bg-page)] overflow-hidden">
      <TopBar onToggleSidebar={() => setSidebarOpen(v => !v)} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar locale={locale} open={sidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}