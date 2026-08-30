import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldBan, AlertOctagon, FileWarning, ArrowLeft, Home } from 'lucide-react';
import { usePaymentStore } from '@/stores/paymentStore';
import { AmountDisplay } from '@/components/payment/AmountDisplay';
import { ReceiverCard } from '@/components/payment/ReceiverCard';
import { RiskVerdictCard } from '@/components/payment/RiskVerdictCard';

export const FrictionBlockedPage: React.FC = () => {
  const navigate = useNavigate();
  const { vpa, receiverName, receiverBank, amount, riskScore, signals, reset } = usePaymentStore();

  const handleFileComplaint = () => {
    const complaintParams = new URLSearchParams({
      vpa: vpa || '',
      category: 'FRAUD',
      amount: amount ? amount.toString() : '',
    });
    navigate(`/complaints/new?${complaintParams.toString()}`);
  };

  const handleReturnHome = () => {
    reset();
    navigate('/home');
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-canvas py-6 px-4">
      {/* Deep Ruby Ambient Wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-25"
        style={{
          background: 'radial-gradient(circle at 50% 0%, #9F1239 0%, rgba(159, 18, 57, 0) 70%)',
        }}
      />

      <div className="relative max-w-xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/payment/send')}
            className="inline-flex items-center gap-1.5 text-bone-muted hover:text-bone text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> New Payment
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-accent-red/20 border border-accent-red/40 text-accent-red text-xs font-mono font-bold">
            <AlertOctagon className="w-3.5 h-3.5" /> TRANSACTIONS HALTED
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-bone tracking-tight flex items-center gap-2.5">
            <ShieldBan className="w-8 h-8 text-accent-red flex-shrink-0" />
            Transaction Blocked
          </h1>
          <p className="text-bone-muted text-sm mt-1">
            SPYDE core network has permanently intercepted this payment. Under NPCI safety guidelines, PIN entry is disabled.
          </p>
        </div>

        {/* Receiver Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-canvas-card border border-white/10 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[11px] font-mono uppercase text-bone-muted tracking-wider">
              Attempted Amount
            </span>
            <AmountDisplay amount={amount || 0} size="md" className="mt-1 text-accent-red" />
          </div>
          <ReceiverCard
            name={receiverName}
            vpa={vpa || ''}
            bank={receiverBank}
            compact
          />
        </div>

        {/* Verdict & Evidence */}
        <RiskVerdictCard
          verdict="BLOCK"
          riskScore={riskScore ?? 96}
          signals={signals}
          title="Known Fraud or Active Syndicate Match"
          description="This UPI handle is flagged in the cross-bank fraud registry for severe impersonation or mule network activity."
        />

        {/* Strict Security Policy Notice (Explicitly NO PIN INPUT) */}
        <div className="bg-accent-red/10 border border-accent-red/25 rounded-2xl p-4 text-xs text-bone space-y-2">
          <div className="font-bold text-accent-red uppercase tracking-wider font-mono flex items-center gap-2">
            <ShieldBan className="w-4 h-4" /> Hard Block Policy Enforced
          </div>
          <p className="text-bone-muted leading-relaxed">
            To safeguard your bank account, entering your UPI PIN for this recipient is completely blocked across the network. If you suspect you were coerced, please log a formal report below.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleFileComplaint}
            className="w-full py-4 px-6 rounded-pill bg-accent-red hover:bg-accent-red/90 text-white font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <FileWarning className="w-4 h-4" />
            <span>File a Complaint / Report VPA</span>
          </button>

          <button
            type="button"
            onClick={handleReturnHome}
            className="w-full py-3 px-5 rounded-pill bg-canvas-card hover:bg-canvas-elevated border border-white/10 text-bone-muted hover:text-bone font-medium text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};