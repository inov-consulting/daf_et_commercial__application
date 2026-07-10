'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import type { EntityKey } from '@/types/finance_type';

const ENTITIES = [
  { key: 'all' as EntityKey, label: 'Toutes', flag: null },
  { key: 'sn'  as EntityKey, label: 'Sénégal',        flag: 'sn' },
  { key: 'ci'  as EntityKey, label: "Côte d'Ivoire",  flag: 'ci' },
];

interface FinSectionHeaderProps {
  title:       string;
  subtitle?:   string;
  actionLabel?: string;
  actionIcon?:  React.ReactNode;
  onAction?:   () => void;
  showEntities?: boolean;
  secondaryAction?:  { label: string; icon?: React.ReactNode; onClick: () => void };
}

export function FinSectionHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
  showEntities = true,
  secondaryAction,
}: FinSectionHeaderProps) {
  const [entity, setEntity] = useState<EntityKey>('all');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-xl sm:text-2xl text-[var(--tx-1)]">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--tx-3)] mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {showEntities && (
          <div className="flex items-center gap-0.5 bg-white border border-[var(--bd-def)] rounded-lg p-0.5 shadow-[var(--sh-xs)]">
            {ENTITIES.map(({ key, label, flag }) => (
              <button
                key={key}
                onClick={() => setEntity(key)}
                className={cn(
                  'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  entity === key
                    ? 'bg-[var(--p500)] text-white'
                    : 'text-[var(--tx-2)] hover:bg-[var(--bg-sink)]',
                )}
              >
                {flag && (
                  <Image src={`https://flagcdn.com/16x12/${flag}.png`} width={16} height={12} alt={label} className="rounded-[2px] flex-shrink-0" />
                )}
                <span className="hidden sm:inline">{label}</span>
                {!flag && <span className="sm:hidden">Toutes</span>}
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
