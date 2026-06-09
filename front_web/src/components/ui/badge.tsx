import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeColor =
  | 'primary' | 'secondary' | 'accent'
  | 'success' | 'warning' | 'error' | 'neutral' | 'white';

export type BadgeVariant = 'solid' | 'subtle' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  variant?: BadgeVariant;
  dot?: boolean;
}

const colorVariant: Record<BadgeColor, Record<BadgeVariant, string>> = {
  primary: {
    solid: 'bg-primary-500 text-white',
    subtle: 'bg-primary-50 text-primary-700 dark:bg-[rgba(27,107,69,.15)] dark:text-primary-300',
    outline: 'bg-transparent text-primary-600 border-[1.5px] border-primary-300',
  },
  secondary: {
    solid: 'bg-secondary-500 text-white',
    subtle: 'bg-secondary-50 text-secondary-700 dark:bg-[rgba(139,105,20,.15)] dark:text-secondary-300',
    outline: 'bg-transparent text-secondary-600 border-[1.5px] border-secondary-300',
  },
  accent: {
    solid: 'bg-accent-500 text-white',
    subtle: 'bg-accent-50 text-accent-700 dark:bg-[rgba(139,105,20,.15)] dark:text-accent-300',
    outline: 'bg-transparent text-accent-600 border-[1.5px] border-accent-300',
  },
  success: {
    solid: 'bg-success text-white',
    subtle: 'bg-success-50 text-success-600 dark:bg-[rgba(16,185,129,.15)] dark:text-[#6EE7B7]',
    outline: 'bg-transparent text-success-600 border-[1.5px] border-[#6EE7B7]',
  },
  warning: {
    solid: 'bg-warning text-white',
    subtle: 'bg-warning-50 text-warning-600 dark:bg-[rgba(245,158,11,.15)] dark:text-[#FCD34D]',
    outline: 'bg-transparent text-warning-600 border-[1.5px] border-[#FCD34D]',
  },
  error: {
    solid: 'bg-error text-white',
    subtle: 'bg-error-50 text-error-600 dark:bg-[rgba(239,68,68,.15)] dark:text-[#FCA5A5]',
    outline: 'bg-transparent text-error-600 border-[1.5px] border-[#FCA5A5]',
  },
  neutral: {
    solid: 'bg-neutral-700 text-white',
    subtle: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    outline: 'bg-transparent text-neutral-600 border-[1.5px] border-neutral-300',
  },
  white: {
    solid: 'bg-white text-[var(--tx-1)]',
    subtle: 'bg-white/80 text-[var(--tx-1)]',
    outline: 'bg-transparent text-white border-[1.5px] border-white',
  },
};

const dotColor: Record<BadgeColor, string> = {
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500',
  accent: 'bg-accent-500',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  neutral: 'bg-neutral-400',
  white: 'bg-white',
};

export function Badge({
  color = 'primary',
  variant = 'subtle',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[.3rem] text-xs font-medium leading-none',
        'px-[.625rem] py-[.4rem] rounded-full whitespace-nowrap',
        colorVariant[color][variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor[color])}
        />
      )}
      {children}
    </span>
  );
}
