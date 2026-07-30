'use client';

export function PreferencesRegionales() {
  return (
    <div className="bg-white rounded-xl border border-[#DDE5EF] overflow-hidden">
      <div className="px-5 py-[14px] border-b border-[#EEF2F7] font-space-grotesk text-sm font-semibold text-[#1B2633]">
        Préférences régionales
      </div>
      <div className="p-5 flex flex-col gap-3">
        <div>
          <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Devise</div>
          <select className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]">
            <option>FCFA — Franc CFA</option>
            <option>EUR</option>
          </select>
        </div>
        <div>
          <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Fuseau horaire</div>
          <select className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]">
            <option>Africa/Dakar (UTC+0)</option>
            <option>Africa/Abidjan (UTC+0)</option>
          </select>
        </div>
        <div>
          <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Langue</div>
          <select className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]">
            <option>Français</option>
            <option>English</option>
          </select>
        </div>
        <div>
          <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Format de date</div>
          <select className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-[13px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]">
            <option>JJ/MM/AAAA</option>
            <option>MM/DD/YYYY</option>
          </select>
        </div>
      </div>
    </div>
  );
}