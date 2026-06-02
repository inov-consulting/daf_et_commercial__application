import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  title?: string;
  icon?: ReactNode;
  onDismiss?: () => void;
}

const typeClasses: Record<AlertType, string> = {
  info: 'bg-primary-50 border-[rgba(14,134,232,.3)] text-primary-700 dark:bg-[rgba(14,134,232,.1)] dark:border-[rgba(14,134,232,.3)] dark:text-primary-300',
  success: 'bg-success-50 border-[rgba(16,185,129,.3)] text-success-600 dark:bg-[rgba(16,185,129,.1)] dark:border-[rgba(16,185,129,.3)] dark:text-[#6EE7B7]',
  warning: 'bg-warning-50 border-[rgba(245,158,11,.3)] text-warning-600 dark:bg-[rgba(245,158,11,.1)] dark:border-[rgba(245,158,11,.3)] dark:text-[#FCD34D]',
  error: 'bg-error-50 border-[rgba(239,68,68,.3)] text-error-600 dark:bg-[rgba(239,68,68,.1)] dark:border-[rgba(239,68,68,.3)] dark:text-[#FCA5A5]',
};

const defaultIcons: Record<AlertType, ReactNode> = {
  info: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  success: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

export function Alert({ type = 'info', title, icon, onDismiss, className, children, ...props }: AlertProps) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'flex gap-3 p-[.8rem_1rem] rounded-xl border text-sm',
        typeClasses[type],
        className,
      )}
      {...props}
    >
      <span className="shrink-0 w-[17px] h-[17px] mt-px" aria-hidden="true">
        {icon ?? defaultIcons[type]}
      </span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-[.125rem]">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Fermer"
          className="shrink-0 opacity-45 hover:opacity-100 transition-opacity duration-fast bg-transparent border-0 cursor-pointer text-current leading-none"
        >
          ✕
        </button>
      )}
    </div>
  );
}
