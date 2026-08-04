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

/* ─── FloatingToast ─────────────────────────────────────────────────── */

export interface FloatingToastProps {
  message: string | null;
  type?: 'error' | 'info' | 'success' | 'warning';
}

export function FloatingToast({ message, type = 'success' }: FloatingToastProps) {
  // Définir les couleurs selon le type
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  return (
    <div
      className={cn(
        'fixed bottom-7 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-medium whitespace-nowrap',
        'transition-all duration-200',
        message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
      )}
      style={{ background: '#1B2633', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
    >
      <svg width="14" height="14" viewBox="0 0 256 256" fill={colors[type]} aria-hidden="true">
        {type === 'success' && (
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z" />
        )}
        {type === 'error' && (
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
        )}
        {type === 'warning' && (
          <path d="M236.8,188.09,149.35,36.22a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z" />
        )}
        {type === 'info' && (
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-4,48a12,12,0,1,1-12,12A12,12,0,0,1,124,72Zm12,112H120a8,8,0,0,1,0-16h4V132h-4a8,8,0,0,1,0-16h8a8,8,0,0,1,8,8v44h4a8,8,0,0,1,0,16Z" />
        )}
      </svg>
      {message}
    </div>
  );
}

/* ─── Toast (card) ──────────────────────────────────────────────────── */

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
