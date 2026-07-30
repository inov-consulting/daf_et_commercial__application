'use client';

interface EmptyStateProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, iconColor, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-13 px-8 text-center gap-2">
      <span className="text-[32px] block leading-none" style={{ color: iconColor }}>
        {icon}
      </span>
      <div className="font-space-grotesk text-sm font-semibold text-[#435869]">{title}</div>
      <div className="font-inter text-xs text-neutral">{subtitle}</div>
    </div>
  );
}