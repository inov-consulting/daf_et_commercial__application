'use client';

type IntegrationStatus = 'connected' | 'error' | 'pending' | 'disconnected';

interface IntegrationCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: IntegrationStatus;
  meta?: string;
  lastSync?: string;
  onStatusChange: (status: IntegrationStatus) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function IntegrationCard({
  id,
  name,
  description,
  category,
  icon,
  status,
  meta,
  lastSync,
  onStatusChange,
  showToast,
}: IntegrationCardProps) {
  const statusConfig = {
    connected: { label: 'Connecté', color: '#0E86E8', bg: '#ECFDF5', border: '#6EE7B7' },
    error: { label: 'Erreur', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
    pending: { label: 'En attente', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    disconnected: { label: 'Déconnecté', color: '#7691A8', bg: '#F7F9FC', border: '#DDE5EF' },
  };

  const config = statusConfig[status];
  const isError = status === 'error';
  const isDisconnected = status === 'disconnected';
  const isPending = status === 'pending';

  const renderAction = () => {
    if (isError) {
      return (
        <button 
          onClick={() => showToast('Réparation en cours…', 'warning')}
          className="h-[30px] px-[14px] rounded-md bg-[#EF4444] border-none text-white font-inter text-xs font-medium hover:bg-[#DC2626] transition-colors"
        >
          Réparer
        </button>
      );
    }
    if (isDisconnected) {
      return (
        <button 
          onClick={() => onStatusChange('connected')}
          className="h-[30px] px-[14px] rounded-md border border-primary bg-[#E8F7F0] font-inter text-xs font-medium text-[#003d23] hover:bg-[#C5E6D4] transition-colors"
        >
          Connecter
        </button>
      );
    }
    if (isPending) {
      return (
        <button 
          onClick={() => showToast('Terminer configuration Sage', 'info')}
          className="h-[30px] px-[14px] rounded-md border-none bg-[#BF9938] font-inter text-xs font-medium text-white hover:bg-[#A6822E] transition-colors"
        >
          Terminer
        </button>
      );
    }
    return (
      <button 
        onClick={() => showToast(`Configuration ${name}`, 'info')}
        className="h-[30px] px-[14px] rounded-md border border-[#DDE5EF] bg-white font-inter text-xs font-medium text-[#435869] hover:bg-[#F7F9FC] transition-colors"
      >
        Configurer
      </button>
    );
  };

  return (
    <div className={`flex items-center gap-3.5 px-4 py-[14px] bg-white border rounded-lg ${isError ? 'border-[#FECACA] bg-[#FEF2F2]' : 'border-[#DDE5EF]'}`}>
      <div className={`w-10 h-10 rounded-lg bg-[#F7F9FC] flex items-center justify-center text-xl flex-shrink-0 ${isError ? 'bg-[#FEF2F2]' : ''}`}>
        {icon}
      </div>
      
      <div className="flex-1">
        <div>
          <span className={`font-inter text-[13px] font-semibold ${isError ? 'text-[#EF4444]' : 'text-[#1B2633]'}`}>
            {name}
          </span>
          <span className={`inline-flex items-center h-4 px-1.5 rounded ml-1.5 font-inter text-[10px] font-medium ${isError ? 'bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]' : 'bg-[#EEF2F7] text-[#435869]'}`}>
            {category}
          </span>
        </div>
        <div className={`font-inter text-xs ${isError ? 'text-[#b91c1c]' : 'text-[#7691A8]'} mt-0.5`}>
          {description}
        </div>
        {meta && (
          <div className={`font-jetbrains-mono text-[10px] ${isError ? 'text-[#b91c1c]' : 'text-[#9EB0C4]'} mt-0.5`}>
            {meta}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 text-[11px] font-semibold`} style={{ color: config.color }}>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0`} style={{ background: config.color }} />
          {config.label}
        </div>
        {renderAction()}
      </div>
    </div>
  );
}