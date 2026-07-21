import { VALIDITY_LEGEND } from '@/lib/constants';

export function Legend() {
  return (
    <div className="mt-3 flex items-center gap-3 sm:gap-4 flex-wrap">
      <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
        Validité :
      </span>
      <div className="flex items-center gap-3 sm:gap-4">
        {VALIDITY_LEGEND.map(({ dot, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500">
            <span 
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: dot }} 
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}