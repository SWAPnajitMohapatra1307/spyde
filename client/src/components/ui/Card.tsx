// client/src/components/ui/Card.tsx
import React, { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'safe' | 'warn' | 'danger' | 'challenge';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  level?: number;
}

const variantStyles: Record<string, string> = {
  default: 'bg-surface-card-dark border-hairline-dark text-body',
  elevated: 'bg-surface-elevated-dark border-hairline-dark text-body',
  safe: 'bg-surface-card-dark border-trading-up/30 text-body',
  warn: 'bg-surface-card-dark border-primary/30 text-body',
  danger: 'bg-surface-card-dark border-trading-down/30 text-body',
  challenge: 'bg-surface-card-dark border-primary/30 text-body',
};

const paddingStyles: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-6',
  xl: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', level, className = '', children, ...rest }, ref) => {
    const selectedVariant = level && level > 1 ? 'elevated' : variant;
    return (
      <div
        ref={ref}
        className={`rounded-xl border ${variantStyles[selectedVariant] ?? variantStyles.default} ${paddingStyles[padding]} transition-all duration-150 ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';