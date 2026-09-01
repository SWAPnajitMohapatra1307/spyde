import React from 'react';
import { ShieldCheck, AlertTriangle, UserCheck, ShieldBan } from 'lucide-react';
import { RiskScoreRing } from '@/components/payment/RiskScoreRing';
import { SignalChip, PaymentSignal, SignalWeight } from '@/components/payment/SignalChip';

export type { PaymentSignal, SignalWeight };

export type PaymentVerdict = 'PASS' | 'WARN' | 'CHALLENGE' | 'BLOCK';

export interface RiskVerdictCardProps {
  verdict: PaymentVerdict;
  riskScore: number;
  signals?: PaymentSignal[];
  title?: string;
  description?: string;
  className?: string;
}

export const RiskVerdictCard: React.FC<RiskVerdictCardProps> = ({
  verdict,
  riskScore,
  signals = [],
  title,
  description,
  className = '',
}) => {
  const getVerdictConfig = (v: PaymentVerdict) => {
    switch (v) {
      case 'PASS':
        return {
          title: title || 'Low Risk Verified',
          desc: description || 'Safe Circle or reputable receiver with clean telemetry.',
          badgeBg: 'bg-trading-up/15 text-trading-up border-trading-up/30',
          containerBorder: 'border-trading-up/30',
          icon: <ShieldCheck className="w-6 h-6 text-trading-up" />,
          statusText: 'PASS',
        };
      case 'WARN':
        return {
          title: title || 'Caution Recommended',
          desc: description || 'Unusual payment patterns or newly registered receiver.',
          badgeBg: 'bg-primary/15 text-primary border-primary/30',
          containerBorder: 'border-primary/30',
          icon: <AlertTriangle className="w-6 h-6 text-primary" />,
          statusText: 'WARNING',
        };
      case 'CHALLENGE':
        return {
          title: title || 'Identity Verification Required',
          desc: description || 'High risk signals detected. Face liveness required to release funds.',
          badgeBg: 'bg-primary-active/15 text-primary-active border-primary-active/30',
          containerBorder: 'border-primary-active/30',
          icon: <UserCheck className="w-6 h-6 text-primary-active" />,
          statusText: 'CHALLENGE',
        };
      case 'BLOCK':
      default:
        return {
          title: title || 'Transaction Blocked',
          desc: description || 'High certainty of fraud or active flagged report on this receiver.',
          badgeBg: 'bg-trading-down/15 text-trading-down border-trading-down/30',
          containerBorder: 'border-trading-down/30',
          icon: <ShieldBan className="w-6 h-6 text-trading-down" />,
          statusText: 'BLOCKED',
        };
    }
  };

  const config = getVerdictConfig(verdict);

  return (
    <div
      className={`bg-surface-card-dark border ${config.containerBorder} rounded-xl p-5 sm:p-6 shadow-xl ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-surface-elevated-dark border border-hairline-dark">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-pill border ${config.badgeBg}`}
              >
                {config.statusText}
              </span>
            </div>
            <h4 className="text-on-dark font-bold text-lg mt-1 font-sans">{config.title}</h4>
            <p className="text-muted text-xs sm:text-sm mt-0.5 max-w-md leading-relaxed">
              {config.desc}
            </p>
          </div>
        </div>

        {/* Ring */}
        <div className="flex-shrink-0 self-center sm:self-auto">
          <RiskScoreRing score={riskScore} size={88} strokeWidth={7} />
        </div>
      </div>

      {/* Signals List */}
      {signals.length > 0 && (
        <div className="mt-5 pt-4 border-t border-hairline-dark space-y-2">
          <div className="text-[11px] font-mono uppercase font-semibold text-muted tracking-wider mb-2">
            Detected Telemetry Signals ({signals.length})
          </div>
          {signals.map((sig, idx) => (
            <SignalChip key={`${sig.type}-${idx}`} signal={sig} />
          ))}
        </div>
      )}
    </div>
  );
};