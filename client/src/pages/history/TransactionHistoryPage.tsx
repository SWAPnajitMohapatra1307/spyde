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
          className="flex items-center gap-1 text-sm text-bone-muted hover:text-bone mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <h1 className="text-xl font-bold text-bone sm:text-2xl">
          Transaction Ledger
        </h1>
        <p className="text-xs text-bone-muted sm:text-sm mt-0.5">
          Real-time payment audit logs, cryptographic signatures, and risk verdicts.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-bone-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by VPA or transaction ID..."
            className="w-full rounded-xl bg-canvas-subtle border border-canvas-border pl-10 pr-4 py-2.5 text-xs text-bone placeholder:text-bone-muted/40 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="w-3.5 h-3.5 text-bone-muted shrink-0 mr-1" />
          {VERDICT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSelectedVerdict(tab.value);
                setOffset(0);
              }}
              className={cn(
                'shrink-0 text-xs px-3 py-1.5 rounded-pill font-medium transition-all',
                selectedVerdict === tab.value
                  ? 'bg-primary text-bone'
                  : 'bg-canvas-subtle border border-canvas-border text-bone-muted hover:text-bone',
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
              className="flex items-center justify-between p-3.5 rounded-xl bg-canvas-subtle animate-pulse border border-canvas-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-canvas-muted/40" />
                <div className="space-y-1.5">
                  <div className="w-28 h-3 rounded bg-canvas-muted/40" />
                  <div className="w-16 h-2 rounded bg-canvas-muted/30" />
                </div>
              </div>
              <div className="w-16 h-4 rounded bg-canvas-muted/40" />
            </div>
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="py-12 text-center rounded-2xl bg-canvas-card border border-canvas-border p-6 space-y-3">
          <ShieldAlert className="w-10 h-10 text-accent-ruby mx-auto" />
          <h3 className="text-sm font-bold text-bone">Failed to Load History</h3>
          <p className="text-xs text-bone-muted max-w-sm mx-auto">
            Unable to connect to the SPYDE ledger service. Please verify your connection and try again.
          </p>
          <Button variant="ghost" onClick={() => void refetch()} className="rounded-pill text-xs">
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && transactions.length === 0 && (
        <div className="py-12 text-center rounded-2xl bg-canvas-card border border-canvas-border p-6 space-y-2">
          <div className="w-12 h-12 rounded-full bg-canvas-subtle border border-canvas-border flex items-center justify-center mx-auto text-bone-muted">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-bone">No Records Found</h3>
          <p className="text-xs text-bone-muted max-w-xs mx-auto">
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
                  className="group flex items-center justify-between p-3.5 rounded-xl bg-canvas-card hover:bg-canvas-subtle border border-canvas-border hover:border-canvas-border/80 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-canvas-subtle border border-canvas-border flex items-center justify-center text-xs font-bold text-bone">
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
                        <p className="text-xs font-semibold text-bone truncate max-w-[140px] sm:max-w-[200px]">
                          {targetName}
                        </p>
                        {getVerdictBadge(tx.riskVerdict)}
                      </div>
                      <p className="text-[11px] text-bone-muted font-mono truncate max-w-[160px]">
                        {tx.receiverVpa}
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
        <div className="flex items-center justify-between pt-4 border-t border-canvas-border text-xs text-bone-muted">
          <span>
            Page {currentPage} of {totalPages} ({total} records)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handlePrevPage}
              disabled={offset === 0}
              className="rounded-pill p-2 text-bone disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleNextPage}
              disabled={offset + PAGE_SIZE >= total}
              className="rounded-pill p-2 text-bone disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};