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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-xl sm:text-2xl text-[var(--tx-1)]">{title}</h1>
      </div>

      <div className="flex items-center gap-2 flex-wrap">

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
