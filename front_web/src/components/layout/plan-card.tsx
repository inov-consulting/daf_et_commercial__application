'use client';

interface PlanCardProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function PlanCard({ showToast }: PlanCardProps) {
  return (
    <div className="bg-white border border-primary rounded-xl overflow-hidden">
      {/* En-tête avec statut */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-3 sm:py-[14px] border-b border-[#A8DCC5] bg-[#E8F7F0]">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="font-space-grotesk text-base sm:text-lg font-bold text-primary">
            Business
          </span>
          <div className="flex items-center gap-1.5 h-[22px] px-2.5 bg-[#ECFDF5] border border-primary-300 rounded-full font-inter text-[10px] sm:text-[11px] font-semibold text-primary">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            Actif
          </div>
        </div>
        <span className="font-inter text-[10px] sm:text-xs text-[#7691A8] sm:ml-auto">
          <span className="sm:hidden">Renouvellement : 1 juillet 2026</span>
          <span className="hidden sm:inline">Renouvellement le 1 juillet 2026</span>
        </span>
      </div>
      
      {/* Prix */}
      <div className="flex items-baseline gap-1 px-4 sm:px-5 py-3 sm:py-4 border-b border-[#EEF2F7]">
        <span className="font-space-grotesk text-[28px] sm:text-[32px] font-bold text-[#1B2633]">
          156 000
        </span>
        <span className="font-inter text-xs sm:text-sm text-[#7691A8]">
          FCFA / mois
        </span>
      </div>
      
      {/* Bouton d'action */}
      <button 
        onClick={() => showToast('Changer de plan', 'info')}
        className="w-full sm:w-auto px-4 sm:px-5 py-3 sm:py-[14px] font-inter text-[11px] sm:text-xs font-medium text-primary hover:underline hover:bg-[#F7F9FC] transition-colors block text-left sm:text-center"
      >
        Changer de plan →
      </button>
    </div>
  );
}