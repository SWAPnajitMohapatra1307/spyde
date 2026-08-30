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
          color: 'text-primary bg-primary/10 border-primary/20',
          desc: 'Verified benign transfer. Zero threat indicators detected.',
        };
      case 'WARN':
        return {
          title: 'Risk Warning Issued',
          color: 'text-accent-amber bg-accent-amber/10 border-accent-amber/20',
          desc: 'Transfer completed after recipient anomaly or typosquat warning.',
        };
      case 'CHALLENGE':
        return {
          title: 'Biometric Verified',
          color: 'text-accent-terracotta bg-accent-terracotta/10 border-accent-terracotta/20',
          desc: 'Biometric face liveness challenge successfully cleared.',
        };
      case 'BLOCK':
        return {
          title: 'Intercepted / Blocked',
          color: 'text-accent-ruby bg-accent-ruby/10 border-accent-ruby/20',
          desc: 'Transaction intercepted due to critical fraud probability.',
        };
      default:
        return {
          title: 'Standard Transfer',
          color: 'text-bone-muted bg-canvas-subtle border-canvas-border',
          desc: 'Audit status confirmed.',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-8 max-w-md mx-auto space-y-4">
        <div className="h-6 w-24 bg-canvas-subtle rounded animate-pulse" />
        <div className="h-44 bg-canvas-subtle rounded-2xl animate-pulse" />
        <div className="h-64 bg-canvas-subtle rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="px-4 py-16 text-center max-w-md mx-auto space-y-4">
        <HelpCircle className="w-12 h-12 text-bone-muted/40 mx-auto" />
        <h2 className="text-base font-bold text-bone">Transaction Not Found</h2>
        <p className="text-xs text-bone-muted">
          The requested audit record does not exist or has expired from the local ledger window.
        </p>
        <Button onClick={() => navigate('/history')} className="rounded-pill text-xs">
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
        className="flex items-center gap-1 text-sm text-bone-muted hover:text-bone transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Ledger
      </button>

      <div className="rounded-2xl bg-canvas-card border border-canvas-border p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-canvas-subtle border border-canvas-border">
          {isSuccess ? (
            <CheckCircle2 className="w-7 h-7 text-primary" />
          ) : (
            <XCircle className="w-7 h-7 text-accent-ruby" />
          )}
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-bone-muted">
            {tx.isSender ? 'Payment Sent' : 'Payment Received'}
          </span>
          <h1 className="text-3xl font-bold font-heading text-bone tnum mt-1">
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
        <p className="text-[11px] text-bone-muted max-w-xs mx-auto">
          {verdictMeta.desc}
        </p>
      </div>

      <div className="rounded-2xl bg-canvas-card border border-canvas-border p-4 space-y-3 text-xs">
        <h3 className="text-xs font-bold text-bone uppercase tracking-wider border-b border-canvas-border/60 pb-2">
          Audit Properties
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-bone-muted flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Beneficiary VPA
          </span>
          <span className="font-mono text-bone font-medium">{tx.receiverVpa}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-bone-muted flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Ledger Reference
          </span>
          <span className="font-mono text-bone-muted truncate max-w-[160px]">
            {tx.id}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-bone-muted flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Timestamp
          </span>
         <span className="text-bone">{formatDate(tx.createdAt || '')}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-bone-muted flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Risk Engine Score
          </span>
          <span className="font-bold text-bone tnum">
            {tx.riskScore ?? 0} / 100
          </span>
        </div>
      </div>

      {tx.certificateId && (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs">
            <FileCheck2 className="w-4 h-4" />
            Immutable Fraud Certificate
          </div>
          <p className="text-[11px] text-bone-muted">
            This transaction is signed with an asymmetric SHA-256 cryptographic receipt.
          </p>
          <Link to={`/certificates/${tx.certificateId}`}>
            <Button
              variant="ghost"
              className="w-full mt-2 rounded-pill text-xs border border-primary/30 text-primary hover:bg-primary/20"
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
            className="w-full rounded-pill py-3 text-xs border border-canvas-border text-bone-muted hover:text-bone flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
            Dispute or Flag Beneficiary
          </Button>
        </Link>
      </div>
    </motion.div>
  );
};