'use client';

import { useState } from 'react';

interface NotificationHeaderProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function NotificationHeader({ showToast }: NotificationHeaderProps) {
  const [isSilent, setIsSilent] = useState(true);
  const [frequency, setFrequency] = useState('Toutes les heures');

  return (
    <div className="bg-white border border-[#DDE5EF] rounded-lg mb-5 overflow-hidden">
      {/* En-tête */}
      <div className="px-4 sm:px-5 py-3 sm:py-[14px] border-b border-[#EEF2F7] sm:border-b-0">
        <div className="font-inter text-[12px] sm:text-[13px] font-semibold text-[#1B2633]">
          Préférences de notifications
        </div>
        <div className="font-inter text-[10px] sm:text-xs text-[#7691A8] mt-0.5">
          Configurez vos préférences par canal et par événement
        </div>
      </div>
      
      {/* Contrôles */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-3 px-4 sm:px-5 py-3 sm:py-[14px]">
        {/* Toggle heures silencieuses */}
        <div className="flex items-center justify-between py-2 sm:py-0 border-b border-[#EEF2F7] sm:border-b-0">
          <span className="font-inter text-[11px] sm:text-xs text-[#435869]">
            Heures silencieuses (22h–07h)
          </span>
          <label className="relative w-9 h-5 flex-shrink-0 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isSilent}
              onChange={() => {
                setIsSilent(!isSilent);
                showToast(
                  !isSilent ? 'Mode silencieux activé' : 'Mode silencieux désactivé',
                  'info'
                );
              }}
              className="sr-only"
            />
            <div className={`
              absolute inset-0 rounded-[10px] transition-colors duration-200
              ${isSilent ? 'bg-primary' : 'bg-[#C8D5E0]'}
            `} />
            <div className={`
              absolute left-[3px] top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm
              transition-transform duration-200
              ${isSilent ? 'translate-x-4' : ''}
            `} />
          </label>
        </div>
        
        {/* Séparateur desktop */}
        <div className="hidden sm:block w-px h-5 bg-[#DDE5EF]" />
        
        {/* Sélecteur de fréquence */}
        <div className="flex items-center justify-between py-2 sm:py-0">
          <span className="font-inter text-[11px] sm:text-xs text-[#435869]">
            Email récapitulatif
          </span>
          <select 
            value={frequency}
            onChange={(e) => {
              setFrequency(e.target.value);
              showToast(`Fréquence : ${e.target.value}`, 'info');
            }}
            className="w-[140px] sm:w-[180px] h-8 px-2.5 border border-[#DDE5EF] rounded-md bg-white text-[#435869] font-inter text-[11px] sm:text-xs appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_10px_center] focus:outline-none focus:border-primary"
          >
            <option>Temps réel</option>
            <option selected>Toutes les heures</option>
            <option>Résumé quotidien</option>
          </select>
        </div>
      </div>
    </div>
  );
}