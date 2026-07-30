'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useAppSelector, useAppDispatch } from '@/redux/store';
import { setCompanyContext } from '@/lib/ApiService';
import { setActiveCompany } from '@/redux/features/activeCompany/activeCompanySlice';

interface FinSectionHeaderProps {
  title:            string;
  actionLabel?:     string;
  actionIcon?:      React.ReactNode;
  onAction?:        () => void;
  showEntities?:    boolean;
  secondaryAction?: { label: string; icon?: React.ReactNode; onClick: () => void };
  onCompanyChange?: (companyId: string) => void;
}

export function FinSectionHeader({
  title,
  actionLabel,
  actionIcon,
  onAction,
  showEntities = true,
  secondaryAction,
  onCompanyChange,
}: FinSectionHeaderProps) {
  const dispatch = useAppDispatch();
  const me = useAppSelector(s => s.me.me);
  const selectedId = useAppSelector(s => s.activeCompany.selectedId);
  const companies = useMemo(() => me?.companies ?? [], [me]);

  function handleSelect(id: string) {
    if (id === selectedId) return;
    setCompanyContext(id);
    dispatch(setActiveCompany(id));
    onCompanyChange?.(id);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-xl sm:text-2xl text-[var(--tx-1)]">{title}</h1>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {showEntities && companies.length > 0 && (
          <div className="flex items-center gap-0.5 bg-white border border-[var(--bd-def)] rounded-lg p-0.5 shadow-[var(--sh-xs)]">
            {companies.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={cn(
                  'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  selectedId === c.id
                    ? 'bg-[var(--p500)] text-white'
                    : 'text-[var(--tx-2)] hover:bg-[var(--bg-sink)]',
                )}
              >
                {c.country_code && (
                  <Image
                    src={`https://flagcdn.com/16x12/${c.country_code.toLowerCase()}.png`}
                    width={16}
                    height={12}
                    alt={c.country ?? c.country_code}
                    className="rounded-[2px] flex-shrink-0"
                  />
                )}
                <span className="hidden sm:inline">{c.name ?? c.id}</span>
              </button>
            ))}
          </div>
        )}

        {secondaryAction && (
          <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
            {secondaryAction.icon}
            {secondaryAction.label}
          </Button>
        )}

        {actionLabel && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionIcon}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
