import type React from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps {
  variant?: 'rectangle' | 'circle' | 'text';
  className?: string;
}

/**
 * Renders a neutral loading placeholder for async surfaces without implying a specific data shape.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'rectangle', className }) => {
  return <span className={clsx('block animate-pulse bg-surface-700', variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'h-3 rounded-none' : 'rounded-none', className)} aria-hidden="true" />;
};
