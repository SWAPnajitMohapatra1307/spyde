// client/src/components/ui/Badge.tsx
import React from 'react';
import type { Verdict } from '@/types/app';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  verdict?: Verdict;
  tone?: 'safe' | 'warn' | 'danger' | 'neutral' | 'primary' | 'challenge';
  dot?: boolean;
}

const verdictStyles: Record<Verdict, string> = {
  PASS: 'bg-trading-up/15 text-trading-up border-trading-up/30',
  WARN: 'bg-primary/15 text-primary border-primary/30',
  CHALLENGE: 'bg-primary-active/15 text-primary-active border-primary-active/30',
  BLOCK: 'bg-trading-down/15 text-trading-down border-trading-down/30',
  REFUNDED: 'bg-surface-elevated-dark text-muted border-hairline-dark',
};

const toneStyles: Record<string, string> = {
  safe: 'bg-trading-up/15 text-trading-up border-trading-up/30',
  warn: 'bg-primary/15 text-primary border-primary/30',
  danger: 'bg-trading-down/15 text-trading-down border-trading-down/30',
  neutral: 'bg-surface-elevated-dark text-muted border-hairline-dark',
  primary: 'bg-primary/15 text-primary border-primary/30',
  challenge: 'bg-primary-active/15 text-primary-active border-primary-active/30',
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
      : 'bg-surface-elevated-dark text-muted border-hairline-dark';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-[11px] font-mono font-semibold border ${style} ${className}`}
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