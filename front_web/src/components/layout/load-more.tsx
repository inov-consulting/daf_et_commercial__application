'use client';

interface LoadMoreProps {
  onLoad: () => void;
}

export function LoadMore({ onLoad }: LoadMoreProps) {
  return (
    <div className="flex justify-center mt-2.5">
      <button 
        onClick={onLoad}
        className="flex items-center gap-1.5 h-9 px-[18px] border border-neutral-400 rounded-lg bg-white text-[#7691A8] font-inter text-xs font-medium hover:bg-neutral-100 hover:border-[#C8D5E0] hover:text-[#435869] transition-all"
      >
        Voir 4 autres items
        <span className="text-[11px]">▾</span>
      </button>
    </div>
  );
}