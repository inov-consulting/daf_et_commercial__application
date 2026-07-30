'use client';

interface PanelFooterProps {
  onConfig: () => void;
}

export function PanelFooter({ onConfig }: PanelFooterProps) {
  return (
    <div className="h-11 border-t border-[#EEF2F7] px-4 flex items-center gap-1.5">
      <span className="text-sm text-[#7691A8] flex-shrink-0 leading-none">↻</span>
      <span className="font-inter text-[11px] text-neutral">Actualisation auto · 30s</span>
      <div className="flex-1" />
      <button 
        onClick={onConfig}
        className="font-inter text-xs font-medium text-primary hover:underline"
      >
        Configurer →
      </button>
    </div>
  );
}