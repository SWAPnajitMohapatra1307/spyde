// client/src/pages/payment/ConfirmPaymentPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Shield, Lock, FileText, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { usePaymentStore, type PaymentStep } from '@/stores/paymentStore';
import { ReceiverCard } from '@/components/payment/ReceiverCard';
import { AmountDisplay } from '@/components/payment/AmountDisplay';
import { PaymentSignal, PaymentVerdict } from '@/components/payment/RiskVerdictCard';

interface InitiatePaymentPayload {
  receiverVpa: string;
  amount: number;
  note?: string;
}

interface InitiatePaymentResponse {
  transactionId: string;
  verdict: PaymentVerdict;
  signals?: PaymentSignal[];
  riskScore?: number;
}

function routeForVerdict(verdict: PaymentVerdict): { step: PaymentStep; path: string } {
  switch (verdict) {
    case 'PASS':
      return { step: 'PIN_ENTRY', path: '/payment/pin' };
    case 'WARN':
      return { step: 'FRICTION_WARN', path: '/payment/warning' };
    case 'CHALLENGE':
      return { step: 'FRICTION_CHALLENGE', path: '/payment/challenge' };
    case 'BLOCK':
      return { step: 'FRICTION_BLOCK', path: '/payment/blocked' };
    default:
      return { step: 'PIN_ENTRY', path: '/payment/pin' };
  }
}

export const ConfirmPaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const paymentState = usePaymentStore();

  const [note, setNote] = useState<string>(paymentState.note || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetVpa = paymentState.vpa || '';
  const targetName = paymentState.receiverName || 'UPI Receiver';
  const targetBank = paymentState.receiverBank || '';
  const targetAmount = paymentState.amount || 0;
  const isSafeCircle = Boolean(paymentState.isSafeCircle);
  const currentRiskScore = paymentState.riskScore;

  const initiateMutation = useMutation({
    mutationFn: async (payload: InitiatePaymentPayload): Promise<InitiatePaymentResponse> => {
      const response = await apiClient.post<any>('/api/payment/initiate', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      const { step, path } = routeForVerdict(data.verdict);

      // Atomic store write — step + transaction in one tick
      usePaymentStore.setState({
        transactionId: data.transactionId,
        verdict: data.verdict,
        signals: data.signals || [],
        riskScore:
          typeof data.riskScore === 'number' ? data.riskScore : (currentRiskScore ?? 0),
        step,
        note: note.trim() || paymentState.note,
      });

      navigate(path, { replace: true });
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Payment initiation failed. Please check network and try again.';
      setErrorMessage(errorMsg);
    },
  });

  const handleProceed = () => {
    if (!targetVpa || targetAmount <= 0) {
      setErrorMessage('Invalid transaction state. Please start again.');
      return;
    }

    setErrorMessage(null);
    initiateMutation.mutate({
      receiverVpa: targetVpa,
      amount: targetAmount,
      note: note.trim() || undefined,
    });
  };

  if (!targetVpa || targetAmount <= 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-accent-yellow mx-auto" />
        <h2 className="text-xl font-bold text-bone">No Active Payment Session</h2>
        <p className="text-bone-muted text-sm">
          Please enter the receiver VPA and amount to initiate a payment.
        </p>
        <button
          onClick={() => navigate('/payment/send')}
          className="px-6 py-2.5 rounded-xl bg-primary text-canvas font-bold text-sm tracking-wide"
        >
          Start Payment
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/payment/send')}
          className="inline-flex items-center gap-1.5 text-bone-muted hover:text-bone text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Entry
        </button>
        <div className="text-xs font-mono text-bone-muted tracking-wider uppercase">
          Step 2 of 3
        </div>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-bone tracking-tight">
          Confirm Payment
        </h1>
        <p className="text-bone-muted text-sm mt-1">
          Review receiver and transaction details before security routing.
        </p>
      </div>

      <div className="bg-canvas-card border border-white/10 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="text-center py-4 bg-canvas border border-white/5 rounded-xl">
          <div className="text-xs font-mono text-bone-muted uppercase tracking-wider mb-1">
            Paying Total
          </div>
          <AmountDisplay amount={targetAmount} size="xl" />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase font-semibold text-bone-muted tracking-wider">
            Transfer Destination
          </div>
          <ReceiverCard
            name={targetName}
            vpa={targetVpa}
            bank={targetBank}
            isSafeCircle={isSafeCircle}
            riskScore={currentRiskScore}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-bone-muted mb-2">
            Payment Note / Remarks (Optional)
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-bone-muted absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Dinner, Groceries, Rent"
              maxLength={50}
              className="w-full bg-canvas border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-bone text-sm placeholder:text-bone-muted/40 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-canvas-elevated border border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-bone-muted">
            <Shield className="w-4 h-4 text-accent-green" />
            <span>AI Multi-Vector Shield</span>
          </div>
          <span className="text-[11px] font-mono text-accent-green font-semibold">ACTIVE</span>
        </div>

        <button
          type="button"
          onClick={handleProceed}
          disabled={initiateMutation.isPending}
          className="w-full py-4 px-6 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-canvas font-bold text-base tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
        >
          {initiateMutation.isPending ? (
            <>
              <span className="animate-spin text-canvas">●</span>
              <span>Running Risk Evaluation...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>
                Proceed to Pay ₹{new Intl.NumberFormat('en-IN').format(targetAmount)}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};