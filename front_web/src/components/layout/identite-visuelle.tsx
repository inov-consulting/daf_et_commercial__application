'use client';

interface IdentiteVisuelleProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function IdentiteVisuelle({ showToast }: IdentiteVisuelleProps) {
  return (
    <div className="bg-white rounded-xl border border-[#DDE5EF] mb-4 overflow-hidden">
      {/* En-tête */}
      <div className="px-4 sm:px-5 py-[14px] border-b border-[#EEF2F7] font-space-grotesk text-sm font-semibold text-[#1B2633]">
        Identité visuelle
      </div>
      
      {/* Contenu */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5 p-3 sm:p-4 bg-[#E8F7F0] border border-[#A8DCC5] rounded-lg">
          {/* Logo + Infos entreprise */}
          <div className="flex items-center gap-3 sm:gap-3.5 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary flex items-center justify-center font-space-grotesk text-sm sm:text-base font-bold text-white flex-shrink-0">
              PL
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-space-grotesk text-sm sm:text-base font-bold text-[#1B2633] truncate">
                PortaLis Group Holding
              </div>
              <div className="font-inter text-[11px] sm:text-xs text-[#7691A8] mt-0.5">
                <span className="inline sm:hidden">Dakar, Sénégal</span>
                <span className="hidden sm:inline">Dakar, Sénégal · Services financiers & BTP</span>
              </div>
            </div>
          </div>
          
          {/* Boutons d'action - pleine largeur sur mobile */}
          <div className="flex items-center gap-2 sm:gap-1.5 sm:ml-auto flex-shrink-0 w-full sm:w-auto">
            <button 
              onClick={() => showToast('Changer le logo', 'info')}
              className="flex-1 sm:flex-initial h-8 sm:h-7 px-3 rounded-md border border-[#DDE5EF] bg-white font-inter text-[11px] sm:text-xs font-medium text-[#435869] hover:bg-[#F7F9FC] transition-colors whitespace-nowrap text-center"
            >
              <span className="sm:hidden">Changer le logo</span>
              <span className="hidden sm:inline">Changer le logo</span>
            </button>
            <button 
              onClick={() => showToast('Logo supprimé', 'warning')}
              className="flex-1 sm:flex-initial h-8 sm:h-7 px-3 rounded-md border border-[#FECACA] bg-[#FEF2F2] font-inter text-[11px] sm:text-xs font-medium text-[#EF4444] hover:bg-[#FEE2E2] transition-colors whitespace-nowrap text-center"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}