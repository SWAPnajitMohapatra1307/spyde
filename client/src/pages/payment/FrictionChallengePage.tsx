import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Copy,
  ExternalLink,
  QrCode,
  X,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { usePaymentStore } from '@/stores/paymentStore';
import { apiClient } from '@/lib/apiClient';

export const FrictionChallengePage: React.FC = () => {
  const navigate = useNavigate();
  const { vpa, amount, transactionId, setStep, reset } = usePaymentStore();

  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'PENDING' | 'PASSED' | 'FAILED'>('PENDING');

  const hasHandledSuccessRef = useRef(false);

  // Derive challenge session ID from transactionId or fallback
  const challengeSessionId = transactionId || 'demo-session';

  // Build mobile accessible URL
  const host = window.location.host;
  const protocol = window.location.protocol;
  const challengeUrl = `${protocol}//${host}/liveness/${challengeSessionId}`;

  // High contrast QR Code API URL (Black on White)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    challengeUrl
  )}&color=000000&bgcolor=ffffff&margin=1`;

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(challengeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    window.open(challengeUrl, '_blank');
  };

  // Poll liveness verification status from backend
  useEffect(() => {
    if (!challengeSessionId || hasHandledSuccessRef.current) return;

    const interval = setInterval(async () => {
      if (hasHandledSuccessRef.current) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await apiClient.get<{
          success: boolean;
          data: { status: string; verdict?: string };
        }>(`/api/liveness/status/${challengeSessionId}`);
        
        const currentStatus = res.data?.data?.status || res.data?.data?.verdict;

        if (
          (currentStatus === 'PASSED' ||
          currentStatus === 'VERIFIED' ||
          currentStatus === 'PASS') &&
          !hasHandledSuccessRef.current
        ) {
          hasHandledSuccessRef.current = true;
          clearInterval(interval);
          setStatus('PASSED');
          
          // Update store step to PIN_ENTRY and navigate immediately
          setStep('PIN_ENTRY');
          setTimeout(() => {
            navigate('/payment/pin', { replace: true });
          }, 800);
        } else if (
          (currentStatus === 'FAILED' || currentStatus === 'EXPIRED') &&
          !hasHandledSuccessRef.current
        ) {
          setStatus('FAILED');
          clearInterval(interval);
        }
      } catch {
        // Continue polling silently
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [challengeSessionId, setStep, navigate]);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 max-w-md mx-auto space-y-6">
      {/* Risk Friction Header */}
      <div className="w-full bg-surface-card-dark border border-primary/30 rounded-xl p-6 text-center space-y-3 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />

        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-on-dark font-sans">Biometric Challenge Required</h2>
        <p className="text-xs text-muted leading-relaxed">
          High-risk transaction detected for{' '}
          <span className="text-white font-mono font-semibold">{vpa || 'Receiver'}</span>
          {amount ? ` (₹${amount.toLocaleString('en-IN')})` : ''}.
        </p>

        <div className="bg-canvas border border-hairline-dark rounded-lg p-3 flex items-center justify-between text-xs font-mono">
          <span className="text-muted">Escrow Status:</span>
          {status === 'PENDING' && (
            <span className="text-primary flex items-center gap-1.5 animate-pulse font-semibold">
              <Clock className="w-3.5 h-3.5" /> Awaiting Verification
            </span>
          )}
          {status === 'PASSED' && (
            <span className="text-trading-up font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Biometrics Verified — Redirecting to PIN...
            </span>
          )}
          {status === 'FAILED' && (
            <span className="text-trading-down font-bold flex items-center gap-1.5">
              Verification Failed / Expired
            </span>
          )}
        </div>
      </div>

      {/* Receiver Dispatch Links */}
      <div className="w-full bg-surface-card-dark border border-hairline-dark rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono text-muted uppercase tracking-wider font-semibold">
            Receiver Challenge Dispatch
          </h3>
          <button
            onClick={() => setShowQrModal(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
          >
            <QrCode className="w-4 h-4" /> Show QR
          </button>
        </div>

        <p className="text-xs text-muted">
          Share this verification link with the receiver to unlock funds from escrow:
        </p>

        {/* Clickable & Copyable Link Box */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={challengeUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="w-full bg-canvas border border-hairline-dark rounded-lg px-3 py-2 text-xs font-mono text-on-dark focus:outline-none focus:border-primary select-all"
          />
          <button
            onClick={handleCopyLink}
            className="px-3 py-2 rounded-lg bg-surface-elevated-dark hover:bg-hairline-dark border border-hairline-dark text-on-dark text-xs font-semibold transition-all flex items-center gap-1 shrink-0"
            title="Copy Link"
          >
            <Copy className="w-4 h-4 text-primary" />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleOpenLink}
            className="text-xs text-muted hover:text-white flex items-center gap-1 font-mono hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" /> Open Receiver Page Directly
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-3">
        <button
          onClick={() => setShowQrModal(true)}
          className="w-full py-3.5 rounded-md bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
        >
          <QrCode className="w-5 h-5 stroke-[2.5]" />
          <span>Display Receiver QR Code</span>
        </button>

        <button
          onClick={() => {
            reset();
            navigate('/payment/send');
          }}
          className="w-full py-2.5 rounded-md bg-transparent hover:bg-surface-card-dark text-muted hover:text-on-dark text-xs font-mono transition-all"
        >
          Cancel Transaction
        </button>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card-dark border border-hairline-dark rounded-xl max-w-sm w-full p-6 text-center space-y-5 relative shadow-2xl">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-white p-1 rounded-lg hover:bg-surface-elevated-dark"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-on-dark font-sans">Receiver Scan QR</h3>
              <p className="text-xs text-muted">
                Scan with mobile camera to open face liveness verification.
              </p>
            </div>

            {/* High Contrast QR Container */}
            <div className="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto border-4 border-slate-200">
              <img
                src={qrImageUrl}
                alt="Receiver Liveness Challenge QR Code"
                className="w-52 h-52 object-contain"
              />
            </div>

            <p className="text-[11px] text-muted font-mono leading-tight">
              If receiver does not complete biometric verification, escrow vault will automatically refund your account.
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-md bg-surface-elevated-dark border border-hairline-dark text-on-dark font-semibold text-xs hover:bg-hairline-dark transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};