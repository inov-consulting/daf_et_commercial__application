'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary' | 'secondary' | 'ghost'
  | 'danger' | 'success' | 'gradient' | 'outline-gradient' | 'login';

export type ButtonSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconOnly?: boolean;
}

const sizeClasses: Record<ButtonSize, string> = {
  '2xs': 'h-6 px-2 text-[.6875rem] rounded-md',
  xs: 'h-7 px-[.625rem] text-xs rounded-md',
  sm: 'h-[34px] px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-12 px-[1.375rem] text-base rounded-xl',
  xl: 'h-14 px-7 text-lg rounded-xl',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  '2xs': 'h-6 w-6 p-0 rounded-md',
  xs: 'h-7 w-7 p-0 rounded-md',
  sm: 'h-[34px] w-[34px] p-0 rounded-lg',
  md: 'h-10 w-10 p-0 rounded-lg',
  lg: 'h-12 w-12 p-0 rounded-xl',
  xl: 'h-14 w-14 p-0 rounded-xl',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary-500 text-white border-primary-500',
    '[&:not(:disabled)]:hover:bg-primary-600 [&:not(:disabled)]:hover:border-primary-600',
    '[&:not(:disabled)]:hover:-translate-y-px [&:not(:disabled)]:hover:shadow-[0_4px_14px_rgba(14,134,232,.38)]',
    '[&:not(:disabled)]:active:bg-primary-700 [&:not(:disabled)]:active:translate-y-0 [&:not(:disabled)]:active:shadow-none',
  ].join(' '),
  secondary: [
    'bg-[rgba(14,134,232,.08)] text-primary-600 border-primary-300',
    '[&:not(:disabled)]:hover:bg-[rgba(14,134,232,.15)] [&:not(:disabled)]:hover:border-primary-400',
    '[&:not(:disabled)]:hover:-translate-y-px',
    'dark:text-primary-400 dark:border-primary-800 dark:bg-[rgba(14,134,232,.12)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-foreground-2 border-border',
    '[&:not(:disabled)]:hover:bg-surface-mute [&:not(:disabled)]:hover:text-foreground',
    '[&:not(:disabled)]:hover:border-border-strong',
  ].join(' '),
  danger: [
    'bg-error text-white border-error',
    '[&:not(:disabled)]:hover:bg-error-600 [&:not(:disabled)]:hover:border-error-600',
    '[&:not(:disabled)]:hover:-translate-y-px [&:not(:disabled)]:hover:shadow-[0_4px_14px_rgba(239,68,68,.38)]',
  ].join(' '),
  success: [
    'bg-success text-white border-success',
    '[&:not(:disabled)]:hover:bg-success-600 [&:not(:disabled)]:hover:border-success-600',
    '[&:not(:disabled)]:hover:-translate-y-px [&:not(:disabled)]:hover:shadow-[0_4px_14px_rgba(16,185,129,.38)]',
  ].join(' '),
  gradient: [
    'text-white border-transparent',
    '[&:not(:disabled)]:hover:-translate-y-px [&:not(:disabled)]:hover:shadow-[0_4px_16px_rgba(107,53,201,.42)]',
  ].join(' '),
  'outline-gradient': 'btn-outline-grad text-primary-600 border-transparent',
  login: [
    'btn-login text-white border-transparent',
    '[&:not(:disabled)]:hover:-translate-y-px',
  ].join(' '),
};

const spinnerClasses: Record<ButtonVariant, string> = {
  primary: 'border-white/30 border-t-white',
  gradient: 'border-white/30 border-t-white',
  danger: 'border-white/30 border-t-white',
  success: 'border-white/30 border-t-white',
  secondary: 'border-primary-500/25 border-t-primary-500',
  ghost: 'border-primary-500/25 border-t-primary-500',
  'outline-gradient': 'border-primary-500/25 border-t-primary-500',
  login: 'border-white/30 border-t-white',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, iconOnly = false,
      className, children, disabled, style, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        style={variant === 'gradient' ? { background: 'var(--grad)', ...style } : style}
        className={cn(
          'relative inline-flex items-center justify-center gap-2',
          'font-body font-semibold border-[1.5px] cursor-pointer whitespace-nowrap',
          'transition-all duration-norm ease outline-none tracking-[.01em]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px]',
          'focus-visible:outline-border-focus rounded-[inherit]',
          'disabled:opacity-[.42] disabled:cursor-not-allowed',
          iconOnly ? iconSizeClasses[size] : sizeClasses[size],
          variantClasses[variant],
          loading && 'text-transparent pointer-events-none',
          className,
        )}
        {...props}
      >
        {children}
        {loading && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute inline-block rounded-full animate-spin w-[15px] h-[15px] border-2',
              spinnerClasses[variant],
            )}
          />
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';
