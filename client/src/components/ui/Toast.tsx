import { motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type React from 'react';
import { clsx } from 'clsx';

export type ToastTone = 'success' | 'warning' | 'error' | 'info';

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  onDismiss?: () => void;
}

const toneClasses: Record<ToastTone, string> = {
  success: 'bg-surface-900 text-success',
  warning: 'bg-surface-900 text-warning',
  error: 'bg-surface-900 text-neutral-50',
  info: 'bg-surface-900 text-link',
};

const toneIcons: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  warning: TriangleAlert,
  error: TriangleAlert,
  info: Info,
};

/**
 * Displays an accessible transient notification styled with the semantic SPYDE status palette.
 */
export const Toast: React.FC<ToastProps> = ({ message, tone = 'info', onDismiss }) => {
  const Icon = toneIcons[tone];
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className={clsx('fixed left-1/2 top-4 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-none px-4 py-3 font-mono text-sm font-normal', toneClasses[tone])}
      role="status"
      aria-live="polite"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
      {onDismiss ? <button type="button" onClick={onDismiss} className="ml-2 flex min-h-7 min-w-7 items-center justify-center rounded-none hover:bg-surface-700" aria-label="Dismiss notification"><X className="h-4 w-4" aria-hidden="true" /></button> : null}
    </motion.div>
  );
};
