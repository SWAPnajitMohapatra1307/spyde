import type React from 'react';
import { clsx } from 'clsx';
import { initialsFor } from '@/lib/format';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'safe' | 'warn';
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
};

const statusClasses: Record<NonNullable<AvatarProps['status']>, string> = {
  online: 'bg-primary-500',
  safe: 'bg-safe-500',
  warn: 'bg-warn-500',
};

/**
 * Renders an initials-based avatar with an optional status indicator for trusted contacts and account headers.
 */
export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', status, className }) => {
  return (
    <span className={clsx('relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface-800 font-normal text-primary-on-dark ', sizeClasses[size], className)} aria-label={name}>
      {initialsFor(name)}
      {status ? <span className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ', statusClasses[status])} aria-hidden="true" /> : null}
    </span>
  );
};
