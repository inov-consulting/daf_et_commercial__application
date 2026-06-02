'use client';

import { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, showCount = false, maxLength, className, id: idProp, value, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const len = typeof value === 'string' ? value.length : 0;

    return (
      <div className="flex flex-col gap-[.375rem]">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          maxLength={maxLength}
          value={value}
          className={cn(
            'w-full min-h-24 px-[.875rem] py-3 rounded-lg bg-surface text-foreground',
            'font-body text-sm border-[1.5px] border-border-strong outline-none resize-vertical',
            'leading-relaxed transition-[border-color,box-shadow] duration-fast',
            'placeholder:text-foreground-3',
            'hover:border-primary-400',
            'focus:border-border-focus focus:shadow-[0_0_0_3px_rgba(14,134,232,.14)]',
            'disabled:bg-surface-sink disabled:cursor-not-allowed disabled:opacity-60',
            className,
          )}
          {...props}
        />
        <div className="flex items-start justify-between gap-2">
          {hint && <p className="text-xs text-foreground-3">{hint}</p>}
          {showCount && maxLength && (
            <p className="text-xs text-foreground-3 ml-auto">
              {len}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
