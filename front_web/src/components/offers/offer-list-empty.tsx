import { PlusIcon } from '@phosphor-icons/react';

interface OfferListEmptyProps {
  hasSearch: boolean;
  hasFilter: boolean;
  onCreateNew: () => void;
}

export function OfferListEmpty({ hasSearch, hasFilter, onCreateNew }: OfferListEmptyProps) {
  const getMessage = () => {
    if (hasSearch) return 'Aucun résultat pour cette recherche.';
    if (hasFilter) return 'Aucune offre avec ce statut.';
    return "Créez votre première offre avec l'agent IA.";
  };
  
  return (
    <tr>
      <td colSpan={8} className="p-15 text-center">
        <div className="flex flex-col items-center gap-2.5">
          <div className="text-4xl">📋</div>
          <div className="text-sm font-bold text-gray-900">
            Aucune offre trouvée
          </div>
          <div className="text-xs text-gray-400 max-w-65 text-center">
            {getMessage()}
          </div>
          {!hasSearch && !hasFilter && (
            <button 
              onClick={onCreateNew} 
              className="mt-1 h-9 px-5 bg-emerald-800 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-sm hover:bg-emerald-900 transition-colors"
            >
              <PlusIcon size={14} weight="fill" />
              Nouvelle offre
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}