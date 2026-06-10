'use client';

import { useEffect, useState } from 'react';
import Sidebar from './sidebar';
import TopBar from './top-bar';
import FloatingChat from './floating-chat';
import { BreadcrumbBar } from './breadcrumb-bar';
import { User } from '@/types/user_type';

interface DashboardShellProps {
  locale: string;
  children: React.ReactNode;
  user: User;
  rawUser: ApiUser | null;
}

export default function DashboardShell({ user, rawUser, locale, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter le mobile et ajuster la sidebar
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      // Sur desktop, ouvrir la sidebar par défaut
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-surf)] overflow-hidden">
      <TopBar 
        user={user} 
        rawUser={rawUser} 
        onToggleSidebar={() => setSidebarOpen(v => !v)} 
      />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar 
          user={user} 
          rawUser={rawUser} 
          locale={locale} 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
          <BreadcrumbBar />
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
      <FloatingChat user={user} rawUser={rawUser} />
    </div>
  );
}