import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { usePaymentStore } from '@/stores/paymentStore';
import { AmountDisplay } from '@/components/payment/AmountDisplay';
import { ReceiverCard } from '@/components/payment/ReceiverCard';
import { RiskVerdictCard } from '@/components/payment/RiskVerdictCard';

export const FrictionWarnPage: React.FC = () => {
  const navigate = useNavigate();
  const { vpa, receiverName, receiverBank, amount, riskScore, signals, setStep, reset } =
    usePaymentStore();

  const handleProceedWithCaution = () => {
    setStep('PIN_ENTRY');
    navigate('/payment/pin');
  };

  const handleCancel = () => {
    reset();
    navigate('/home');
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-canvas py-6 px-4">
      <div className="relative max-w-xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/payment/confirm')}
            className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Summary
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-primary/15 border border-primary/30 text-primary text-xs font-mono font-bold">
            <AlertTriangle className="w-3.5 h-3.5" /> CAUTION REQUIRED
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-dark tracking-tight flex items-center gap-2.5 font-sans">
            <ShieldAlert className="w-7 h-7 text-primary flex-shrink-0" />
            Security Warning Detected
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">
            SPYDE detected anomalous telemetry patterns for this transaction. Please verify carefully before proceeding.
          </p>
        </div>

        {/* Payment Preview Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-surface-card-dark border border-hairline-dark rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[11px] font-mono uppercase text-muted tracking-wider font-semibold">
              Transfer Amount
            </span>
            <AmountDisplay amount={amount || 0} size="md" className="mt-1" />
          </div>
          <ReceiverCard
            name={receiverName}
            vpa={vpa || ''}
            bank={receiverBank}
            compact
          />
        </div>

        {/* Verdict Details & Signal Breakdown */}
        <RiskVerdictCard
          verdict="WARN"
          riskScore={riskScore ?? 45}
          signals={signals}
          title="Elevated Risk Level"
          description="This receiver has received unusual velocity spikes or is newly created on the network."
        />

        {/* Safety Tips Card */}
        <div className="bg-surface-card-dark border border-primary/20 rounded-xl p-4 text-xs text-body space-y-2">
          <div className="font-bold text-primary uppercase tracking-wider font-mono text-[11px]">
            Things to check:
          </div>
          <ul className="list-disc list-inside text-muted space-y-1">
            <li>Did you receive a request from an unknown caller offering refunds or job schemes?</li>
            <li>Confirm that the UPI VPA matches the exact person or business you intended to pay.</li>
            <li>Once confirmed, UPI transactions cannot be reversed instantly by bank support.</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleProceedWithCaution}
            className="w-full py-3.5 px-5 rounded-md bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-semibold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Proceed with Caution</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-3 px-5 rounded-md bg-surface-card-dark hover:bg-surface-elevated-dark border border-hairline-dark text-muted hover:text-on-dark font-semibold text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" /> Cancel Payment & Return Home
          </button>
        </div>
      </div>
    </div>
  );
};