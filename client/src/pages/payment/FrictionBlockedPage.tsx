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
      <div className="relative max-w-xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/payment/send')}
            className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> New Payment
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-trading-down/15 border border-trading-down/30 text-trading-down text-xs font-mono font-bold">
            <AlertOctagon className="w-3.5 h-3.5" /> TRANSACTIONS HALTED
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-dark tracking-tight flex items-center gap-2.5 font-sans">
            <ShieldBan className="w-8 h-8 text-trading-down flex-shrink-0" />
            Transaction Blocked
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">
            SPYDE core network has permanently intercepted this payment. Under NPCI safety guidelines, PIN entry is disabled.
          </p>
        </div>

        {/* Receiver Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-surface-card-dark border border-hairline-dark rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[11px] font-mono uppercase text-muted tracking-wider font-semibold">
              Attempted Amount
            </span>
            <AmountDisplay amount={amount || 0} size="md" className="mt-1 text-trading-down" />
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
        <div className="bg-surface-card-dark border border-trading-down/30 rounded-xl p-4 text-xs text-body space-y-2">
          <div className="font-bold text-trading-down uppercase tracking-wider font-mono flex items-center gap-2 text-[11px]">
            <ShieldBan className="w-4 h-4" /> Hard Block Policy Enforced
          </div>
          <p className="text-muted leading-relaxed">
            To safeguard your bank account, entering your UPI PIN for this recipient is completely blocked across the network. If you suspect you were coerced, please log a formal report below.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleFileComplaint}
            className="w-full py-3.5 px-6 rounded-md bg-trading-down hover:opacity-90 active:opacity-100 text-on-dark font-semibold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
          >
            <FileWarning className="w-4 h-4" />
            <span>File a Complaint / Report VPA</span>
          </button>

          <button
            type="button"
            onClick={handleReturnHome}
            className="w-full py-2.5 px-5 rounded-md bg-surface-card-dark hover:bg-surface-elevated-dark border border-hairline-dark text-muted hover:text-on-dark font-semibold text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};