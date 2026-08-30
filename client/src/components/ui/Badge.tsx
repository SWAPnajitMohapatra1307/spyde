// client/src/components/ui/Badge.tsx
import React from 'react';
import type { Verdict } from '@/types/app';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  verdict?: Verdict;
  tone?: 'safe' | 'warn' | 'danger' | 'neutral' | 'primary' | 'challenge';
  dot?: boolean;
}

const verdictStyles: Record<Verdict, string> = {
  PASS: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  WARN: 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30',
  CHALLENGE: 'bg-primary/15 text-primary border-primary/30',
  BLOCK: 'bg-accent-red/15 text-accent-red border-accent-red/30',
  REFUNDED: 'bg-white/10 text-bone-muted border-white/15',
};

const toneStyles: Record<string, string> = {
  safe: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  warn: 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30',
  danger: 'bg-accent-red/15 text-accent-red border-accent-red/30',
  neutral: 'bg-white/10 text-bone-muted border-white/15',
  primary: 'bg-primary/15 text-primary border-primary/30',
  challenge: 'bg-primary/15 text-primary border-primary/30',
};

export const Badge: React.FC<BadgeProps> = ({
  verdict,
  tone,
  dot = false,
  className = '',
  children,
  ...rest
}) => {
  const style = verdict
    ? verdictStyles[verdict] ?? verdictStyles.PASS
    : tone
      ? toneStyles[tone] ?? toneStyles.neutral
      : 'bg-white/10 text-bone-muted border-white/15';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-mono font-bold border ${style} ${className}`}
      {...rest}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children ?? verdict}
    </span>
  );
};

export const VerdictBadge: React.FC<{ verdict: Verdict; className?: string }> = ({
  verdict,
  className = '',
}) => {
  return <Badge verdict={verdict} className={className} />;
};