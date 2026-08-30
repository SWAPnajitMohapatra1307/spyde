// client/src/components/cv/AntiSpoofBadge.tsx

import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import type { AntiSpoofResult } from '@/types/cv';

interface AntiSpoofBadgeProps {
  result: AntiSpoofResult | null;
  compact?: boolean;
}

const methodLabels: Record<AntiSpoofResult['method'], string> = {
  texture: 'Texture Analysis',
  depth: 'Depth Mapping',
  motion: 'Motion Consistency',
  infrared: 'IR Verification',
};

export const AntiSpoofBadge: React.FC<AntiSpoofBadgeProps> = ({
  result,
  compact = false,
}) => {
  if (!result) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white/5 border border-white/10">
        <Shield className="w-4 h-4 text-bone-muted" />
        {!compact && (
          <span className="text-xs text-bone-muted">Anti-spoof pending</span>
        )}
      </div>
    );
  }

  if (result.isReal) {
    return (
      <div
        className={`flex items-center gap-2 rounded-pill border ${
          compact ? 'px-2 py-1' : 'px-3 py-1.5'
        } bg-accent-green/10 border-accent-green/30`}
      >
        <ShieldCheck className="w-4 h-4 text-accent-green" />
        {!compact && (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-accent-green">
              Real Face Confirmed
            </span>
            <span className="text-[10px] text-bone-muted">
              {methodLabels[result.method]} · {(result.score * 100).toFixed(0)}%
            </span>
          </div>
        )}
        {compact && (
          <span className="text-xs font-mono tabular-nums text-accent-green">
            {(result.score * 100).toFixed(0)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-pill border ${
        compact ? 'px-2 py-1' : 'px-3 py-1.5'
      } ${
        result.score < 0.3
          ? 'bg-accent-red/10 border-accent-red/30'
          : 'bg-accent-yellow/10 border-accent-yellow/30'
      }`}
    >
      {result.score < 0.3 ? (
        <ShieldX className="w-4 h-4 text-accent-red" />
      ) : (
        <ShieldAlert className="w-4 h-4 text-accent-yellow" />
      )}
      {!compact && (
        <div className="flex flex-col">
          <span
            className={`text-xs font-medium ${
              result.score < 0.3 ? 'text-accent-red' : 'text-accent-yellow'
            }`}
          >
            {result.score < 0.3 ? 'Spoof Detected' : 'Suspicious'}
          </span>
          <span className="text-[10px] text-bone-muted">{result.details}</span>
        </div>
      )}
    </div>
  );
};