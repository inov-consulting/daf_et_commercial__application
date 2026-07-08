'use client';

interface InfoBannerProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function InfoBanner({ showToast }: InfoBannerProps) {
  return (
    <div className="flex flex-wrap items-center lg:justify-between gap-x-3 gap-y-2 p-3 sm:px-4 sm:py-0 sm:h-[52px] bg-white border border-[#DDE5EF] rounded-lg mb-5">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
      {/* Icône et texte principal */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-xs sm:text-sm text-white">◉</span>
        </div>
        
        <span className="font-inter text-[11px] sm:text-[13px] font-medium text-[#2E3D4C] truncate">
          <span className="sm:hidden">Agents IA — Paradigme 70/30</span>
          <span className="hidden sm:inline">Configuration des agents IA — Paradigme 70/30</span>
        </span>
      </div>

      {/* Séparateur desktop */}
      <div className="hidden sm:block w-px h-5 bg-[#DDE5EF]" />
      
      {/* Statut */}
      <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 bg-[#ECFDF5] border border-primary-300 rounded-full flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
        <span className="font-inter text-[10px] sm:text-[11px] font-semibold text-primary-400 whitespace-nowrap">
          <span className="sm:hidden">Connectée</span>
          <span className="hidden sm:inline">IA · Connectée</span>
        </span>
      </div>
      </div>
      
      {/* Bouton */}
      <button 
        onClick={() => showToast('Configuration clé API', 'info')}
        className="font-inter text-[10px] sm:text-xs font-medium text-primary ml-auto sm:ml-0 whitespace-nowrap hover:underline flex-shrink-0"
      >
        <span className="sm:hidden">Clé API →</span>
        <span className="hidden sm:inline">Modifier la clé API →</span>
      </button>
    </div>
  );
}