'use client';

import { HTMLAttributes, ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  key: string;
  label: ReactNode;
  badge?: ReactNode;
}

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  tabs: Tab[];
  activeKey?: string;
  defaultKey?: string;
  variant?: 'line' | 'pill';
  onTabChange?: (key: string) => void;
}

export function Tabs({
  tabs,
  activeKey: controlledKey,
  defaultKey,
  variant = 'line',
  onTabChange,
  className,
  ...props
}: TabsProps) {
  const [internalKey, setInternalKey] = useState(defaultKey ?? tabs[0]?.key);
  const active = controlledKey ?? internalKey;

  const handleClick = (key: string) => {
    setInternalKey(key);
    onTabChange?.(key);
  };

  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        className={cn(
          'flex gap-[.2rem] bg-surface-sink p-1 rounded-xl w-fit',
          className,
        )}
        {...props}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleClick(tab.key)}
              className={cn(
                'px-[.875rem] py-[.35rem] text-sm font-medium rounded-lg whitespace-nowrap',
                'transition-all duration-norm ease cursor-pointer border-0 outline-none',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-[3px]',
                isActive
                  ? 'bg-surface text-primary-600 shadow-sm font-semibold dark:text-primary-400'
                  : 'bg-transparent text-foreground-2 hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.badge && <span className="ml-1.5">{tab.badge}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={cn('flex border-b border-border', className)}
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(tab.key)}
            className={cn(
              'px-4 py-[.6rem] text-sm font-medium whitespace-nowrap',
              'border-b-2 -mb-px cursor-pointer border-0 bg-transparent outline-none',
              'transition-all duration-fast',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-[3px]',
              isActive
                ? 'text-primary-600 border-primary-500 font-semibold dark:text-primary-400'
                : 'text-foreground-3 border-transparent hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.badge && <span className="ml-1.5">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
