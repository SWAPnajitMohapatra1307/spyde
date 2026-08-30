import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, Landmark, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatRupees } from '../../lib/utils';
import { Button } from '../ui/Button';

interface BalanceCardProps {
  balanceRupees?: number;
  bankName?: string;
  ifsc?: string;
  accountNumberMasked?: string;
  primaryVpa?: string;
  isLoading?: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balanceRupees = 0,
  bankName = 'Bank Account',
  accountNumberMasked = '•••• 0000',
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-canvas-subtle border border-canvas-border p-6 h-48 animate-pulse" />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-canvas-card via-canvas-card to-canvas-subtle border border-canvas-border p-6 shadow-xl">
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/15 text-primary">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-bone block leading-tight">{bankName}</span>
              <span className="text-[11px] font-mono text-bone-muted">{accountNumberMasked}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Active Shield</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-bone-muted">Total Available Balance</span>
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="text-bone-muted hover:text-bone transition-colors"
            >
              {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-heading text-bone tnum tracking-tight flex items-baseline">
            {showBalance ? (
              <motion.span
                key="visible"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {formatRupees(balanceRupees)}
              </motion.span>
            ) : (
              <span className="tracking-widest font-mono text-2xl text-bone-muted">••••••••</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={() => navigate('/payment/send')}
            leftIcon={<ArrowUpRight className="w-4 h-4" />}
          >
            Send Money
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => navigate('/circle')}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Safe Circle
          </Button>
        </div>
      </div>
    </div>
  );
};