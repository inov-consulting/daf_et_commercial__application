import type { PaginationProps } from '@/types';
import { getPageNumbers } from '@/lib/utils';

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  perPage, 
  onPerPageChange,
  totalItems 
}: PaginationProps) {
  const startItem = Math.min((currentPage - 1) * perPage + 1, totalItems);
  const endItem = Math.min(currentPage * perPage, totalItems);
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  
  return (
    <div className="flex items-center justify-between mt-3.5 text-xs text-gray-500">
      <span>
        Affichage {startItem}–{endItem} sur {totalItems} offre{totalItems !== 1 ? 's' : ''}
      </span>
      
      <div className="flex items-center gap-2">
        {totalPages > 1 && (
          <>
            <button
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="h-7 px-2.5 border border-gray-200 rounded-md bg-white text-gray-700 text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              ← Préc.
            </button>
            
            {pageNumbers.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                  page === currentPage
                    ? 'bg-emerald-800 text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="h-7 px-2.5 border border-gray-200 rounded-md bg-white text-gray-700 text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Suiv. →
            </button>
          </>
        )}
        
        <div className="flex items-center gap-2">
          Afficher
          <select
            value={perPage}
            onChange={e => onPerPageChange(Number(e.target.value))}
            className="border border-gray-200 rounded-md h-7 px-2 text-xs text-gray-900 bg-white cursor-pointer"
          >
            {[20, 50, 100].map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          par page
        </div>
      </div>
    </div>
  );
}