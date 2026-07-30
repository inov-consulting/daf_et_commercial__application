'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface PaginationProps extends HTMLAttributes<HTMLElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

function getPageRange(current: number, total: number, siblings: number): Array<number | '...'> {
  const totalVisible = siblings * 2 + 5;
  if (total <= totalVisible) return Array.from({ length: total }, (_, i) => i + 1);

  const leftSibling = Math.max(current - siblings, 1);
  const rightSibling = Math.min(current + siblings, total);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < total - 1;

  if (!showLeftDots && showRightDots) {
    const left = Array.from({ length: 3 + 2 * siblings }, (_, i) => i + 1);
    return [...left, '...', total];
  }
  if (showLeftDots && !showRightDots) {
    const right = Array.from({ length: 3 + 2 * siblings }, (_, i) => total - (3 + 2 * siblings) + i + 1);
    return [1, '...', ...right];
  }
  const middle = Array.from({ length: rightSibling - leftSibling + 1 }, (_, i) => leftSibling + i);
  return [1, '...', ...middle, '...', total];
}

const pgBtn = (isActive: boolean, disabled: boolean) =>
  cn(
    'min-w-[34px] h-[34px] px-2 rounded-lg border-[1.5px] text-sm font-medium',
    'flex items-center justify-center cursor-pointer transition-all duration-fast',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-[3px]',
    isActive
      ? 'bg-primary-500 text-white border-primary-500'
      : 'bg-surface text-foreground-2 border-border hover:bg-surface-mute hover:text-foreground hover:border-border-strong',
    disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
  );

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
  ...props
}: PaginationProps) {
  const pages = getPageRange(currentPage, totalPages, siblingCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Page précédente"
        className={pgBtn(false, currentPage === 1)}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`dots-${i}`} className="min-w-[34px] h-[34px] flex items-center justify-center text-foreground-3 text-sm">
            ···
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            aria-current={currentPage === page ? 'page' : undefined}
            className={pgBtn(currentPage === page, false)}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Page suivante"
        className={pgBtn(false, currentPage === totalPages)}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </nav>
  );
}
