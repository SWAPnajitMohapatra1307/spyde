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
  transactionId?: string;
  txnId?: string;
  id?: string;
  verdict: PaymentVerdict;
  signals?: PaymentSignal[];
  riskScore?: number;
  // Liveness / escrow session ids (support all naming conventions)
  challengeSessionId?: string | null;
  livenessSessionId?: string | null;
  challengeId?: string | null;
  sessionId?: string | null;
  escrowSessionId?: string | null;
  livenessChallengeId?: string | null;
  // Code aliases (4-digit escrow code)
  challengeCode?: string | null;
  code?: string | null;
  escrowCode?: string | null;
  livenessCode?: string | null;
  otp?: string | null;
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

function extractLivenessSessionId(data: InitiatePaymentResponse): string | null {
  const raw =
    data.livenessSessionId ||
    data.challengeSessionId ||
    data.challengeId ||
    data.livenessChallengeId ||
    data.sessionId ||
    data.escrowSessionId ||
    null;
  return raw ? String(raw) : null;
}

function extractTransactionId(data: InitiatePaymentResponse): string {
  return String(data.transactionId || data.txnId || data.id || '');
}

function extractChallengeCode(data: InitiatePaymentResponse): string | null {
  const raw =
    data.challengeCode ??
    data.code ??
    data.escrowCode ??
    data.livenessCode ??
    data.otp ??
    '';
  const digits = String(raw).replace(/\D/g, '').slice(0, 4);
  return /^\d{4}$/.test(digits) ? digits : null;
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
      const body = response.data?.data ?? response.data;
      return body?.data ?? body;
    },
    onSuccess: (data) => {
      const verdict = (data.verdict || 'PASS') as PaymentVerdict;
      const { step, path } = routeForVerdict(verdict);

      const txnId = extractTransactionId(data);
      const livenessSessionId = extractLivenessSessionId(data);
      const challengeCode = extractChallengeCode(data);
      const challengeSessionId = livenessSessionId || txnId || null;

      console.log('[ConfirmPayment] initiate success', {
        verdict,
        txnId,
        challengeSessionId,
        challengeCode,
        rawKeys: data && typeof data === 'object' ? Object.keys(data) : [],
        raw: data,
      });

      usePaymentStore.setState({
        transactionId: txnId || paymentState.transactionId,
        challengeSessionId,
        challengeCode,
        verdict,
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
        <AlertCircle className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-xl font-bold text-on-dark font-sans">No Active Payment Session</h2>
        <p className="text-muted text-sm">
          Please enter the receiver VPA and amount to initiate a payment.
        </p>
        <button
          onClick={() => navigate('/payment/send')}
          className="px-6 py-2.5 rounded-md bg-primary text-on-primary font-semibold text-sm tracking-wide shadow-sm hover:bg-primary-hover"
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
          className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Entry
        </button>
        <div className="text-xs font-mono text-muted tracking-wider uppercase font-semibold">
          Step 2 of 3
        </div>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-dark tracking-tight font-sans">
          Confirm Payment
        </h1>
        <p className="text-muted text-xs sm:text-sm mt-1">
          Review receiver and transaction details before security routing.
        </p>
      </div>

      <div className="bg-surface-card-dark border border-hairline-dark rounded-xl p-5 sm:p-6 space-y-6 shadow-xl">
        <div className="text-center py-4 bg-canvas border border-hairline-dark rounded-lg">
          <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1 font-semibold">
            Paying Total
          </div>
          <AmountDisplay amount={targetAmount} size="xl" />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase font-semibold text-muted tracking-wider">
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
          <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-muted mb-2">
            Payment Note / Remarks (Optional)
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Dinner, Groceries, Rent"
              maxLength={50}
              className="w-full bg-canvas border border-hairline-dark rounded-lg pl-10 pr-4 py-2.5 text-on-dark text-sm placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-trading-down/10 border border-trading-down/30 text-trading-down text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3.5 rounded-lg bg-surface-elevated-dark border border-hairline-dark flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted">
            <Shield className="w-4 h-4 text-trading-up" />
            <span>AI Multi-Vector Shield</span>
          </div>
          <span className="text-[11px] font-mono text-trading-up font-bold">ACTIVE</span>
        </div>

        <button
          type="button"
          onClick={handleProceed}
          disabled={initiateMutation.isPending}
          className="w-full py-3.5 px-6 rounded-md bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40 text-on-primary font-semibold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
        >
          {initiateMutation.isPending ? (
            <>
              <span className="animate-spin text-on-primary">●</span>
              <span>Running Risk Evaluation...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 stroke-[2.5]" />
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