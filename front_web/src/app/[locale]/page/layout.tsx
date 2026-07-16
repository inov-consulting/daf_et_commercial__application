'use client';

import { useContext, useEffect, useState } from 'react';
import DashboardShell from '@/components/layout/dashboard-shell';
import { useAppDispatch } from '@/redux/store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { fetchMe, clearMe } from '@/redux/features/me/meSlice';
import { AuthContext } from '@/app/clientLayout';
import { useFcmNotifications } from '@/hooks/useFcmNotifications';

interface PageLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default function PageLayout({ children, params }: PageLayoutProps) {
  const { user, rawUser, loading } = useCurrentUser();
  const dispatch = useAppDispatch();
  const auth = useContext(AuthContext);
  const authenticated = auth?.authenticated ?? false;

  // Initialise Firebase Cloud Messaging une fois l'utilisateur authentifié
  useFcmNotifications();

  // Charge le profil uniquement quand Keycloak a confirmé l'authentification
  // et que le token est disponible dans kc.token (lu par ApiService).
  useEffect(() => {
    if (!authenticated) return;
    dispatch(clearMe());
    dispatch(fetchMe());
  }, [dispatch, authenticated]);


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
    <DashboardShell user={user} rawUser={rawUser} locale={params.locale}>
      {children}
    </DashboardShell>
  );
}