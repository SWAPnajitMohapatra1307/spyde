import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  Clock,
  FileCheck2,
} from 'lucide-react';

import {
  formatRupees,
  formatRelativeTime,
  cn,
  getInitials,
} from '../../lib/utils';
import type { Transaction, RiskVerdict } from '../../types/app';

export interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading?: boolean;
  isError?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  isLoading = false,
  isError = false,
  onViewAll,
  className,
}) => {
  const navigate = useNavigate();

  const getVerdictBadge = (verdict?: RiskVerdict): React.ReactNode => {
    switch (verdict) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-trading-up/10 text-trading-up text-[10px] font-mono font-semibold border border-trading-up/20">
            <ShieldCheck className="w-3 h-3" />
            PASS
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary/15 text-primary text-[10px] font-mono font-semibold border border-primary/30">
            <AlertTriangle className="w-3 h-3" />
            WARN
          </span>
        );
      case 'CHALLENGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary-active/15 text-primary-active text-[10px] font-mono font-semibold border border-primary-active/30">
            <ShieldAlert className="w-3 h-3" />
            CHALLENGE
          </span>
        );
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-trading-down/15 text-trading-down text-[10px] font-mono font-semibold border border-trading-down/30">
            <ShieldAlert className="w-3 h-3" />
            BLOCK
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-hairline-dark bg-surface-card-dark p-5 space-y-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-on-dark font-sans">Recent Activity</h3>
          <p className="text-xs text-muted mt-0.5 font-mono">
            Real-time ledger & cryptographic audit trail
          </p>
        </div>
        {onViewAll && transactions.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-0.5 font-sans"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2.5 pt-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 rounded-lg bg-surface-elevated-dark/50 border border-hairline-dark animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-card-dark border border-hairline-dark" />
                <div className="space-y-1.5">
                  <div className="w-24 h-3 rounded bg-surface-card-dark" />
                  <div className="w-16 h-2.5 rounded bg-surface-card-dark" />
                </div>
              </div>
              <div className="w-16 h-4 rounded bg-surface-card-dark" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && transactions.length === 0 && (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-surface-elevated-dark border border-hairline-dark flex items-center justify-center mx-auto text-muted">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-on-dark">No transactions yet</p>
          <p className="text-[11px] text-muted">
            Send money to populate your verified audit trail.
          </p>
        </div>
      )}

      {isError && (
        <div className="py-6 text-center text-xs text-trading-down font-medium">
          Failed to load recent activity.
        </div>
      )}

      {!isLoading && transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((tx, idx) => {
            const isDebit = tx.isSender;
            const targetName = tx.receiverName || tx.receiverVpa || 'Beneficiary';

            return (
              <motion.div
                key={tx.id || idx}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.03 }}
                onClick={() => navigate(`/history/${tx.id}`)}
                className="group flex items-center justify-between p-3 rounded-lg bg-surface-elevated-dark/30 hover:bg-surface-elevated-dark border border-hairline-dark transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-surface-card-dark border border-hairline-dark flex items-center justify-center text-xs font-bold text-on-dark font-mono">
                      {getInitials(targetName)}
                    </div>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full border border-canvas',
                        isDebit
                          ? 'bg-trading-down text-on-dark'
                          : 'bg-trading-up text-on-dark',
                      )}
                    >
                      {isDebit ? (
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      ) : (
                        <ArrowDownLeft className="w-2.5 h-2.5" />
                      )}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-on-dark truncate max-w-[130px] sm:max-w-[180px]">
                        {targetName}
                      </p>
                      {getVerdictBadge(tx.riskVerdict)}
                    </div>
                    <p className="text-[11px] text-muted font-mono truncate max-w-[140px]">
                      {tx.receiverVpa || formatRelativeTime(tx.createdAt || '')}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  <span
                    className={cn(
                      'text-xs font-bold font-mono tnum block',
                      isDebit ? 'text-on-dark' : 'text-trading-up',
                    )}
                  >
                    {isDebit ? '-' : '+'}
                    {formatRupees(tx.amountRupees || 0)}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted font-mono">
                    {tx.status === 'FAILED' && (
                      <Link
                        to={`/complaints/new?vpa=${encodeURIComponent(tx.receiverVpa || '')}`}
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
                          e.stopPropagation()
                        }
                        className="text-[10px] font-semibold text-trading-down hover:underline inline-flex items-center gap-0.5"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Dispute
                      </Link>
                    )}

                    {tx.certificateId && (
                      <span
                        title="Certificate Available"
                        className="text-primary"
                      >
                        <FileCheck2 className="w-3 h-3" />
                      </span>
                    )}
                    <span>{formatRelativeTime(tx.createdAt || '')}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};