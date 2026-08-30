// client/src/components/payment/RiskScoreRing.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { RiskVerdict } from '../../types/app';

interface RiskScoreRingProps {
  score: number; // 0 to 100
  verdict?: RiskVerdict;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export const RiskScoreRing: React.FC<RiskScoreRingProps> = ({
  score,
  verdict,
  size = 110,
  strokeWidth = 9,
  showLabel = true,
  className,
}) => {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const getColorScheme = () => {
    if (verdict === 'BLOCK' || normalizedScore >= 85) {
      return {
        stroke: '#9F1239', // Deep Ruby
        text: 'text-accent-ruby',
        label: 'Critical Risk',
      };
    }
    if (verdict === 'CHALLENGE' || normalizedScore >= 65) {
      return {
        stroke: '#C2410C', // Terracotta
        text: 'text-accent-terracotta',
        label: 'High Friction',
      };
    }
    if (verdict === 'WARN' || normalizedScore >= 30) {
      return {
        stroke: '#D97706', // Honey Amber
        text: 'text-accent-amber',
        label: 'Caution Required',
      };
    }
    return {
      stroke: '#1A8276', // Muted Jade
      text: 'text-primary',
      label: 'Safe Transfer',
    };
  };

  const scheme = getColorScheme();

  return (
    <div
      className={cn('relative inline-flex flex-col items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-canvas-border opacity-40 fill-transparent"
        />
        {/* Progress Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scheme.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          className="fill-transparent"
        />
      </svg>

      {/* Center Readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn('text-2xl font-black font-heading tnum leading-none', scheme.text)}>
          {normalizedScore}
        </span>
        <span className="text-[10px] font-medium text-bone-muted mt-0.5 tracking-wider uppercase">
          / 100
        </span>
      </div>

      {showLabel && (
        <span
          className={cn(
            'absolute -bottom-6 text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap',
            scheme.text
          )}
        >
          {scheme.label}
        </span>
      )}
    </div>
  );
};