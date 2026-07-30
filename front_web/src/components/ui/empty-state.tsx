import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center px-8 py-12',
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="w-[60px] h-[60px] bg-surface-sink rounded-2xl flex items-center justify-center mb-[1.125rem] text-foreground-3">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-foreground-3 max-w-[300px] leading-relaxed mb-5">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
