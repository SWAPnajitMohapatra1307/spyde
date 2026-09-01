// client/src/components/ui/Input.tsx
import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon: Icon, className = '', id, ...rest }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-muted">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          )}
          <input
            ref={ref}
            id={id}
            className={`w-full rounded-md bg-surface-card-dark text-sm text-on-dark placeholder:text-muted border transition-all duration-150 focus:outline-none ${
              error
                ? 'border-trading-down focus:border-trading-down focus:ring-1 focus:ring-trading-down'
                : 'border-hairline-dark focus:border-primary focus:ring-1 focus:ring-primary'
            } ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5 ${className}`}
            {...rest}
          />
        </div>
        {error && <p className="text-xs text-trading-down font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';