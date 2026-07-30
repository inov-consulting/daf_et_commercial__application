'use client';

interface UsageItem {
  name: string;
  used: number;
  total: number;
  percentage: number;
}

export function UsageBlock() {
  const usageItems: UsageItem[] = [
    { name: 'Extractions cartes de visite', used: 1432, total: 2000, percentage: 72 },
    { name: 'CR vocaux générés', used: 287, total: 500, percentage: 57 },
    { name: 'Offres générées', used: 98, total: 200, percentage: 49 },
    { name: 'Synthèses DAF envoyées', used: 13, total: 30, percentage: 43 },
  ];

  return (
    <div className="bg-white border border-[#DDE5EF] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-[14px] border-b border-[#EEF2F7]">
        <span className="font-space-grotesk text-sm font-semibold text-[#1B2633]">Consommation — Juin 2026</span>
        <span className="font-inter text-[11px] text-[#9EB0C4]">Réinitialisé le 1er juillet</span>
      </div>
      
      {usageItems.map((item, index) => (
        <div key={index} className={`px-5 py-3 ${index < usageItems.length - 1 ? 'border-b border-[#EEF2F7]' : ''}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-inter text-[13px] font-medium text-[#2E3D4C]">{item.name}</span>
            <span className="font-jetbrains-mono text-xs text-[#435869]">
              {item.used.toLocaleString()} / {item.total.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 bg-[#DDE5EF] rounded overflow-hidden">
            <div 
              className={`h-full rounded ${item.percentage >= 70 ? 'bg-[#F59E0B]' : 'bg-primary'}`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
          <div className="font-inter text-[11px] text-[#7691A8] text-right mt-1">
            {item.percentage}% utilisé
          </div>
        </div>
      ))}
      
      <div className="flex items-start gap-2 px-5 py-2.5 bg-[#FDF7E4] border-t border-[#D9B96A]">
        <span className="text-sm text-[#8C6E24]">⚠</span>
        <span className="font-inter text-xs text-[#7A5C1E]">
          Les extractions atteignent 72% du quota. Envisagez une mise à niveau.
        </span>
      </div>
    </div>
  );
}