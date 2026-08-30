import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import type React from 'react';
import { springTransition } from '@/lib/animations';

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Renders a focus-friendly flat modal surface with escape handling and enter and exit motion.
 */
export const Modal: React.FC<ModalProps> = ({ open, title, description, onClose, children }) => {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950 p-4" role="presentation" onMouseDown={onClose}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={springTransition}
            className="w-full max-w-md rounded-none bg-surface-900 p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="modal-title" className="font-display text-heading text-neutral-50">{title}</h2>
                {description ? <p className="mt-1 text-body text-neutral-400">{description}</p> : null}
              </div>
              <button type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-none text-neutral-400 transition hover:bg-surface-700 hover:text-neutral-50 focus:outline focus:outline-2 focus:outline-info-500" aria-label="Close dialog">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
