'use client';

export function InformationsGenerales() {
  return (
    <div className="bg-white rounded-xl border border-[#DDE5EF] mb-4 overflow-hidden">
      <div className="px-5 py-[14px] border-b border-[#EEF2F7] font-space-grotesk text-sm font-semibold text-[#1B2633]">
        Informations générales
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Raison sociale</div>
            <input 
              type="text" 
              value="PortaLis Group Holding"
              className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
            />
          </div>
          <div>
            <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Sigle / Abréviation</div>
            <input 
              type="text" 
              value="PGH"
              className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Secteur d&apos;activité</div>
            <select className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]">
              <option>Services financiers &amp; BTP</option>
              <option>Transports &amp; Logistique</option>
              <option>Commerce &amp; Distribution</option>
            </select>
          </div>
          <div>
            <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Effectif</div>
            <select className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]">
              <option>10–49 employés</option>
              <option>50–249 employés</option>
              <option>250+ employés</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}