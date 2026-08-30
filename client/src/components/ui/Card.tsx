// client/src/components/ui/Card.tsx
import React, { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'safe' | 'warn' | 'danger' | 'challenge';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  level?: number;
}

const variantStyles: Record<string, string> = {
  default: 'bg-canvas-card border-white/5',
  safe: 'bg-accent-green/5 border-accent-green/20',
  warn: 'bg-accent-yellow/5 border-accent-yellow/20',
  danger: 'bg-accent-red/5 border-accent-red/20',
  challenge: 'bg-primary/5 border-primary/20',
};

const paddingStyles: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', level, className = '', children, ...rest }, ref) => {
    void level;
    return (
      <div
        ref={ref}
        className={`rounded-2xl border ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';