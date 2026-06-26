'use client';

import { Adresse } from "./adresse";
import { Coordonnees } from "./coordonnees";
import { IdentiteVisuelle } from "./identite-visuelle";
import { InformationsGenerales } from "./informations-generales";
import { InformationsLegales } from "./informations-legales";
import { PreferencesRegionales } from "./preferences-regionales";
import { Responsables } from "./responsables";

interface ProfilTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ProfilTab({ showToast }: ProfilTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 sm:gap-6 items-start">
      {/* Colonne principale */}
      <div className="min-w-0 space-y-4">
        <IdentiteVisuelle showToast={showToast} />
        <InformationsGenerales />
        <InformationsLegales />
        <Adresse />
        <Coordonnees />
        <Responsables />
      </div>
      
      {/* Sidebar - Préférences régionales */}
      <div className="lg:sticky lg:top-[88px]">
        <PreferencesRegionales />
      </div>
    </div>
  );
}