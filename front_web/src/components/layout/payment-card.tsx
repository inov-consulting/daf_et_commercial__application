'use client';

interface PaymentCardProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function PaymentCard({ showToast }: PaymentCardProps) {
  return (
    <div className="bg-white border border-[#DDE5EF] rounded-xl overflow-hidden mt-4">
      {/* En-tête */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#EEF2F7]">
        <span className="font-space-grotesk text-sm font-semibold text-[#1B2633]">
          Moyen de paiement
        </span>
        <button 
          onClick={() => showToast('Modifier paiement', 'info')}
          className="h-7 px-3 rounded-md border border-[#DDE5EF] bg-white font-inter text-[11px] sm:text-xs font-medium text-[#435869] hover:bg-[#F7F9FC] transition-colors"
        >
          Modifier
        </button>
      </div>
      
      {/* Détails de la carte */}
      <div className="p-4 sm:px-5 sm:py-3">
        <div className="flex flex-wrap items-start gap-3">
          {/* Logo + Infos carte */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-6 rounded bg-[#1B2633] flex items-center justify-center font-jetbrains-mono text-[10px] font-bold text-white flex-shrink-0">
              VISA
            </div>
            <div className="min-w-0">
              <div className="font-jetbrains-mono text-[12px] sm:text-[13px] text-[#2E3D4C] break-all">
                Visa •••• •••• •••• 4821
              </div>
              <div className="font-inter text-[10px] sm:text-[11px] text-[#7691A8] mt-px">
                Exp. 08/2028 · Fatou Camara (DAF)
              </div>
            </div>
          </div>
          
          {/* Badge vérifié */}
          <div className="flex items-center gap-1 h-5 px-2 bg-[#ECFDF5] border border-[#6EE7B7] rounded-full font-inter text-[10px] font-semibold text-[#059669] flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Vérifié
          </div>
        </div>
        
        {/* Mention sécurité */}
        <div className="mt-2 sm:mt-3 font-inter text-[10px] sm:text-[11px] text-[#9EB0C4]">
          Paiements sécurisés via Stripe · Données cryptées PCI-DSS niveau 1
        </div>
      </div>
    </div>
  );
}