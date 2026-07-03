import { VALIDITY_LEGEND } from '@/lib/constants';

export function Legend() {
  return (
    <div className="mt-3 text-xs text-gray-500 flex items-center gap-4.5 flex-wrap">
      <span className="font-semibold text-gray-600 uppercase tracking-wider text-xxs">
        Validité :
      </span>
      {VALIDITY_LEGEND.map(({ dot, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span 
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 inline-block"
            style={{ backgroundColor: dot }} 
          />
          {label}
        </span>
      ))}
    </div>
  );
}