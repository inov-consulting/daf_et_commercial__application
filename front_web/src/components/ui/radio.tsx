'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, id: idProp, disabled, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <label
        htmlFor={id}
        className={cn(
          'inline-flex items-center gap-[.625rem] cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            id={id}
            type="radio"
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-[18px] h-[18px] rounded-full border-[1.5px] border-border-strong bg-surface',
              'transition-all duration-fast',
              'peer-checked:border-primary-500',
              'peer-focus-visible:outline peer-focus-visible:outline-2',
              'peer-focus-visible:outline-primary-500 peer-focus-visible:outline-offset-[3px]',
              className,
            )}
          >
            <span
              className={cn(
                'absolute inset-0 m-auto w-2 h-2 rounded-full bg-primary-500',
                'scale-0 peer-checked:scale-100 transition-transform duration-norm ease-spring',
              )}
            />
          </div>
        </div>
        {label && <span className="text-sm text-foreground">{label}</span>}
      </label>
    );
  },
);
Radio.displayName = 'Radio';
