import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, Home, FileWarning, ArrowLeft } from 'lucide-react';
import { usePaymentStore } from '@/stores/paymentStore';
import { AmountDisplay } from '@/components/payment/AmountDisplay';

export const PaymentFailedPage: React.FC = () => {
  const navigate = useNavigate();
  const { amount, vpa, failureReason, reset, setStep } = usePaymentStore();

  const handleRetry = () => {
    setStep('VPA_ENTRY');
    navigate('/payment/send');
  };

  const handleReturnHome = () => {
    reset();
    navigate('/home');
  };

  const handleReport = () => {
    const params = new URLSearchParams({
      vpa: vpa || '',
      category: 'FRAUD',
    });
    navigate(`/complaints/new?${params.toString()}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleReturnHome}
          className="inline-flex items-center gap-1.5 text-bone-muted hover:text-bone text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
        <div className="text-xs font-mono text-accent-red tracking-wider uppercase font-semibold">
          Declined by Switch
        </div>
      </div>

      {/* Main Failure Card */}
      <div className="bg-canvas-card border border-accent-red/30 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 mx-auto rounded-pill bg-accent-red/15 border border-accent-red/30 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-accent-red" />
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-accent-red font-bold bg-accent-red/10 px-3 py-1 rounded-pill border border-accent-red/20">
            Payment Failed
          </span>
          <div className="mt-3">
            <AmountDisplay amount={amount || 0} size="xl" colorClass="text-bone" />
          </div>
          <p className="text-bone-muted text-sm mt-1">
            Could not transfer funds to <span className="text-bone font-semibold">{vpa || 'Recipient'}</span>
          </p>
        </div>

        {/* Reason Card */}
        <div className="bg-canvas border border-white/5 rounded-xl p-4 text-xs font-mono text-left space-y-2">
          <div className="text-bone-muted uppercase text-[10px] tracking-wider">Failure Cause</div>
          <div className="text-accent-red font-medium break-words">
            {failureReason || 'Transaction rejected by core banking switch or security limits.'}
          </div>
          <p className="text-bone-muted/80 text-[11px] pt-1">
            If your account was debited, funds are typically reversed automatically within 2 business hours.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            className="w-full py-3.5 px-5 rounded-xl bg-primary hover:bg-primary/90 text-canvas font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleReport}
              className="py-2.5 px-4 rounded-xl bg-canvas-elevated hover:bg-white/10 border border-white/5 text-bone-muted hover:text-bone text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <FileWarning className="w-3.5 h-3.5" /> Report Issue
            </button>

            <button
              type="button"
              onClick={handleReturnHome}
              className="py-2.5 px-4 rounded-xl bg-canvas-elevated hover:bg-white/10 border border-white/5 text-bone-muted hover:text-bone text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" /> Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};