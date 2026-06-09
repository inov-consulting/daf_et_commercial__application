import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  initials: string;
  color?: string;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-5 h-5 text-[.5rem]',
  sm: 'w-[26px] h-[26px] text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function Avatar({
  initials,
  color = '#1B6B45',
  size = 'sm',
  className,
  style,
  ...props
}: AvatarProps) {
  return (
    <div
      style={{ background: color, ...style }}
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        'border-2 border-surface',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  );
}

export interface AvatarStackProps extends HTMLAttributes<HTMLDivElement> { }

export function AvatarStack({ className, children, ...props }: AvatarStackProps) {
  return (
    <div
      className={cn('flex [&>*:not(:first-child)]:-ml-[5px]', className)}
      {...props}
    >
      {children}
    </div>
  );
}
