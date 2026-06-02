import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  type?: ToastType;
  title: string;
  message?: string;
  icon?: ReactNode;
  onDismiss?: () => void;
}

const accentColor: Record<ToastType, string> = {
  info: 'bg-primary-500',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

const iconColor: Record<ToastType, string> = {
  info: 'text-primary-500',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

const defaultIcons: Record<ToastType, ReactNode> = {
  info: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  success: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
}; 

export function Toast({ type = 'info', title, message, icon, onDismiss, className, ...props }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        'relative flex items-start gap-3 bg-surface border border-border rounded-xl',
        'p-[.8rem_1rem] shadow-lg max-w-xs text-sm overflow-hidden',
        className,
      )}
      {...props}
    >
      {/* Accent bar */}
      <span className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl', accentColor[type])} aria-hidden="true" />

      <span className={cn('shrink-0 w-[18px] h-[18px]', iconColor[type])} aria-hidden="true">
        {icon ?? defaultIcons[type]}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        {message && <p className="text-foreground-2 text-xs mt-[.125rem]">{message}</p>}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Fermer"
          className="shrink-0 opacity-45 hover:opacity-100 transition-opacity duration-fast bg-transparent border-0 cursor-pointer text-foreground-3 leading-none"
        >
          ✕
        </button>
      )}
    </div>
  );
}
