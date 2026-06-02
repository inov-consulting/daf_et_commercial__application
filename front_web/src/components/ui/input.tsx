'use client';

import { InputHTMLAttributes, ReactNode, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export type InputState = 'default' | 'error' | 'success';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  state?: InputState;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  label?: string;
  hint?: string;
  errorMessage?: string;
  successMessage?: string;
  floatingLabel?: boolean;
}

const stateClasses: Record<InputState, string> = {
  default: 'border-border-strong hover:border-primary-400 focus:border-border-focus focus:shadow-[0_0_0_3px_rgba(14,134,232,.14)]',
  error: 'border-error bg-error-50 focus:border-error focus:shadow-[0_0_0_3px_rgba(239,68,68,.14)] dark:bg-[rgba(239,68,68,.08)]',
  success: 'border-success focus:border-success focus:shadow-[0_0_0_3px_rgba(16,185,129,.14)]',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      state = 'default',
      iconLeft,
      iconRight,
      label,
      hint,
      errorMessage,
      successMessage,
      floatingLabel = false,
      className,
      id: idProp,
      placeholder,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    const baseInput = cn(
      'w-full h-10 px-[.875rem] rounded-lg bg-surface text-foreground',
      'font-body text-sm border-[1.5px] outline-none appearance-none',
      'transition-[border-color,box-shadow] duration-fast',
      'placeholder:text-foreground-3',
      'disabled:bg-surface-sink disabled:cursor-not-allowed disabled:opacity-60',
      stateClasses[state],
      iconLeft ? 'pl-[2.375rem]' : undefined,
      iconRight ? 'pr-[2.375rem]' : undefined,
      className,
    );

    const inputEl = floatingLabel ? (
      <div className="relative">
        <input
          ref={ref}
          id={id}
          placeholder=" "
          disabled={disabled}
          className={cn(
            'w-full h-14 px-[.875rem] pt-[1.375rem] pb-2 rounded-lg bg-surface text-foreground',
            'font-body text-sm border-[1.5px] outline-none appearance-none',
            'transition-[border-color,box-shadow] duration-fast',
            'peer',
            stateClasses[state],
            'focus:border-border-focus',
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            'absolute left-[.875rem] top-1/2 -translate-y-1/2 pointer-events-none',
            'text-sm text-foreground-3 transition-all duration-norm',
            'peer-focus:top-[.625rem] peer-focus:translate-y-0 peer-focus:text-[.6875rem]',
            'peer-focus:font-semibold peer-focus:text-primary-500 peer-focus:tracking-wide peer-focus:uppercase',
            'peer-[:not(:placeholder-shown)]:top-[.625rem] peer-[:not(:placeholder-shown)]:translate-y-0',
            'peer-[:not(:placeholder-shown)]:text-[.6875rem] peer-[:not(:placeholder-shown)]:font-semibold',
            'peer-[:not(:placeholder-shown)]:text-primary-500 peer-[:not(:placeholder-shown)]:tracking-wide',
            'peer-[:not(:placeholder-shown)]:uppercase',
          )}
        >
          {label}
        </label>
      </div>
    ) : (
      <div className="relative">
        {iconLeft && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-3 w-4 h-4 pointer-events-none flex items-center">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          className={baseInput}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-3 w-4 h-4 pointer-events-none flex items-center">
            {iconRight}
          </span>
        )}
      </div>
    );

    return (
      <div className="flex flex-col gap-[.375rem]">
        {label && !floatingLabel && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        {inputEl}
        {state === 'error' && errorMessage && (
          <p className="text-xs text-error flex items-center gap-1">{errorMessage}</p>
        )}
        {state === 'success' && successMessage && (
          <p className="text-xs text-success">{successMessage}</p>
        )}
        {hint && state === 'default' && (
          <p className="text-xs text-foreground-3">{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
