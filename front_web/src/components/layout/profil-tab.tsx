'use client';

import { Adresse } from "./adresse";
import { Coordonnees } from "./coordonnees";
import { IdentiteVisuelle } from "./identite-visuelle";
import { InformationsGenerales } from "./informations-generales";
import { InformationsLegales } from "./informations-legales";
import { PreferencesRegionales } from "./preferences-regionales";
import { Responsables } from "./responsables";
import { ValidatorsSection } from "./validators-section";
import { SmtpSection } from "./smtp-section";
import { KpiGroupsSection } from "./kpi-groups-section";
import { GroupsManagementSection } from "./groups-management-section";

interface ProfilTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ProfilTab({ showToast }: ProfilTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 items-start">
      {/* Colonne principale */}
      <div className="min-w-0 space-y-5">
        {/* Section Configuration système - Mise en avant */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#1B6B45]">
              Configuration système
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <div className="absolute -top-2.5 left-3 z-10">
                <span className="text-[9px] font-bold uppercase tracking-[.08em] text-[#4338CA] bg-[#EEF2FF] border border-[#C7D2FE] px-2 py-0.5 rounded-full">
                  Prioritaire
                </span>
              </div>
              <ValidatorsSection showToast={showToast} />
            </div>
            <SmtpSection showToast={showToast} />
            <GroupsManagementSection showToast={showToast} />
            <KpiGroupsSection showToast={showToast} />
          </div>
        </div>

        {/* Séparateur */}
        {/* <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#EEF2F7]" />
          <span className="text-[9px] font-bold uppercase tracking-[.1em] text-[#9EB0C4]">
            Informations entreprise
          </span>
          <div className="h-px flex-1 bg-[#EEF2F7]" />
        </div> */}

        {/* Sections informations entreprise */}
        {/* <IdentiteVisuelle showToast={showToast} />
        <InformationsGenerales />
        <InformationsLegales />
        <Adresse />
        <Coordonnees />
        <Responsables /> */}
      </div>
      
      {/* Sidebar - Préférences régionales */}
      <div className="lg:sticky lg:top-[88px]">
        <PreferencesRegionales />
      </div>
    </div>
  );
}