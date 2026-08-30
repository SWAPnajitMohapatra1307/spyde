// client/src/components/common/ToastProvider.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        hideToast(id);
      }, 4000);
    },
    [hideToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={hideToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-accent-green" />,
  warning: <AlertTriangle className="w-4 h-4 text-accent-yellow" />,
  error: <AlertCircle className="w-4 h-4 text-accent-red" />,
  info: <Info className="w-4 h-4 text-primary" />,
};

const styleMap: Record<ToastType, string> = {
  success: 'bg-canvas-elevated border-accent-green/20 text-bone',
  warning: 'bg-canvas-elevated border-accent-yellow/20 text-bone',
  error: 'bg-canvas-elevated border-accent-red/20 text-bone',
  info: 'bg-canvas-elevated border-white/10 text-bone',
};

const ToastCard: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({
  toast,
  onClose,
}) => {
  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-xl border shadow-2xl pointer-events-auto transition-all duration-300 transform translate-y-0 scale-100 ${styleMap[toast.type]}`}
    >
      <div className="flex-shrink-0">{iconMap[toast.type]}</div>
      <p className="text-xs font-medium flex-1 leading-normal">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="text-bone-muted hover:text-bone p-0.5 rounded-lg transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};