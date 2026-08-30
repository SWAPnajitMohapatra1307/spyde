// client/src/components/common/EmptyState.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-canvas-card border border-white/5 rounded-2xl">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-bone font-semibold text-base">{title}</h3>
      <p className="text-bone-muted text-xs mt-1.5 max-w-xs leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-5 py-2 rounded-xl bg-primary text-bone text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};