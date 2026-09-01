// client/src/components/ui/Button.tsx
import React, { forwardRef } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'primary-pill' | 'secondary' | 'ghost' | 'outline' | 'warning' | 'danger' | 'safe' | 'challenge' | 'subscribe';
  size?: 'sm' | 'md' | 'lg' | 'full';
  icon?: LucideIcon;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-primary text-on-primary font-semibold hover:bg-primary-hover active:bg-primary-active rounded-xl shadow-sm cursor-pointer',
  'primary-pill': 'bg-primary text-on-primary font-semibold hover:bg-primary-hover active:bg-primary-active rounded-pill shadow-md cursor-pointer',
  secondary: 'bg-surface-card-dark text-on-dark border border-hairline-dark hover:bg-surface-elevated-dark rounded-xl cursor-pointer',
  ghost: 'bg-transparent text-muted hover:text-on-dark hover:bg-surface-elevated-dark rounded-xl cursor-pointer',
  outline: 'bg-transparent border border-hairline-dark text-on-dark hover:bg-surface-elevated-dark rounded-xl cursor-pointer',
  warning: 'bg-primary text-on-primary font-semibold hover:bg-primary-hover rounded-xl cursor-pointer',
  danger: 'bg-trading-down text-white font-semibold hover:opacity-90 rounded-xl cursor-pointer',
  safe: 'bg-trading-up text-white font-semibold hover:opacity-90 rounded-xl cursor-pointer',
  challenge: 'bg-primary text-on-primary font-semibold hover:bg-primary-hover ring-2 ring-primary/30 rounded-xl cursor-pointer',
  subscribe: 'bg-primary text-on-primary font-semibold hover:bg-primary-hover rounded-xl cursor-pointer',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm h-10',
  lg: 'px-6 py-3 text-base h-12',
  full: 'w-full px-5 py-3 text-sm h-11',
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
        className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variantStyles[variant] ?? variantStyles.primary} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
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