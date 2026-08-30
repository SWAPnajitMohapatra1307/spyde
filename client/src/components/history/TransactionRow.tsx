// client/src/components/history/TransactionRow.tsx
import React from 'react';
import { VerdictBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { Transaction } from '@/types/app';

interface TransactionRowProps {
  transaction: Transaction;
}

const formatRupees = (paisa?: number): string => {
  if (paisa === undefined || paisa === null) return '₹0.00';
  return `₹${Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paisa / 100)}`;
};

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
  const name = transaction.label || transaction.receiverName || transaction.vpa || 'Unknown';
  const vpa = transaction.vpa || transaction.receiverVpa || '';
  const verdict = transaction.verdict || transaction.riskVerdict || 'PASS';

  return (
    <div className="overflow-hidden border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar
          name={name}
          size="md"
          status={verdict === 'PASS' ? 'safe' : verdict === 'BLOCK' ? 'warn' : undefined}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-normal text-bone">{name}</p>
          <p className="mt-1 truncate font-mono text-[10px] text-bone-muted">{vpa}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-normal text-bone">
            {formatRupees(transaction.amountPaisa)}
          </p>
          <p className="mt-1 text-[10px] text-bone-muted">
            {transaction.date ?? ''} / {transaction.time ?? ''}
          </p>
        </div>
        <VerdictBadge verdict={verdict} />
      </div>
    </div>
  );
};