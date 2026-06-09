'use client';

import { useContext, useEffect, useState } from 'react';
import Sidebar from './sidebar';
import TopBar from './top-bar';
import FloatingChat from './floating-chat';
import { BreadcrumbBar } from './breadcrumb-bar';
import { useAppDispatch } from '@/redux/store';
import { fetchMe, clearMe } from '@/redux/features/me/meSlice';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AuthContext } from '@/app/clientLayout';

interface DashboardShellProps {
  locale: string;
  children: React.ReactNode;
}

export default function DashboardShell({ locale, children }: DashboardShellProps) {
  const dispatch = useAppDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, rawUser, loading } = useCurrentUser();
  const auth = useContext(AuthContext);
  const authenticated = auth?.authenticated ?? false;

  // Charge le profil uniquement quand Keycloak a confirmé l'authentification
  // et que le token est disponible dans kc.token (lu par ApiService).
  useEffect(() => {
    if (!authenticated) return;
    dispatch(clearMe());
    dispatch(fetchMe());
  }, [dispatch, authenticated]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-page,#f8fafc)]">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Chargement du profil…</p>
        </div>
      </div>
    );
  }

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
      <FloatingChat />
    </div>
  );
}