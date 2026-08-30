// client/src/components/common/SkeletonCard.tsx
import React from 'react';

interface SkeletonCardProps {
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3 }) => {
  return (
    <div className="w-full bg-canvas-card border border-white/5 rounded-2xl p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded-pill w-1/3" />
          <div className="h-3 bg-white/5 rounded-pill w-1/4" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className="h-3 bg-white/5 rounded-pill"
            style={{ width: idx === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    </div>
  );
};