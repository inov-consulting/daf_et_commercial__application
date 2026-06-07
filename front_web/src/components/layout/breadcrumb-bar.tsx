'use client';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';

export function BreadcrumbBar() {
  const items = useBreadcrumb();

  if (items.length === 0) return null;

  return (
    <div className="px-6 py-2.5 border-b border-[var(--bd-def)] flex-shrink-0">
      <Breadcrumb items={items} />
    </div>
  );
}
