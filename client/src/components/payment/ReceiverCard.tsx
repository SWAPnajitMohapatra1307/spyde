import React from 'react';
import { ShieldCheck, Building2, UserCheck } from 'lucide-react';

export interface ReceiverCardProps {
  name?: string | null;
  vpa: string;
  bank?: string | null;
  isSafeCircle?: boolean | null;
  riskScore?: number | null;
  className?: string;
  compact?: boolean;
}

export const ReceiverCard: React.FC<ReceiverCardProps> = ({
  name,
  vpa,
  bank,
  isSafeCircle = false,
  riskScore,
  className = '',
  compact = false,
}) => {
  const initials = name
    ? name
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'UP';

  return (
    <div
      className={`bg-canvas-card border border-white/10 rounded-2xl ${
        compact ? 'p-3.5' : 'p-4 sm:p-5'
      } ${className}`}
    >
      <div className="flex items-center gap-3.5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-canvas-elevated border border-white/10 flex items-center justify-center text-primary font-bold text-base tracking-wider">
            {initials}
          </div>
          {isSafeCircle && (
            <div
              title="Safe Circle Contact"
              className="absolute -top-1.5 -right-1.5 bg-accent-green text-canvas p-0.5 rounded-pill shadow"
            >
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          )}
        </div>

        {/* Receiver Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-bone font-semibold text-base sm:text-lg truncate">
              {name || 'UPI Receiver'}
            </h3>
            {isSafeCircle && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-pill bg-accent-green/10 text-accent-green border border-accent-green/20">
                <UserCheck className="w-3 h-3" /> Safe Circle
              </span>
            )}
          </div>

          <p className="text-bone-muted font-mono text-xs sm:text-sm truncate mt-0.5 select-all">
            {vpa}
          </p>

          {bank && (
            <div className="flex items-center gap-1.5 text-bone-muted/80 text-xs mt-1">
              <Building2 className="w-3 h-3 text-bone-muted flex-shrink-0" />
              <span className="truncate">{bank}</span>
            </div>
          )}
        </div>

        {/* Risk Score Pill if present */}
        {typeof riskScore === 'number' && (
          <div className="flex-shrink-0 text-right">
            <div className="text-[10px] uppercase font-semibold text-bone-muted tracking-wider">
              Risk Score
            </div>
            <div
              className={`tnum font-bold text-sm ${
                riskScore <= 20
                  ? 'text-accent-green'
                  : riskScore <= 60
                  ? 'text-accent-yellow'
                  : 'text-accent-red'
              }`}
            >
              {riskScore}/100
            </div>
          </div>
        )}
      </div>
    </div>
  );
};