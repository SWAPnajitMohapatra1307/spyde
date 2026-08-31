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
          className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
        <div className="text-xs font-mono text-trading-down tracking-wider uppercase font-semibold">
          Declined by Switch
        </div>
      </div>

      {/* Main Failure Card */}
      <div className="bg-surface-card-dark border border-trading-down/30 rounded-xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 mx-auto rounded-pill bg-trading-down/15 border border-trading-down/30 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-trading-down" />
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-trading-down font-bold bg-trading-down/10 px-3 py-1 rounded-pill border border-trading-down/20">
            Payment Failed
          </span>
          <div className="mt-3">
            <AmountDisplay amount={amount || 0} size="xl" colorClass="text-on-dark" />
          </div>
          <p className="text-muted text-sm mt-1">
            Could not transfer funds to <span className="text-on-dark font-semibold font-mono">{vpa || 'Recipient'}</span>
          </p>
        </div>

        {/* Reason Card */}
        <div className="bg-canvas border border-hairline-dark rounded-lg p-4 text-xs font-mono text-left space-y-2">
          <div className="text-muted uppercase text-[10px] tracking-wider font-semibold">Failure Cause</div>
          <div className="text-trading-down font-semibold break-words">
            {failureReason || 'Transaction rejected by core banking switch or security limits.'}
          </div>
          <p className="text-muted/80 text-[11px] pt-1">
            If your account was debited, funds are typically reversed automatically within 2 business hours.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            className="w-full py-3.5 px-5 rounded-md bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-semibold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleReport}
              className="py-2.5 px-4 rounded-md bg-surface-elevated-dark hover:bg-hairline-dark border border-hairline-dark text-muted hover:text-on-dark text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <FileWarning className="w-3.5 h-3.5 text-primary" /> Report Issue
            </button>

            <button
              type="button"
              onClick={handleReturnHome}
              className="py-2.5 px-4 rounded-md bg-surface-elevated-dark hover:bg-hairline-dark border border-hairline-dark text-muted hover:text-on-dark text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" /> Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};