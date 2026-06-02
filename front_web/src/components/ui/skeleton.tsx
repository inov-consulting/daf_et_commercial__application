import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({ width, height, rounded = 'md', className, style, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton', roundedClasses[rounded], className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['90%', '75%', '82%', '60%', '88%'];
  return (
    <div className={cn('flex flex-col gap-[.375rem]', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="10px" style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 p-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton width="40px" height="40px" rounded="full" />
        <div className="flex flex-col gap-[.375rem] flex-1">
          <Skeleton height="12px" style={{ width: '60%' }} />
          <Skeleton height="10px" style={{ width: '40%' }} />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-3">
        <Skeleton height="32px" className="flex-1 rounded-lg" />
        <Skeleton width="80px" height="32px" rounded="lg" />
      </div>
    </div>
  );
}
