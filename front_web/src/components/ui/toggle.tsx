'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, className, id: idProp, disabled, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <div className="flex items-center gap-3">
        <div className="relative inline-flex shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            role="switch"
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <label
            htmlFor={id}
            className={cn(
              'w-11 h-6 rounded-full cursor-pointer transition-colors duration-norm',
              'bg-neutral-300 peer-checked:bg-primary-500',
              'after:content-[""] after:absolute after:top-[3px] after:left-[3px]',
              'after:w-[18px] after:h-[18px] after:bg-white after:rounded-full',
              'after:shadow-[0_1px_3px_rgba(0,0,0,.2)]',
              'after:transition-transform after:duration-norm after:ease-spring',
              'peer-checked:after:translate-x-5',
              'peer-focus-visible:outline peer-focus-visible:outline-2',
              'peer-focus-visible:outline-primary-500 peer-focus-visible:outline-offset-[3px]',
              disabled && 'opacity-50 cursor-not-allowed',
              className,
            )}
          />
        </div>
        {label && (
          <label
            htmlFor={id}
            className={cn('text-sm text-foreground', disabled && 'opacity-50 cursor-not-allowed')}
          >
            {label}
          </label>
        )}
      </div>
    );
  },
);
Toggle.displayName = 'Toggle';
