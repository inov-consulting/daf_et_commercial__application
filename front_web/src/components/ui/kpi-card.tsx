import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type KpiTrend = 'up' | 'down' | 'neutral' | 'warning';
export type KpiAccent = 'primary' | 'success' | 'warning' | 'secondary';

export interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: KpiTrend;
  trendValue?: string;
  sparkline?: ReactNode;
  accent?: KpiAccent;
  styleValue?: string;
}

const accentBar: Record<KpiAccent, string> = {
  primary: 'bg-[var(--grad)]',
  success: 'bg-success',
  warning: 'bg-warning',
  secondary: 'bg-[linear-gradient(90deg,var(--s400),var(--s600))]',
};

const iconBg: Record<KpiAccent, string> = {
  primary: 'bg-[rgba(14,134,232,.1)] text-primary-500',
  success: 'bg-[rgba(16,185,129,.1)] text-success',
  warning: 'bg-[rgba(245,158,11,.1)] text-warning',
  secondary: 'bg-[rgba(194,37,122,.1)] text-secondary-500',
};

export function KpiCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  sparkline,
  accent = 'primary',
  className,
  styleValue,
  ...props
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'relative bg-surface border border-border rounded-2xl p-[1.125rem_1.375rem]',
        'shadow-xs overflow-hidden cursor-pointer',
        'transition-[box-shadow,transform] duration-norm hover:shadow-md hover:-translate-y-0.5',
        className,
      )}
      {...props}
    >
      {/* Accent top bar */}
      <span className={cn('absolute top-0 left-0 right-0 h-[3px]', accentBar[accent])} aria-hidden="true" />

      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className={cn('w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0', iconBg[accent])}>
            {icon}
          </div>
        )}
        {trend && trendValue && (
          <span
            className={cn(
              'flex items-center gap-[.2rem] text-xs font-semibold px-2 py-[.2rem] rounded-full ml-auto',
              trend === 'up'
                ? 'text-success-600 bg-success-50 dark:text-[#6EE7B7] dark:bg-[rgba(16,185,129,.15)]'
                : trend === 'down'
                  ? 'text-error bg-error-50 dark:text-[#FCA5A5] dark:bg-[rgba(239,68,68,.15)]'
                  : trend === 'warning'
                  ? 'text-warning-600 bg-warning-50 dark:text-[#FBBF24] dark:bg-[rgba(245,158,11,.15)]'
                  :'text-foreground-2 bg-surface-sink',
            )}
          >
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : ''} {trendValue}
          </span>
        )}
      </div>

      <p
        className={cn('font-display text-3xl font-bold text-foreground leading-none mb-[.3rem] tracking-tight', `${styleValue}`)}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </p>
      <p className="text-sm text-foreground-2 mb-3">{label}</p>

      {sparkline && <div aria-hidden="true">{sparkline}</div>}
    </div>
  );
}

