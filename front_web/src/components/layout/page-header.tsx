'use client';

interface PageHeaderProps {
  pendingCount: number;
}

export function PageHeader({ pendingCount }: PageHeaderProps) {
  return (
    <div className="mb-4">
      <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
        Centre IA
      </h1>
      <div className="flex items-center gap-4 mb-4">
        <span className="font-inter text-sm text-[#7691A8]">
          Hub de validation des outputs IA · Paradigme 70/30
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 h-[30px] px-3 bg-[#E8F7F0] border border-primary rounded-full">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] text-white">◉</span>
          </div>
          <span className="font-inter text-[13px] font-semibold text-primary">
            {pendingCount} items
          </span>
        </div>
      </div>
      <div className="w-[1116px] h-[2px] bg-primary opacity-20" />
    </div>
  );
}