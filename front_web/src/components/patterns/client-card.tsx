import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Badge, BadgeColor } from '../ui/badge';

export interface ClientStat {
  label: string;
  value: string | number;
}

export interface ClientCardProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  initials: string;
  since?: string;
  location?: string;
  status?: string;
  statusColor?: BadgeColor;
  stats?: ClientStat[];
}

export function ClientCard({
  name,
  initials,
  since,
  location,
  status,
  statusColor = 'success',
  stats = [],
  className,
  ...props
}: ClientCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-2xl p-[1.25rem_1.5rem] shadow-xs',
        'cursor-pointer transition-[box-shadow,transform] duration-norm',
        'hover:shadow-md hover:-translate-y-0.5',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-[.875rem] mb-4">
        {/* Logo / initials */}
        <div
          className="w-[42px] h-[42px] rounded-xl flex items-center justify-center font-display text-sm font-bold text-white shrink-0"
          style={{ background: 'var(--grad)' }}
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold text-foreground">{name}</p>
          {(since || location) && (
            <p className="text-xs text-foreground-3">
              {[since && `Depuis ${since}`, location].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {status && (
          <Badge color={statusColor} variant="subtle" className="ml-auto shrink-0">
            {status}
          </Badge>
        )}
      </div>

      {stats.length > 0 && (
        <div
          className={cn(
            'grid gap-3 pt-[.875rem] border-t border-border',
            stats.length === 3 ? 'grid-cols-3' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-1',
          )}
        >
          {stats.map((s, i) => (
            <div key={i}>
              <span className="font-display text-lg font-bold text-foreground block">{s.value}</span>
              <span className="text-[.6875rem] text-foreground-3 block mt-[.1rem]">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
