'use client';

export function Responsables() {
  return (
    <div className="bg-white rounded-xl border border-[#DDE5EF] mb-4 overflow-hidden">
      <div className="px-5 py-[14px] border-b border-[#EEF2F7] font-space-grotesk text-sm font-semibold text-[#1B2633]">
        Responsables clés
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2.5 p-2.5 border border-[#DDE5EF] rounded-lg mb-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-space-grotesk text-[11px] font-semibold text-white flex-shrink-0">
            HK
          </div>
          <div>
            <div className="font-inter text-[13px] font-medium text-[#1B2633]">Hawa Konaté</div>
            <div className="font-inter text-[11px] text-[#7691A8] mt-px">Directrice Générale</div>
          </div>
          <div className="ml-auto flex gap-4">
            <div>
              <div className="font-inter text-[11px] font-medium text-[#435869] mb-0.5">Email</div>
              <div className="font-jetbrains-mono text-[11px] text-[#435869]">h.konate@portalis-group.sn</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2.5 border border-[#DDE5EF] rounded-lg bg-[#F7F9FC]">
          <div className="w-8 h-8 rounded-full bg-[#435869] flex items-center justify-center font-space-grotesk text-[11px] font-semibold text-white flex-shrink-0">
            FC
          </div>
          <div>
            <div className="font-inter text-[13px] font-medium text-[#1B2633]">Fatou Camara</div>
            <div className="font-inter text-[11px] text-[#7691A8] mt-px">Directrice Administrative &amp; Financière</div>
          </div>
          <div className="ml-auto">
            <div className="font-jetbrains-mono text-[11px] text-[#435869]">f.camara@portalis-group.sn</div>
          </div>
        </div>
      </div>
    </div>
  );
}