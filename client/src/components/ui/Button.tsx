// client/src/components/ui/Button.tsx
import React, { forwardRef } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'warning' | 'danger' | 'safe' | 'challenge';
  size?: 'sm' | 'md' | 'lg' | 'full';
  icon?: LucideIcon;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-primary text-bone hover:bg-primary/90',
  secondary: 'bg-canvas-elevated text-bone hover:bg-white/10 border border-white/10',
  ghost: 'bg-transparent text-bone-muted hover:text-bone hover:bg-white/5',
  outline: 'bg-transparent border border-white/15 text-bone hover:bg-white/5',
  warning: 'bg-accent-yellow text-canvas hover:bg-accent-yellow/90',
  danger: 'bg-accent-red text-bone hover:bg-accent-red/90',
  safe: 'bg-accent-green text-canvas hover:bg-accent-green/90',
  challenge: 'bg-primary text-bone hover:bg-primary/90 ring-2 ring-primary/30',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
  full: 'w-full px-4 py-3 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: Icon,
      leftIcon,
      fullWidth = false,
      isLoading = false,
      className = '',
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {leftIcon}
            {Icon && <Icon className="w-4 h-4" />}
          </>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';