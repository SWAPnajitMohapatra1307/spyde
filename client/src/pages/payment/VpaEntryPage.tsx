import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { 
  ArrowRight, 
  Search, 
  AlertCircle, 
  ShieldAlert, 
  Building, 
  ArrowLeft 
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { usePaymentStore } from '@/stores/paymentStore';
import { ReceiverCard } from '@/components/payment/ReceiverCard';

interface ResolveVpaResponse {
  name: string;
  bank: string;
  riskScore: number;
  isSafeCircle: boolean;
}

const COMMON_BANKS = ['@okhdfcbank', '@okicici', '@oksbi', '@paytm', '@ybl', '@axl'];
const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

export const VpaEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const paymentState = usePaymentStore();

  const [vpa, setVpa] = useState<string>(paymentState.vpa || '');
  const [amount, setAmount] = useState<string>(
    paymentState.amount ? paymentState.amount.toString() : ''
  );
  const [inputError, setInputError] = useState<string | null>(null);
  const [previewReceiver, setPreviewReceiver] = useState<ResolveVpaResponse | null>(null);

  const resolveMutation = useMutation({
    mutationFn: async (targetVpa: string): Promise<ResolveVpaResponse> => {
      const response = await apiClient.post<ResolveVpaResponse>('/api/vpa/resolve', {
        vpa: targetVpa.trim().toLowerCase(),
      });
      return response.data;
    },
    onSuccess: (data) => {
      setPreviewReceiver(data);
      setInputError(null);
    },
    onError: (err: unknown) => {
      setPreviewReceiver(null);
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not verify VPA. Check the handle and try again.';
      setInputError(errorMsg);
    },
  });

  const handleVpaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVpa(e.target.value);
    setInputError(null);
    setPreviewReceiver(null);
  };

  const appendBankSuffix = (suffix: string) => {
    const username = vpa.split('@')[0] || '';
    if (!username) return;
    const newVpa = `${username}${suffix}`;
    setVpa(newVpa);
    setPreviewReceiver(null);
  };

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVpa = vpa.trim().toLowerCase();
    
    if (!cleanVpa || !cleanVpa.includes('@')) {
      setInputError('Please enter a valid UPI ID format (e.g. merchant@upi)');
      return;
    }

    resolveMutation.mutate(cleanVpa);
  };

  const handleProceedToConfirm = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setInputError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!previewReceiver) {
      setInputError('Please verify the receiver VPA first');
      return;
    }

    paymentState.setReceiverDetails({
      vpa: vpa.trim().toLowerCase(),
      name: previewReceiver.name,
      bank: previewReceiver.bank,
      riskScore: previewReceiver.riskScore,
      isSafeCircle: previewReceiver.isSafeCircle,
    });
    paymentState.setAmount(numAmount);
    paymentState.setStep('CONFIRM');

    navigate('/payment/confirm');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>
        <div className="text-xs font-mono text-muted tracking-wider uppercase font-semibold">
          Step 1 of 3
        </div>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-dark tracking-tight font-sans">
          Send Money via UPI
        </h1>
        <p className="text-muted text-xs sm:text-sm mt-1">
          Real-time AI telemetry verification protects every transaction.
        </p>
      </div>

      <div className="bg-surface-card-dark border border-hairline-dark rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
        <form onSubmit={handleVerify} className="space-y-4">
          {/* VPA Input */}
          <div>
            <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-muted mb-2">
              Receiver UPI ID / VPA
            </label>
            <div className="relative">
              <input
                type="text"
                value={vpa}
                onChange={handleVpaChange}
                placeholder="receiver@okhdfcbank"
                className="w-full bg-canvas border border-hairline-dark rounded-lg px-4 py-3 text-on-dark font-mono text-sm placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={resolveMutation.isPending || !vpa.includes('@')}
                className="absolute right-2 top-2 bottom-2 px-3.5 bg-surface-elevated-dark hover:bg-hairline-dark disabled:opacity-40 border border-hairline-dark text-on-dark text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition-colors"
              >
                {resolveMutation.isPending ? (
                  <span className="animate-spin text-primary">●</span>
                ) : (
                  <Search className="w-3.5 h-3.5 text-primary" />
                )}
                Verify
              </button>
            </div>

            {/* Bank suffix chips */}
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[11px] text-muted flex items-center gap-1 flex-shrink-0 font-mono">
                <Building className="w-3 h-3" /> Handles:
              </span>
              {COMMON_BANKS.map((bankSuffix) => (
                <button
                  key={bankSuffix}
                  type="button"
                  onClick={() => appendBankSuffix(bankSuffix)}
                  className="px-2.5 py-0.5 rounded-pill bg-surface-elevated-dark hover:bg-hairline-dark border border-hairline-dark text-muted hover:text-on-dark text-[11px] font-mono whitespace-nowrap transition-colors"
                >
                  {bankSuffix}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-muted mb-2">
              Payment Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-lg select-none">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setInputError(null);
                }}
                placeholder="0"
                className="w-full bg-canvas border border-hairline-dark rounded-lg pl-9 pr-4 py-3 text-on-dark font-mono text-xl font-bold tnum placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className="px-3 py-1 rounded-pill bg-surface-elevated-dark hover:bg-hairline-dark border border-hairline-dark text-muted hover:text-on-dark text-xs font-semibold font-mono tnum transition-colors flex-shrink-0"
                >
                  +₹{amt}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Input / Resolution Error Message */}
        {inputError && (
          <div className="p-3 rounded-lg bg-trading-down/10 border border-trading-down/30 flex items-start gap-2.5 text-trading-down text-xs font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{inputError}</div>
          </div>
        )}

        {/* Receiver Resolved Preview Card */}
        {previewReceiver && (
          <div className="space-y-2 pt-2 border-t border-hairline-dark">
            <div className="text-[11px] font-mono uppercase font-semibold text-muted tracking-wider">
              Verified Receiver Details
            </div>
            <ReceiverCard
              name={previewReceiver.name}
              vpa={vpa.trim().toLowerCase()}
              bank={previewReceiver.bank}
              isSafeCircle={previewReceiver.isSafeCircle}
              riskScore={previewReceiver.riskScore}
            />
          </div>
        )}

        {/* Proceed CTA */}
        <div className="pt-2">
          <button
            type="button"
            onClick={previewReceiver ? handleProceedToConfirm : handleVerify}
            disabled={resolveMutation.isPending || !vpa}
            className="w-full py-3 px-5 rounded-md bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40 text-on-primary font-semibold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
          >
            {resolveMutation.isPending ? (
              <span>Verifying Receiver...</span>
            ) : previewReceiver ? (
              <>
                <span>Proceed to Pay</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            ) : (
              <>
                <span>Verify Receiver First</span>
                <Search className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Guarantee Banner */}
      <div className="p-4 rounded-xl bg-surface-card-dark border border-hairline-dark flex items-center gap-3 text-xs text-muted">
        <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
        <div>
          Transactions are inspected by SPYDE fraud graphs before authorization.
        </div>
      </div>
    </div>
  );
};