'use client';

import { InputHTMLAttributes, forwardRef, useId, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate = false, className, id: idProp, disabled, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const innerRef = useRef<HTMLInputElement>(null);

    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) ?? innerRef;

    useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate, resolvedRef]);

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
            ref={resolvedRef}
            id={id}
            type="checkbox"
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-[18px] h-[18px] rounded-[.25rem] border-[1.5px] border-border-strong bg-surface',
              'transition-all duration-fast cursor-pointer',
              'peer-checked:bg-primary-500 peer-checked:border-primary-500',
              'peer-indeterminate:bg-primary-500 peer-indeterminate:border-primary-500',
              'peer-focus-visible:outline peer-focus-visible:outline-2',
              'peer-focus-visible:outline-primary-500 peer-focus-visible:outline-offset-[3px]',
              className,
            )}
          >
            {/* Checkmark */}
            <svg
              className="absolute inset-0 m-auto w-[8px] h-[5px] text-white opacity-0 peer-checked:opacity-100 transition-opacity"
              viewBox="0 0 8 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1,2.5 3,4.5 7,0.5" />
            </svg>
            {/* Indeterminate dash */}
            {indeterminate && (
              <span className="absolute inset-0 m-auto w-[10px] h-0.5 bg-white rounded-sm" />
            )}
          </div>
        </div>
        {label && <span className="text-sm text-foreground">{label}</span>}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
