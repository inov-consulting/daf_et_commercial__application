"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import TopBar from "./top-bar";
import FloatingChat from "./floating-chat";
import { BreadcrumbBar } from "./breadcrumb-bar";
import type { ApiUser, User } from "@/types/user_type";

interface DashboardShellProps {
  locale: string;
  children: React.ReactNode;
  user: User | null;
  rawUser: ApiUser | null;
}

export default function DashboardShell({
  user,
  rawUser,
  locale,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hideFloatingChat =
    pathname === `/${locale}/page/parametres` ||
    pathname === `/${locale}/page/messagerie`;

  const handleClose = useCallback(() => setSidebarOpen(false), []);
  const handleToggle = useCallback(() => setSidebarOpen((v) => !v), []);

  useEffect(() => {
    // État initial : ouverte sur desktop, fermée sur mobile
    const isMobile = window.innerWidth < 768;
    setSidebarOpen(!isMobile);

    // Sur resize, on gère uniquement la transition mobile ↔ desktop
    let wasMobile = isMobile;
    const handleResize = () => {
      const nowMobile = window.innerWidth < 768;

      // Transition desktop → mobile : fermer la sidebar
      if (nowMobile && !wasMobile) {
        setSidebarOpen(false);
      }
      // Transition mobile → desktop : ouvrir la sidebar
      if (!nowMobile && wasMobile) {
        setSidebarOpen(true);
      }

      wasMobile = nowMobile;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-surf)] overflow-hidden">
      <TopBar user={user} rawUser={rawUser} onToggleSidebar={handleToggle} />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar
          user={user}
          rawUser={rawUser}
          locale={locale}
          open={sidebarOpen}
          onClose={handleClose}
        />
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
          <BreadcrumbBar />
          <div className="flex-1 min-h-0 flex flex-col">{children}</div>
        </main>
      </div>
      {!hideFloatingChat && <FloatingChat user={user} rawUser={rawUser} />}
    </div>
  );
}
