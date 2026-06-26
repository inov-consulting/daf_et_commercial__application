'use client';

interface ApiKeysBlockProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ApiKeysBlock({ showToast }: ApiKeysBlockProps) {
  return (
    <div className="bg-white border border-[#DDE5EF] rounded-lg p-4 mt-4">
      <div className="font-space-grotesk text-[13px] font-semibold text-[#1B2633]">Clés API PortaLis</div>
      <div className="font-inter text-xs text-[#7691A8] mb-3">Pour accéder à l&apos;API PortaLis depuis vos applications tierces</div>
      
      <div className="flex items-center gap-2.5 py-2 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
        <span className="font-inter text-xs font-medium text-[#2E3D4C] w-[100px] flex-shrink-0">Production</span>
        <span className="font-jetbrains-mono text-[11px] text-[#7691A8] flex-1 tracking-[0.05em]">••••••••••••••••••••</span>
        <button 
          onClick={() => showToast('Clé copiée', 'success')}
          className="h-[26px] px-3 rounded-md border border-[#DDE5EF] bg-white font-inter text-xs font-medium text-[#435869] hover:bg-[#F7F9FC] transition-colors"
        >
          Copier
        </button>
      </div>
      
      <div className="flex items-center gap-2.5 py-2 border-t border-[#EEF2F7]">
        <span className="font-inter text-xs font-medium text-[#2E3D4C] w-[100px] flex-shrink-0">Sandbox</span>
        <span className="font-jetbrains-mono text-[11px] text-[#7691A8] flex-1 tracking-[0.05em]">••••••••••••••••••••</span>
        <button 
          onClick={() => showToast('Clé copiée', 'success')}
          className="h-[26px] px-3 rounded-md border border-[#DDE5EF] bg-white font-inter text-xs font-medium text-[#435869] hover:bg-[#F7F9FC] transition-colors"
        >
          Copier
        </button>
      </div>
      
      <button 
        onClick={() => showToast('Générer une clé', 'info')}
        className="flex items-center gap-1.5 mt-2 font-inter text-xs font-medium text-primary hover:underline"
      >
        + Générer une clé
      </button>
    </div>
  );
}