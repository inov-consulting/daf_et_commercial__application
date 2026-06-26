'use client';

interface ActionBarProps {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
}

export function ActionBar({ onCancel, onSave, saveLabel = 'Enregistrer les modifications' }: ActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 lg:left-[260px] right-0 h-14 sm:h-16 bg-white/95 backdrop-blur-sm border-t border-[#DDE5EF] z-[150] flex items-center justify-end px-3 sm:px-6 md:px-8 gap-2 sm:gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <button 
        onClick={onCancel}
        className="h-9 sm:h-[38px] px-3 sm:px-[18px] rounded-lg border border-[#DDE5EF] bg-white font-inter text-[11px] sm:text-sm font-medium text-[#435869] hover:bg-[#F7F9FC] active:bg-[#EEF2F7] transition-all duration-150 flex-1 sm:flex-initial"
      >
        Annuler
      </button>
      <button 
        onClick={onSave}
        className="h-9 sm:h-[38px] px-3 sm:px-5 rounded-lg border border-primary bg-primary font-inter text-[11px] sm:text-sm font-semibold text-white hover:bg-primary-400 hover:border-primary-400 active:bg-[#003d23] transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 flex-1 sm:flex-initial"
      >
        <span className="text-xs sm:text-sm flex-shrink-0">✓</span> 
        <span className="hidden md:inline">{saveLabel}</span>
        <span className="hidden sm:inline md:hidden">Enregistrer</span>
        <span className="sm:hidden">Enregistrer</span>
      </button>
    </div>
  );
}