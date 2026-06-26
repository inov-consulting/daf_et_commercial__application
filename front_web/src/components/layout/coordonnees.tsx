'use client';

export function Coordonnees() {
  return (
    <div className="bg-white rounded-xl border border-[#DDE5EF] mb-4 overflow-hidden">
      <div className="px-5 py-[14px] border-b border-[#EEF2F7] font-space-grotesk text-sm font-semibold text-[#1B2633]">
        Coordonnées de contact
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Téléphone principal</div>
            <input 
              type="tel" 
              value="+221 77 890 12 34"
              className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
            />
          </div>
          <div>
            <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Email professionnel</div>
            <input 
              type="email" 
              value="contact@portalis-group.sn"
              className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
            />
          </div>
        </div>
        <div>
          <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Site web</div>
          <input 
            type="url" 
            value="www.portalis-group.sn"
            className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
          />
        </div>
      </div>
    </div>
  );
}