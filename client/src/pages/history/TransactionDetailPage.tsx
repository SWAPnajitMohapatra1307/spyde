import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileCheck2,
  Hash,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import {
  cn,
  formatDate,
  formatRupees,
} from '@/lib/utils';
import type { RiskVerdict, Transaction } from '@/types/app';

export interface TransactionDetailPageProps {
  className?: string;
}

interface VerdictMeta {
  title: string;
  color: string;
  desc: string;
}

export const TransactionDetailPage: React.FC<TransactionDetailPageProps> = ({
  className,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { rawTransactions, isLoading } = useTransactionHistory({ limit: 50 });

  const tx: Transaction | undefined = rawTransactions.find((item) => item.id === id);

  const getVerdictVisual = (verdict?: RiskVerdict): VerdictMeta => {
    switch (verdict) {
      case 'PASS':
        return {
          title: 'Clean Payment',
          color: 'text-trading-up bg-trading-up/10 border-trading-up/30 font-mono',
          desc: 'Verified benign transfer. Zero threat indicators detected.',
        };
      case 'WARN':
        return {
          title: 'Risk Warning Issued',
          color: 'text-primary bg-primary/10 border-primary/30 font-mono',
          desc: 'Transfer completed after recipient anomaly or typosquat warning.',
        };
      case 'CHALLENGE':
        return {
          title: 'Biometric Verified',
          color: 'text-primary-hover bg-primary-hover/10 border-primary-hover/30 font-mono',
          desc: 'Biometric face liveness challenge successfully cleared.',
        };
      case 'BLOCK':
        return {
          title: 'Intercepted / Blocked',
          color: 'text-trading-down bg-trading-down/10 border-trading-down/30 font-mono',
          desc: 'Transaction intercepted due to critical fraud probability.',
        };
      default:
        return {
          title: 'Standard Transfer',
          color: 'text-muted bg-surface-elevated-dark border-hairline-dark font-mono',
          desc: 'Audit status confirmed.',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-8 max-w-md mx-auto space-y-4">
        <div className="h-6 w-24 bg-surface-card-dark rounded animate-pulse" />
        <div className="h-44 bg-surface-card-dark rounded-xl animate-pulse" />
        <div className="h-64 bg-surface-card-dark rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="px-4 py-16 text-center max-w-md mx-auto space-y-4">
        <HelpCircle className="w-12 h-12 text-muted/40 mx-auto" />
        <h2 className="text-base font-bold text-on-dark font-sans">Transaction Not Found</h2>
        <p className="text-xs text-muted">
          The requested audit record does not exist or has expired from the local ledger window.
        </p>
        <Button onClick={() => navigate('/history')} className="rounded-md text-xs">
          Return to Ledger
        </Button>
      </div>
    );
  }

  const verdictMeta = getVerdictVisual(tx.riskVerdict);
  const isSuccess = tx.status === 'SUCCESS';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'px-4 py-6 sm:px-6 sm:py-8 md:mx-auto md:max-w-md lg:max-w-lg space-y-6',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => navigate('/history')}
        className="flex items-center gap-1 text-sm text-muted hover:text-on-dark font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Ledger
      </button>

      <div className="rounded-xl bg-surface-card-dark border border-hairline-dark p-6 text-center space-y-3 shadow-xl">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-surface-elevated-dark border border-hairline-dark">
          {isSuccess ? (
            <CheckCircle2 className="w-7 h-7 text-trading-up" />
          ) : (
            <XCircle className="w-7 h-7 text-trading-down" />
          )}
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono">
            {tx.isSender ? 'Payment Sent' : 'Payment Received'}
          </span>
          <h1 className="text-3xl font-bold font-mono text-on-dark tnum mt-1">
            {formatRupees(tx.amountRupees || 0)}
          </h1>
        </div>

        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-bold border',
            verdictMeta.color,
          )}
        >
          {tx.riskVerdict === 'PASS' ? (
            <ShieldCheck className="w-3.5 h-3.5" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5" />
          )}
          {verdictMeta.title}
        </div>
        <p className="text-[11px] text-muted max-w-xs mx-auto">
          {verdictMeta.desc}
        </p>
      </div>

      <div className="rounded-xl bg-surface-card-dark border border-hairline-dark p-4 space-y-3 text-xs shadow-sm">
        <h3 className="text-xs font-bold text-on-dark uppercase tracking-wider border-b border-hairline-dark pb-2 font-mono">
          Audit Properties
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-muted flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Beneficiary VPA
          </span>
          <span className="font-mono text-on-dark font-medium">{tx.receiverVpa}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Ledger Reference
          </span>
          <span className="font-mono text-muted truncate max-w-[160px]">
            {tx.id}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Timestamp
          </span>
         <span className="text-on-dark font-mono tnum">{formatDate(tx.createdAt || '')}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Risk Engine Score
          </span>
          <span className="font-bold text-on-dark font-mono tnum">
            {tx.riskScore ?? 0} / 100
          </span>
        </div>
      </div>

      {tx.certificateId && (
        <div className="rounded-xl bg-surface-card-dark border border-primary/30 p-4 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-bold text-xs font-sans">
            <FileCheck2 className="w-4 h-4" />
            Immutable Fraud Certificate
          </div>
          <p className="text-[11px] text-muted">
            This transaction is signed with an asymmetric SHA-256 cryptographic receipt.
          </p>
          <Link to={`/certificates/${tx.certificateId}`}>
            <Button
              variant="ghost"
              className="w-full mt-2 rounded-md text-xs border border-primary/30 text-primary hover:bg-primary/10 font-semibold"
            >
              View Verification Certificate
            </Button>
          </Link>
        </div>
      )}

      <div className="pt-2">
        <Link
          to={`/complaints/new?vpa=${encodeURIComponent(tx.receiverVpa || '')}`}
          className="block w-full"
        >
          <Button
            variant="ghost"
            className="w-full rounded-md py-3 text-xs border border-hairline-dark text-muted hover:text-on-dark flex items-center justify-center gap-1.5 font-semibold"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-primary" />
            Dispute or Flag Beneficiary
          </Button>
        </Link>
      </div>
    </motion.div>
  );
};