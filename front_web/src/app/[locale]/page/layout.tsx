"use client";

import { useContext, useEffect, useState } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import { useAppDispatch } from "@/redux/store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { fetchMe, clearMe } from "@/redux/features/me/meSlice";
import { AuthContext } from "@/app/clientLayout";
import { useFcmNotifications } from "@/hooks/useFcmNotifications";
import Image from "next/image";

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
      <div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "var(--bg-surf, #f9fafb)" }}
      >
        {/* Blob de fond très subtil */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "var(--grad)", opacity: 0.06 }}
        />

        <div className="relative z-10 flex flex-col items-center select-none">
          {/* Logo avec glow animé */}
          <div className="relative mb-8">
            <div
              className="absolute animate-pulse pointer-events-none"
              style={{
                inset: "-16px",
                background: "var(--grad)",
                opacity: 0.18,
                filter: "blur(24px)",
                borderRadius: "32px",
              }}
            />
            <Image
              src="/assets/images/logo_portalis.png"
              alt="PortaLis"
              width={150}
              height={150}
              className="relative drop-shadow-md"
              priority
            />
          </div>

          {/* Dots animés */}
          <div className="flex items-center gap-2">
            {([0, 150, 300] as const).map((delay) => (
              <span
                key={delay}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  background: "var(--p500, #1B6B45)",
                  animationDelay: `${delay}ms`,
                }}
              />
            ))}
          </div>
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
