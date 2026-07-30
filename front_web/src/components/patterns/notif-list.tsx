import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type NotifType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type?: NotifType;
  title: string;
  description?: string;
  time?: string;
  unread?: boolean;
  icon?: ReactNode;
}

export interface NotifListProps extends HTMLAttributes<HTMLDivElement> {
  notifications: Notification[];
  onNotifClick?: (id: string) => void;
}

const defaultIcon: Record<NotifType, ReactNode> = {
  info: (
    <svg width="16" height="16" fill="none" stroke="#1B6B45" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  success: (
    <svg width="16" height="16" fill="none" stroke="#10B981" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  warning: (
    <svg width="16" height="16" fill="none" stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    </svg>
  ),
  error: (
    <svg width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
};

const iconBg: Record<NotifType, string> = {
  info:    'bg-[rgba(27,107,69,.1)]',
  success: 'bg-[rgba(16,185,129,.1)]',
  warning: 'bg-[rgba(245,158,11,.1)]',
  error:   'bg-[rgba(239,68,68,.1)]',
};

export function NotifList({ notifications, onNotifClick, className, ...props }: NotifListProps) {
  return (
    <div
      className={cn('bg-surface border border-border rounded-2xl overflow-hidden', className)}
      {...props}
    >
      {notifications.map((n) => {
        const type = n.type ?? 'info';
        return (
          <div
            key={n.id}
            role="listitem"
            tabIndex={0}
            onClick={() => onNotifClick?.(n.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNotifClick?.(n.id); }}
            className={cn(
              'relative flex items-start gap-[.875rem] px-5 py-[.875rem]',
              'border-b border-border last:border-b-0',
              'transition-colors duration-fast cursor-pointer hover:bg-surface-mute',
              n.unread && 'bg-[rgba(27,107,69,.04)]',
            )}
          >
            {/* Unread indicator */}
            {n.unread && (
              <span
                className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary-500"
                aria-label="Non lu"
                aria-hidden="true"
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                'w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0',
                iconBg[type],
              )}
              aria-hidden="true"
            >
              {n.icon ?? defaultIcon[type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm text-foreground', n.unread && 'font-medium')}>{n.title}</p>
              {n.description && (
                <p className="text-xs text-foreground-3 mt-[.1rem]">{n.description}</p>
              )}
            </div>

            {/* Time */}
            {n.time && (
              <span className="font-mono text-xs text-foreground-3 whitespace-nowrap ml-auto shrink-0">
                {n.time}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
