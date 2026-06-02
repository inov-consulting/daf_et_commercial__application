'use client';

import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ActiveFilter {
  key: string;
  label: string;
}

export interface FilterBarProps extends HTMLAttributes<HTMLDivElement> {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (key: string) => void;
  filterControls?: ReactNode;
  onFilterClick?: () => void;
}

export function FilterBar({
  searchPlaceholder = 'Rechercher…',
  searchValue = '',
  onSearchChange,
  activeFilters = [],
  onRemoveFilter,
  filterControls,
  onFilterClick,
  className,
  ...props
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-[.625rem] flex-wrap',
        'px-4 py-[.875rem] bg-surface border border-border rounded-2xl',
        className,
      )}
      {...props}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-3 pointer-events-none w-4 h-4"
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className={cn(
            'w-full h-[34px] pl-[2.375rem] pr-3 rounded-lg bg-surface text-foreground',
            'text-xs border-[1.5px] border-border-strong outline-none appearance-none',
            'placeholder:text-foreground-3',
            'hover:border-primary-400 focus:border-border-focus',
            'focus:shadow-[0_0_0_3px_rgba(14,134,232,.14)]',
            'transition-[border-color,box-shadow] duration-fast',
          )}
        />
      </div>

      {/* Additional filter controls slot */}
      {filterControls}

      {/* Filter button */}
      {onFilterClick && (
        <button
          onClick={onFilterClick}
          className={cn(
            'h-[34px] px-3 flex items-center gap-[.3rem] text-xs font-medium',
            'text-foreground-2 bg-surface border-[1.5px] border-border rounded-lg',
            'hover:bg-surface-mute hover:text-foreground hover:border-border-strong',
            'transition-all duration-fast cursor-pointer',
          )}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="10" y1="18" x2="14" y2="18"/>
          </svg>
          Filtres
        </button>
      )}

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-[.375rem] flex-wrap">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className={cn(
                'inline-flex items-center gap-[.3rem] text-xs font-medium',
                'bg-[rgba(14,134,232,.1)] text-primary-600 border border-primary-200 rounded-full',
                'py-[.175rem] pl-[.7rem] pr-[.5rem]',
                'dark:bg-[rgba(14,134,232,.15)] dark:text-primary-400 dark:border-[rgba(14,134,232,.3)]',
              )}
            >
              {f.label}
              {onRemoveFilter && (
                <button
                  onClick={() => onRemoveFilter(f.key)}
                  aria-label={`Retirer le filtre ${f.label}`}
                  className="opacity-55 hover:opacity-100 transition-opacity bg-transparent border-0 cursor-pointer text-current leading-none text-sm p-0"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
