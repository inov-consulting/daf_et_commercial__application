import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRightIcon } from '@phosphor-icons/react';

interface FinCardProps {
  children:  ReactNode;
  className?: string;
  padding?:  boolean;
}

export function FinCard({ children, className, padding = true }: FinCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[var(--bd-def)] rounded-2xl shadow-[var(--sh-xs)] overflow-hidden',
        padding && 'p-4 sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface FinCardHeaderProps {
  title:      string;
  badge?:     ReactNode;
  action?:    string;
  onAction?:  () => void;
  className?: string;
}

export function FinCardHeader({ title, badge, action, onAction, className }: FinCardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3 sm:mb-4', className)}>
      <div className="flex items-center gap-2 min-w-0">
        <p className="font-semibold text-sm text-[var(--tx-1)] truncate">{title}</p>
        {badge}
      </div>
      {action && (
        <button
          onClick={onAction}
          className="text-xs font-medium text-[var(--p500)] hover:underline flex items-center gap-1 flex-shrink-0"
        >
          {action} <ArrowRightIcon size={12} />
        </button>
      )}
    </div>
  );
}

interface SectionLabelProps { children: ReactNode; className?: string }
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p className={cn('text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] font-mono mb-2', className)}>
      {children}
    </p>
  );
}
