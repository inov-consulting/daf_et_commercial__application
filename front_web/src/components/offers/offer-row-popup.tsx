import { useState, useRef, useEffect } from 'react';
import {
  DotsThreeVerticalIcon, EyeIcon, PencilSimpleIcon, CopyIcon,
  DownloadSimpleIcon, PaperPlaneTiltIcon, TrashIcon,
  ShieldCheckIcon, CheckSquareIcon,
} from '@phosphor-icons/react';
import type { RowPopupProps } from '@/types/offer_type';

export function OfferRowPopup({
  offer, status, onView, onEdit, onDuplicate, onSend, onDelete, onValidate, onConfirm,
}: RowPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  
  const canSend = !(['signee', 'refusee', 'expiree'].includes(status));
  
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current && 
        !popupRef.current.contains(e.target as Node) &&
        buttonRef.current && 
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ 
        top: rect.bottom + 4, 
        right: window.innerWidth - rect.right 
      });
      setIsOpen(true);
    }
  };
  
  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };
  
  const menuItemClass = "w-full text-left px-3.5 py-2.5 text-xs text-gray-700 flex items-center gap-2.5 hover:bg-gray-50 transition-colors";
  
  return (
    <td className="px-2 py-0 align-middle" onClick={e => e.stopPropagation()}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`w-7.5 h-7.5 rounded-md flex items-center justify-center cursor-pointer transition-all ${
          isOpen ? 'border border-gray-200 bg-gray-100' : 'border border-transparent hover:bg-gray-100 hover:border-gray-200'
        }`}
      >
        <DotsThreeVerticalIcon size={15} className="text-gray-500" />
      </button>
      
      {isOpen && (
        <div
          ref={popupRef}
          className="fixed w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{ top: position.top, right: position.right }}
        >
          {/* Voir le détail */}
          <button
            className={menuItemClass}
            onClick={() => handleAction(onView)}
          >
            <EyeIcon size={14} className="text-gray-500 w-3.5" />
            Voir le détail
          </button>

          {/* Valider (genere) */}
          {status === 'genere' && onValidate && (
            <button
              className={`${menuItemClass} !text-[#1E5B3C] hover:!bg-[#ECFDF5]`}
              onClick={() => handleAction(onValidate)}
            >
              <ShieldCheckIcon size={14} weight="fill" className="w-3.5 text-[#1E5B3C]" />
              Valider l&apos;offre
            </button>
          )}

          {/* Confirmer Odoo (envoyee = validated) */}
          {status === 'envoyee' && onConfirm && (
            <button
              className={`${menuItemClass} !text-[#085499] hover:!bg-[#EBF5FD]`}
              onClick={() => handleAction(onConfirm)}
            >
              <CheckSquareIcon size={14} weight="fill" className="w-3.5 text-[#085499]" />
              Confirmer → Odoo
            </button>
          )}
          
          {/* Modifier (désactivé) */}
          <button 
            className={`${menuItemClass} opacity-40 cursor-not-allowed`} 
            disabled 
            title="Non disponible dans le flux IA"
          >
            <PencilSimpleIcon size={14} className="text-gray-500 w-3.5" />
            Modifier
          </button>
          
          {/* Dupliquer (désactivé) */}
          <button 
            className={`${menuItemClass} opacity-40 cursor-not-allowed`} 
            disabled 
            title="Non disponible dans le flux IA"
          >
            <CopyIcon size={14} className="text-gray-500 w-3.5" />
            Dupliquer
          </button>
          
          {/* Exporter PDF */}
          <button 
            className={menuItemClass}
            onClick={() => setIsOpen(false)}
          >
            <DownloadSimpleIcon size={14} className="text-gray-500 w-3.5" />
            Exporter PDF
          </button>
          
          <div className="h-px bg-gray-100 my-1" />
          
          {/* Envoyer */}
          <button
            className={`${menuItemClass} ${!canSend ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={!canSend}
            onClick={() => canSend && handleAction(onSend)}
          >
            <PaperPlaneTiltIcon size={14} className="text-gray-500 w-3.5" />
            Envoyer
          </button>
          
          <div className="h-px bg-gray-100 my-1" />
          
          {/* Supprimer */}
          <button
            className={`${menuItemClass} !text-red-700 hover:!bg-red-50`}
            onClick={() => handleAction(onDelete)}
          >
            <TrashIcon size={14} className="text-red-500 w-3.5" />
            Supprimer
          </button>
        </div>
      )}
    </td>
  );
}