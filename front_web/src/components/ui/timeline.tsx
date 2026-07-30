import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TimelineItemStatus = 'done' | 'active' | 'pending' | 'warning';

export interface TimelineItem {
  id: string;
  title: string;
  date?: string;
  description?: string;
  status?: TimelineItemStatus;
}

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  items: TimelineItem[];
}

const dotClasses: Record<TimelineItemStatus, string> = {
  done: 'bg-success border-surface shadow-[0_0_0_2px_#10B981]',
  active: 'bg-primary-500 border-surface animate-[pulse-dot_1.5s_ease-out_infinite]',
  pending: 'bg-neutral-300 border-surface shadow-[0_0_0_2px_var(--bd-def)]',
  warning: 'bg-warning border-surface shadow-[0_0_0_2px_#F59E0B]',
};

export function Timeline({ items, className, ...props }: TimelineProps) {
  return (
    <ol
      className={cn('relative pl-6', className)}
      style={{
        '--before-bg': 'var(--bd-def)',
      } as React.CSSProperties}
      {...props}
    >
      {/* Vertical line */}
      <span
        className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border"
        aria-hidden="true"
      />

      {items.map((item, i) => {
        const status = item.status ?? 'pending';
        const isLast = i === items.length - 1;
        return (
          <li key={item.id} className={cn('relative', !isLast && 'pb-6')}>
            <span
              className={cn(
                'absolute -left-6 top-1 w-4 h-4 rounded-full border-[2.5px]',
                dotClasses[status],
              )}
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-foreground leading-none mb-[.1rem]">
              {item.title}
            </p>
            {item.date && (
              <p className="font-mono text-xs text-foreground-3">{item.date}</p>
            )}
            {item.description && (
              <p className="text-xs text-foreground-2 mt-[.2rem]">{item.description}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
