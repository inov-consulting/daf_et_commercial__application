import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge, BadgeColor } from '../ui/badge';
import { Breadcrumb, BreadcrumbItem } from '../ui/breadcrumb';

export interface DashboardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  breadcrumb?: BreadcrumbItem[];
  statusLabel?: string;
  statusColor?: BadgeColor;
  meta?: Array<{ label: string; value: string; mono?: boolean }>;
  actions?: ReactNode;
}

export function DashboardHeader({
  title,
  breadcrumb,
  statusLabel,
  statusColor = 'primary',
  meta = [],
  actions,
  className,
  ...props
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 flex-wrap',
        'p-6 bg-surface border border-border rounded-2xl shadow-xs',
        className,
      )}
      {...props}
    >
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumb items={breadcrumb} className="mb-2" />
        )}
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
          {title}
        </h1>
        {(statusLabel || meta.length > 0) && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {statusLabel && (
              <Badge color={statusColor} variant="subtle" dot>
                {statusLabel}
              </Badge>
            )}
            {meta.map((m, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-foreground-3 text-sm">·</span>}
                {m.mono
                  ? <code className="font-mono text-xs text-foreground-2">{m.value}</code>
                  : <span className="text-sm text-foreground-2">{m.value}</span>
                }
              </span>
            ))}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-[.625rem] shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
