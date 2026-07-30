'use client';

import { HTMLAttributes, ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T extends { id: string | number }> extends HTMLAttributes<HTMLDivElement> {
  columns: Column<T>[];
  data: T[];
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
}

function SortArrows({ direction }: { direction: SortDirection }) {
  return (
    <span className="inline-flex flex-col gap-px ml-1 align-middle" aria-hidden="true">
      <span className={cn('w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[3.5px] border-b-current', direction === 'asc' ? 'opacity-100 text-primary-500' : 'opacity-30')} />
      <span className={cn('w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[3.5px] border-t-current', direction === 'desc' ? 'opacity-100 text-primary-500' : 'opacity-30')} />
    </span>
  );
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  emptyState,
  onRowClick,
  rowActions,
  className,
  ...props
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  return (
    <div
      className={cn('border border-border rounded-2xl overflow-hidden bg-surface', className)}
      {...props}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-sink">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={cn(
                    'px-4 py-[.625rem] text-left text-xs font-semibold tracking-wide uppercase',
                    'text-foreground-2 border-b border-border whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none hover:text-foreground',
                    col.className,
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  {col.header}
                  {col.sortable && (
                    <SortArrows direction={sortKey === col.key ? sortDir : null} />
                  )}
                </th>
              ))}
              {rowActions && <th scope="col" className="px-4 py-[.625rem] border-b border-border w-[1%]" />}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="text-center py-12 text-foreground-3">
                  {emptyState ?? 'Aucune donnée'}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border last:border-b-0',
                    'transition-colors duration-fast hover:bg-surface-mute',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-[.8rem] text-foreground align-middle', col.className)}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                  {rowActions && (
                    <td
                      className="px-4 py-[.8rem] align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-[.3rem] justify-end opacity-0 group-hover:opacity-100 [tr:hover_&]:opacity-100 transition-opacity duration-fast">
                        {rowActions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TableActionButton({ label, onClick, className, children }: {
  label: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        'w-7 h-7 rounded-md border border-border bg-surface text-foreground-2',
        'flex items-center justify-center cursor-pointer',
        'hover:bg-surface-mute hover:text-foreground hover:border-border-strong',
        'transition-all duration-fast',
        className,
      )}
    >
      {children}
    </button>
  );
}
