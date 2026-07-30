import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ProgressColor = 'primary' | 'accent' | 'secondary' | 'success' | 'warning' | 'error';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: ProgressColor;
  shimmer?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const colorClasses: Record<ProgressColor, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  secondary: 'bg-secondary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

const valueColorClasses: Record<ProgressColor, string> = {
  primary: 'text-primary-500',
  accent: 'text-[var(--s600)]',
  secondary: 'text-[var(--s600)]',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  color = 'primary',
  shimmer = true,
  size = 'md',
  className,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('flex flex-col gap-[.375rem]', className)} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs text-foreground-2">
          {label && <span>{label}</span>}
          {showValue && (
            <span className={cn('font-semibold', valueColorClasses[color])}>
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-label={label}
        className={cn(
          'w-full rounded-full overflow-hidden bg-[var(--bg-sink)]',
          sizeClasses[size],
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-slower ease-out',
            colorClasses[color],
            shimmer && color === 'primary' && 'progress-shimmer',
          )}
          style={{
            width: `${pct}%`,
          }}
        />
      </div>
    </div>
  );
}
