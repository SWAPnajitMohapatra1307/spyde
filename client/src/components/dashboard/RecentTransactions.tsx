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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
            <ShieldCheck className="w-3 h-3" />
            Clean
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-accent-amber/10 text-accent-amber text-[10px] font-bold border border-accent-amber/20">
            <AlertTriangle className="w-3 h-3" />
            Warn
          </span>
        );
      case 'CHALLENGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-accent-terracotta/10 text-accent-terracotta text-[10px] font-bold border border-accent-terracotta/20">
            <ShieldAlert className="w-3 h-3" />
            Challenged
          </span>
        );
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-accent-ruby/10 text-accent-ruby text-[10px] font-bold border border-accent-ruby/20">
            <ShieldAlert className="w-3 h-3" />
            Blocked
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-canvas-border bg-canvas-card p-5 space-y-4',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-bone">Recent Activity</h3>
          <p className="text-xs text-bone-muted mt-0.5">
            Real-time ledger and risk audit trail
          </p>
        </div>
        {onViewAll && transactions.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3 pt-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-canvas-subtle animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-canvas-muted/40" />
                <div className="space-y-1.5">
                  <div className="w-24 h-3 rounded bg-canvas-muted/40" />
                  <div className="w-16 h-2.5 rounded bg-canvas-muted/30" />
                </div>
              </div>
              <div className="w-16 h-4 rounded bg-canvas-muted/40" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && transactions.length === 0 && (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-canvas-subtle border border-canvas-border flex items-center justify-center mx-auto text-bone-muted">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-bone">No transactions yet</p>
          <p className="text-[11px] text-bone-muted">
            Send money to populate your verified audit trail.
          </p>
        </div>
      )}

      {isError && (
        <div className="py-6 text-center text-xs text-accent-ruby">
          Failed to load recent activity.
        </div>
      )}

      {!isLoading && transactions.length > 0 && (
        <div className="space-y-2.5">
          {transactions.map((tx, idx) => {
            const isDebit = tx.isSender;
            const targetName = tx.receiverName || tx.receiverVpa || 'Beneficiary';

            return (
              <motion.div
                key={tx.id || idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                onClick={() => navigate(`/history/${tx.id}`)}
                className="group flex items-center justify-between p-3 rounded-xl bg-canvas-subtle hover:bg-canvas-muted/30 border border-transparent hover:border-canvas-border/70 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-canvas-card border border-canvas-border flex items-center justify-center text-xs font-bold text-bone">
                      {getInitials(targetName)}
                    </div>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full border border-canvas-bg',
                        isDebit
                          ? 'bg-accent-terracotta text-bone'
                          : 'bg-primary text-bone',
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
                      <p className="text-xs font-semibold text-bone truncate max-w-[130px] sm:max-w-[180px]">
                        {targetName}
                      </p>
                      {getVerdictBadge(tx.riskVerdict)}
                    </div>
                    <p className="text-[11px] text-bone-muted font-mono truncate max-w-[140px]">
                     {tx.receiverVpa || formatRelativeTime(tx.createdAt || '')}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  <span
                    className={cn(
                      'text-xs font-bold font-heading tnum block',
                      isDebit ? 'text-bone' : 'text-primary',
                    )}
                  >
                    {isDebit ? '-' : '+'}
                    {formatRupees(tx.amountRupees || 0)}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 text-[10px] text-bone-muted">
                    {/* Phase 9 Dispute Deep Link for Failed Transactions */}
                    {tx.status === 'FAILED' && (
                      <Link
                        to={`/complaints/new?vpa=${encodeURIComponent(tx.receiverVpa || '')}`}
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
                          e.stopPropagation()
                        }
                        className="text-[10px] font-semibold text-accent-ruby hover:underline inline-flex items-center gap-0.5"
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