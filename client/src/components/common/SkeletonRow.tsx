// client/src/components/common/SkeletonRow.tsx
import React from 'react';

export const SkeletonRow: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-between py-3.5 px-4 bg-canvas-card border-b border-white/5 animate-pulse">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 bg-white/10 rounded-pill w-1/2" />
          <div className="h-2.5 bg-white/5 rounded-pill w-1/3" />
        </div>
      </div>
      <div className="w-16 h-4 bg-white/10 rounded-pill" />
    </div>
  );
};