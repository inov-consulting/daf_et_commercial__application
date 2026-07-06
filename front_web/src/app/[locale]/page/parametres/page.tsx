"use client";

import { ActionBar } from "@/components/layout/action-bar";
import { AgentsTab } from "@/components/layout/agents-tab";
import { FacturationTab } from "@/components/layout/facturation-tab";
import { IntegrationsTab } from "@/components/layout/integrations-tab";
import { NotificationsTab } from "@/components/layout/notifications-tab";
import { ProfilTab } from "@/components/layout/profil-tab";
import { Toast } from "@/components/ui/toast";
import { useState, useCallback, useEffect } from "react";
import {
  ShieldCheck,
  Question,
  Bell,
  Plug,
  CreditCard,
  CheckCircle,
  WarningCircle,
  Info,
  XCircle,
} from "@phosphor-icons/react";

type TabKey = "agents" | "profil" | "notifs" | "integ" | "billing";

type ToastType = "error" | "info" | "success" | "warning";

interface ToastState {
  message: string;
  type: ToastType;
  title: string;
}

const tabs: {
  id: TabKey;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}[] = [
  {
    id: "agents",
    label: "Paramètres IA",
    icon: <ShieldCheck size={16} weight="bold" />,
    badge: "4 agents",
  },
  {
    id: "profil",
    label: "Paramètres systèmes",
    icon: <Question size={16} weight="bold" />,
  },
  {
    id: "notifs",
    label: "Notifications",
    icon: <Bell size={16} weight="bold" />,
  },
  {
    id: "integ",
    label: "Intégrations",
    icon: <Plug size={16} weight="bold" />,
  },
  {
    id: "billing",
    label: "Facturation",
    icon: <CreditCard size={16} weight="bold" />,
  },
];

// Configuration des toasts selon le type
const toastConfig: Record<ToastType, { title: string; icon: React.ReactNode }> =
  {
    success: {
      title: "Succès",
      icon: <CheckCircle size={18} weight="fill" />,
    },
    error: {
      title: "Erreur",
      icon: <XCircle size={18} weight="fill" />,
    },
    warning: {
      title: "Attention",
      icon: <WarningCircle size={18} weight="fill" />,
    },
    info: {
      title: "Information",
      icon: <Info size={18} weight="fill" />,
    },
  };

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("agents");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  // Fonction pour afficher un toast
  const showToast = useCallback(
    (message: string, type: ToastType = "success", duration = 4000) => {
      // Effacer le timer précédent si existant
      if (toastTimer) {
        clearTimeout(toastTimer);
      }

      // Afficher le nouveau toast
      setToast({
        message,
        type,
        title: toastConfig[type].title,
      });

      // Programmer la disparition
      const timer = setTimeout(() => {
        setToast(null);
      }, duration);

      setToastTimer(timer);
    },
    [toastTimer],
  );

  // Fonction pour fermer manuellement le toast
  const dismissToast = useCallback(() => {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    setToast(null);
  }, [toastTimer]);

  // Nettoyage du timer à la destruction du composant
  useEffect(() => {
    return () => {
      if (toastTimer) {
        clearTimeout(toastTimer);
      }
    };
  }, [toastTimer]);

  const renderTab = () => {
    switch (activeTab) {
      case "agents":
        return <AgentsTab showToast={showToast} />;
      case "profil":
        return <ProfilTab showToast={showToast} />;
      case "notifs":
        return <NotificationsTab showToast={showToast} />;
      case "integ":
        return <IntegrationsTab showToast={showToast} />;
      case "billing":
        return <FacturationTab showToast={showToast} />;
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Contenu principal avec padding-bottom pour l'ActionBar */}
      <div className="flex-1 overflow-auto pb-20 px-4 sm:px-5 md:px-6 pt-5 md:pt-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-[18px] sm:text-[20px] md:text-[24px] font-bold text-[var(--tx-1)] leading-tight">
              Paramètres
            </h1>
            <p className="text-[12px] sm:text-[13px] text-[var(--tx-3)] mt-0.5">
              Configuration de la plateforme PortaLis Group Holding
            </p>
          </div>
        </div>

        {/* Ligne verte décorative */}
        <div className="w-full h-[2px] bg-[#00a066] opacity-15 mb-0" />

        {/* Tabs - Version responsive */}
        <div className="overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6">
          <div className="flex border-b border-[#DDE5EF] mb-6 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                                    relative flex items-center gap-1.5 h-[46px] px-3 sm:px-[18px]
                                    bg-transparent font-inter text-[12px] sm:text-[13px] font-medium
                                    cursor-pointer whitespace-nowrap
                                    transition-all duration-150
                                    ${
                                      activeTab === tab.id
                                        ? "text-primary font-semibold"
                                        : "text-[#9EB0C4] hover:text-[#435869]"
                                    }
                                `}
              >
                {/* Indicateur de tab actif - soulignement */}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full" />
                )}

                <span className="leading-none flex-shrink-0 flex items-center">
                  {tab.icon}
                </span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-[11px]">
                  {tab.label.split(" ")[0]}
                </span>
                {tab.badge && (
                  <span
                    className={`
                                        hidden sm:inline font-inter text-[10px] sm:text-[11px] font-semibold px-2 py-px rounded-full
                                        ${
                                          activeTab === tab.id
                                            ? "bg-[#E8F7F0] text-primary border border-[#A8DCC5]"
                                            : "bg-[#EEF2F7] text-[#7691A8] border border-[#DDE5EF]"
                                        }
                                    `}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Panel */}
        <div className="w-full">{renderTab()}</div>
      </div>

      {/* ActionBar fixée en bas */}
      {/* <ActionBar
                onCancel={() => showToast('Modifications annulées', 'warning')}
                onSave={() => showToast('Toutes les modifications ont été enregistrées avec succès', 'success')}
            /> */}

      {/* Toast - Positionné en bas à droite, au-dessus de l'ActionBar */}
      {toast && (
        <div className="fixed bottom-20 right-4 sm:right-6 md:right-8 z-[200] animate-in slide-in-from-bottom-2 fade-in duration-300 max-w-[calc(100vw-2rem)] sm:max-w-xs">
          <Toast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            icon={toastConfig[toast.type].icon}
            onDismiss={dismissToast}
          />
        </div>
      )}
    </div>
  );
}
