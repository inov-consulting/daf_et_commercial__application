'use client';

interface PageHeaderProps {
  pendingCount: number;
}

export function PageHeader({ pendingCount }: PageHeaderProps) {
  return (
    <div className="mb-4">
      {/* Ligne 1 : Titre */}
      <h1 className="font-display text-[20px] sm:text-[22px] md:text-[26px] font-bold text-foreground tracking-tight leading-tight mb-2">
        Centre IA
      </h1>
      
      {/* Ligne 2 : Description + Badge */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="font-inter text-[11px] sm:text-sm text-[#7691A8] truncate">
          <span className="sm:hidden">Validation IA · Paradigme 70/30</span>
          <span className="hidden sm:inline">Hub de validation des outputs IA · Paradigme 70/30</span>
        </p>
        
        <div className="flex items-center gap-1.5 h-[28px] sm:h-[30px] px-2.5 sm:px-3 bg-[#E8F7F0] border border-primary rounded-full flex-shrink-0">
          <div className="w-4 sm:w-5 h-4 sm:h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] sm:text-[10px] text-white">◉</span>
          </div>
          <span className="font-inter text-[11px] sm:text-[13px] font-semibold text-primary whitespace-nowrap">
            {pendingCount} <span className="hidden sm:inline">items</span>
          </span>
        </div>
      </div>
      
      {/* Ligne décorative */}
      <div className="w-full h-[2px] bg-primary opacity-20" />
    </div>
  );
}