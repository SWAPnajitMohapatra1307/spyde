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
      {/* Honey Amber Ambient Wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-15"
        style={{
          background: 'radial-gradient(circle at 50% 0%, #D97706 0%, rgba(217, 119, 6, 0) 70%)',
        }}
      />

      <div className="relative max-w-xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/payment/confirm')}
            className="inline-flex items-center gap-1.5 text-bone-muted hover:text-bone text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Summary
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-accent-yellow/15 border border-accent-yellow/30 text-accent-yellow text-xs font-mono font-bold">
            <AlertTriangle className="w-3.5 h-3.5" /> CAUTION REQUIRED
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-bone tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-accent-yellow flex-shrink-0" />
            Security Warning Detected
          </h1>
          <p className="text-bone-muted text-sm mt-1">
            SPYDE detected anomalous telemetry patterns for this transaction. Please verify carefully before proceeding.
          </p>
        </div>

        {/* Payment Preview Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-canvas-card border border-white/10 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[11px] font-mono uppercase text-bone-muted tracking-wider">
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
        <div className="bg-accent-yellow/5 border border-accent-yellow/20 rounded-2xl p-4 text-xs text-bone space-y-2">
          <div className="font-bold text-accent-yellow uppercase tracking-wider font-mono text-[11px]">
            Things to check:
          </div>
          <ul className="list-disc list-inside text-bone-muted space-y-1">
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
            className="w-full py-3.5 px-5 rounded-pill bg-accent-yellow hover:bg-accent-yellow/90 text-canvas font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>Proceed with Caution</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-3 px-5 rounded-pill bg-canvas-card hover:bg-canvas-elevated border border-white/10 text-bone-muted hover:text-bone font-medium text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" /> Cancel Payment & Return Home
          </button>
        </div>
      </div>
    </div>
  );
};