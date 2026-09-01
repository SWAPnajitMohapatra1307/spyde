import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Lock, Delete, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { usePaymentStore } from '@/stores/paymentStore';
import { AmountDisplay } from '@/components/payment/AmountDisplay';

interface ConfirmPaymentPayload {
  transactionId: string;
  pin: string;
}

interface ConfirmPaymentResponse {
  status: 'SUCCESS' | 'FAILED' | 'CHALLENGE_REQUIRED';
  certificateId?: string;
  message?: string;
}

export const PinPadPage: React.FC = () => {
  const navigate = useNavigate();
  const { transactionId, amount, vpa, receiverName, setStep, setCertificateId, setFailureReason } =
    usePaymentStore();

  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirmMutation = useMutation({
    mutationFn: async (payload: ConfirmPaymentPayload): Promise<ConfirmPaymentResponse> => {
      const response = await apiClient.post<any>('/api/payment/confirm', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      if (data.status === 'SUCCESS') {
        if (data.certificateId) {
          setCertificateId(data.certificateId);
        }
        setStep('SUCCESS');
        navigate('/payment/success');
      } else {
        setFailureReason(data.message || 'Transaction authorization failed.');
        setStep('FAILED');
        navigate('/payment/failed');
      }
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Payment processing error. Please try again.';
      setFailureReason(errorMsg);
      setStep('FAILED');
      navigate('/payment/failed');
    },
  });

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4 && !confirmMutation.isPending) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMessage(null);

      if (nextPin.length === 4) {
        verifyAndSubmit(nextPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !confirmMutation.isPending) {
      setPin(pin.slice(0, -1));
      setErrorMessage(null);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setPin('');
    }, 600);
  };

  const verifyAndSubmit = (inputPin: string) => {
    // Enforce Demo PIN '1234'
    if (inputPin !== '1234') {
      setErrorMessage('Incorrect PIN. For testing demo, use 1234.');
      triggerShake();
      return;
    }

    if (!transactionId) {
      setErrorMessage('Missing transaction context.');
      return;
    }

    confirmMutation.mutate({
      transactionId,
      pin: inputPin,
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          disabled={confirmMutation.isPending}
          className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>
        <div className="text-xs font-mono text-muted tracking-wider uppercase font-semibold">
          UPI Authorization
        </div>
      </div>

      {/* Recipient & Amount Summary */}
      <div className="text-center space-y-2">
        <div className="text-xs text-muted font-mono uppercase tracking-wider">
          Paying {receiverName || vpa || 'Recipient'}
        </div>
        <AmountDisplay amount={amount || 0} size="xl" />
        <div className="text-xs font-mono text-muted select-all">
          {vpa}
        </div>
      </div>

      {/* PIN Dots Area */}
      <div className="bg-surface-card-dark border border-hairline-dark rounded-xl p-6 text-center space-y-6 shadow-xl">
        <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider text-muted font-semibold">
          <Lock className="w-3.5 h-3.5 text-primary" /> Enter 4-Digit UPI PIN
        </div>

        {/* 4 Dots */}
        <div
          className={`flex items-center justify-center gap-5 py-2 ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-primary ring-4 ring-primary/20 scale-110'
                    : 'bg-surface-elevated-dark border border-hairline-dark'
                }`}
              />
            );
          })}
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-trading-down/10 border border-trading-down/30 text-trading-down text-xs flex items-center justify-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {confirmMutation.isPending && (
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-primary animate-pulse font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Authorizing with Bank Switch...
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              disabled={confirmMutation.isPending || pin.length >= 4}
              className="h-14 rounded-xl bg-canvas border border-hairline-dark hover:border-primary active:bg-surface-elevated-dark text-on-dark font-mono text-2xl font-bold transition-all disabled:opacity-40"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Blank, 0, Backspace */}
          <div className="h-14 flex items-center justify-center text-xs font-mono text-muted/60">
            DEMO: 1234
          </div>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={confirmMutation.isPending || pin.length >= 4}
            className="h-14 rounded-xl bg-canvas border border-hairline-dark hover:border-primary active:bg-surface-elevated-dark text-on-dark font-mono text-2xl font-bold transition-all disabled:opacity-40"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={confirmMutation.isPending || pin.length === 0}
            className="h-14 rounded-xl bg-canvas border border-hairline-dark hover:border-hairline-dark active:bg-surface-elevated-dark text-muted hover:text-white flex items-center justify-center transition-all disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};