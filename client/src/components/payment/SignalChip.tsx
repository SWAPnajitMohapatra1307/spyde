import React from 'react';
import { AlertCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export type SignalWeight = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | number;

export interface PaymentSignal {
  type: string;
  description?: string;
  reason?: string;
  weight?: SignalWeight;
  severity?: 'info' | 'warning' | 'danger' | 'critical';
}

export interface SignalChipProps {
  signal: PaymentSignal;
  className?: string;
}

export const SignalChip: React.FC<SignalChipProps> = ({ signal, className = '' }) => {
  const { type, description, reason, weight, severity } = signal;
  const displayText = description || reason || '';

  const getSeverityStyle = () => {
    if (severity === 'critical' || weight === 'CRITICAL' || (typeof weight === 'number' && weight >= 80)) {
      return {
        badge: 'bg-accent-red/20 text-accent-red border-accent-red/30',
        icon: <ShieldAlert className="w-4 h-4 text-accent-red flex-shrink-0" />,
        text: 'text-accent-red',
      };
    }
    if (severity === 'danger' || weight === 'HIGH' || (typeof weight === 'number' && weight >= 50)) {
      return {
        badge: 'bg-accent-orange/20 text-accent-orange border-accent-orange/30',
        icon: <AlertTriangle className="w-4 h-4 text-accent-orange flex-shrink-0" />,
        text: 'text-accent-orange',
      };
    }
    if (severity === 'warning' || weight === 'MEDIUM' || (typeof weight === 'number' && weight >= 25)) {
      return {
        badge: 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30',
        icon: <AlertCircle className="w-4 h-4 text-accent-yellow flex-shrink-0" />,
        text: 'text-accent-yellow',
      };
    }
    return {
      badge: 'bg-white/10 text-bone-muted border-white/10',
      icon: <Info className="w-4 h-4 text-bone-muted flex-shrink-0" />,
      text: 'text-bone-muted',
    };
  };

  const style = getSeverityStyle();
  const displayWeight = typeof weight === 'number' ? `+${weight}` : weight;

  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-xl bg-canvas-card border border-white/5 ${className}`}
    >
      <div className="mt-0.5">{style.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-bone truncate">
            {type.replace(/_/g, ' ')}
          </span>
          {displayWeight && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-pill border tnum ${style.badge}`}
            >
              {displayWeight}
            </span>
          )}
        </div>
        {displayText && (
          <p className="text-bone-muted text-xs leading-relaxed mt-0.5 break-words">
            {displayText}
          </p>
        )}
      </div>
    </div>
  );
};