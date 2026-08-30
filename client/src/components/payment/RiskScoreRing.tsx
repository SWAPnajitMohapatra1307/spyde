import React from 'react';

export interface RiskScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export const RiskScoreRing: React.FC<RiskScoreRingProps> = ({
  score,
  size = 100,
  strokeWidth = 8,
  className = '',
  showLabel = true,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const getScoreColor = (val: number) => {
    if (val <= 20) return '#10B981'; // Accent Green
    if (val <= 50) return '#F59E0B'; // Accent Yellow / Amber
    if (val <= 75) return '#F97316'; // Accent Orange / Terracotta
    return '#EF4444'; // Accent Red / Ruby
  };

  const ringColor = getScoreColor(clampedScore);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-bone font-black text-xl sm:text-2xl tnum leading-none">
            {clampedScore}
          </span>
          <span className="text-[10px] text-bone-muted uppercase font-semibold tracking-wider mt-0.5">
            / 100
          </span>
        </div>
      )}
    </div>
  );
};