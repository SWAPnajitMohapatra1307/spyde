import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck2,
  Filter,
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import {
  cn,
  formatRelativeTime,
  formatRupees,
  getInitials,
} from '@/lib/utils';
import type { RiskVerdict, Transaction } from '@/types/app';

type VerdictTab = 'ALL' | RiskVerdict;

interface VerdictTabOption {
  label: string;
  value: VerdictTab;
}

const VERDICT_TABS: VerdictTabOption[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Clean', value: 'PASS' },
  { label: 'Warned', value: 'WARN' },
  { label: 'Challenged', value: 'CHALLENGE' },
  { label: 'Blocked', value: 'BLOCK' },
];

export interface TransactionHistoryPageProps {
  className?: string;
}

export const TransactionHistoryPage: React.FC<TransactionHistoryPageProps> = ({
  className,
}) => {
  const navigate = useNavigate();
  const PAGE_SIZE = 10;

  const [offset, setOffset] = useState<number>(0);
  const [selectedVerdict, setSelectedVerdict] = useState<VerdictTab>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const {
    transactions,
    total,
    isLoading,
    isError,
    refetch,
  } = useTransactionHistory({
    limit: PAGE_SIZE,
    offset,
    verdictFilter: selectedVerdict,
    searchQuery,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const handleNextPage = (): void => {
    if (offset + PAGE_SIZE < total) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  };

  const handlePrevPage = (): void => {
    if (offset - PAGE_SIZE >= 0) {
      setOffset((prev) => prev - PAGE_SIZE);
    }
  };

  const getVerdictBadge = (verdict?: RiskVerdict): React.ReactNode => {
    switch (verdict) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-trading-up/15 text-trading-up text-[10px] font-bold border border-trading-up/30 font-mono">
            <ShieldCheck className="w-3 h-3" />
            Clean
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary/15 text-primary text-[10px] font-bold border border-primary/30 font-mono">
            <AlertTriangle className="w-3 h-3" />
            Warn
          </span>
        );
      case 'CHALLENGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary-hover/15 text-primary-hover text-[10px] font-bold border border-primary-hover/30 font-mono">
            <ShieldAlert className="w-3 h-3" />
            Challenged
          </span>
        );
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-trading-down/15 text-trading-down text-[10px] font-bold border border-trading-down/30 font-mono">
            <ShieldAlert className="w-3 h-3" />
            Blocked
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'px-4 py-6 sm:px-6 sm:py-8 md:mx-auto md:max-w-2xl lg:max-w-3xl space-y-6',
        className,
      )}
    >
      <div>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="flex items-center gap-1 text-sm text-muted hover:text-on-dark mb-3 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <h1 className="text-xl font-bold text-on-dark sm:text-2xl font-sans">
          Transaction Ledger
        </h1>
        <p className="text-xs text-muted sm:text-sm mt-0.5">
          Real-time payment audit logs, cryptographic signatures, and risk verdicts.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by VPA or transaction ID..."
            className="w-full rounded-lg bg-surface-card-dark border border-hairline-dark pl-10 pr-4 py-2.5 text-xs text-on-dark placeholder:text-muted focus:outline-none focus:border-primary transition-colors font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="w-3.5 h-3.5 text-muted shrink-0 mr-1" />
          {VERDICT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSelectedVerdict(tab.value);
                setOffset(0);
              }}
              className={cn(
                'shrink-0 text-xs px-3 py-1.5 rounded-pill font-semibold transition-all',
                selectedVerdict === tab.value
                  ? 'bg-primary text-on-primary font-bold shadow-sm'
                  : 'bg-surface-card-dark border border-hairline-dark text-muted hover:text-on-dark',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 rounded-xl bg-surface-card-dark animate-pulse border border-hairline-dark"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-elevated-dark" />
                <div className="space-y-1.5">
                  <div className="w-28 h-3 rounded bg-surface-elevated-dark" />
                  <div className="w-16 h-2 rounded bg-surface-elevated-dark" />
                </div>
              </div>
              <div className="w-16 h-4 rounded bg-surface-elevated-dark" />
            </div>
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="py-12 text-center rounded-xl bg-surface-card-dark border border-trading-down/30 p-6 space-y-3 shadow-sm">
          <ShieldAlert className="w-10 h-10 text-trading-down mx-auto" />
          <h3 className="text-sm font-bold text-on-dark font-sans">Failed to Load History</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Unable to connect to the SPYDE ledger service. Please verify your connection and try again.
          </p>
          <Button variant="ghost" onClick={() => void refetch()} className="rounded-md text-xs">
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && transactions.length === 0 && (
        <div className="py-12 text-center rounded-xl bg-surface-card-dark border border-hairline-dark p-6 space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-surface-elevated-dark border border-hairline-dark flex items-center justify-center mx-auto text-muted">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-on-dark font-sans">No Records Found</h3>
          <p className="text-xs text-muted max-w-xs mx-auto">
            No transactions match the selected filter criteria.
          </p>
        </div>
      )}

      {!isLoading && !isError && transactions.length > 0 && (
        <div className="space-y-2.5">
          <AnimatePresence>
            {transactions.map((tx: Transaction, idx: number) => {
              const isDebit = tx.isSender;
              const targetName = tx.receiverName || tx.receiverVpa || 'Beneficiary';

              return (
                <motion.div
                  key={tx.id || idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.02 }}
                  onClick={() => navigate(`/history/${tx.id}`)}
                  className="group flex items-center justify-between p-3.5 rounded-xl bg-surface-card-dark hover:bg-surface-elevated-dark border border-hairline-dark hover:border-hairline-dark transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-surface-elevated-dark border border-hairline-dark flex items-center justify-center text-xs font-bold text-on-dark font-sans">
                        {getInitials(targetName)}
                      </div>
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full border border-canvas',
                          isDebit
                            ? 'bg-surface-elevated-dark text-muted'
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
                        <p className="text-xs font-semibold text-on-dark truncate max-w-[140px] sm:max-w-[200px] font-sans">
                          {targetName}
                        </p>
                        {getVerdictBadge(tx.riskVerdict)}
                      </div>
                      <p className="text-[11px] text-muted font-mono truncate max-w-[160px]">
                        {tx.receiverVpa}
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
                        <span title="Certificate Available" className="text-primary">
                          <FileCheck2 className="w-3 h-3" />
                        </span>
                      )}
                     <span>{formatRelativeTime(tx.createdAt || '')}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {!isLoading && !isError && total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-4 border-t border-hairline-dark text-xs text-muted font-mono">
          <span>
            Page {currentPage} of {totalPages} ({total} records)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handlePrevPage}
              disabled={offset === 0}
              className="rounded-md p-2 text-on-dark disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleNextPage}
              disabled={offset + PAGE_SIZE >= total}
              className="rounded-md p-2 text-on-dark disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};