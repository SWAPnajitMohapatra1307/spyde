import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  QrCode,
  XCircle,
  Home
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { usePaymentStore } from '@/stores/paymentStore';
import { AmountDisplay } from '@/components/payment/AmountDisplay';
import { ReceiverCard } from '@/components/payment/ReceiverCard';

interface LivenessStatusResponse {
  sessionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  receiverVpa?: string;
  verifiedAt?: string;
  score?: number;
}

export const LivenessPendingPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    transactionId, 
    amount, 
    vpa, 
    receiverName, 
    receiverBank, 
    setStep, 
    reset 
  } = usePaymentStore();

  const sessionId = transactionId || 'demo-escrow-session';
  const challengeUrl = `${window.location.origin}/liveness/${sessionId}`;

  const [copied, setCopied] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 minutes

  // 15-Minute Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Real-time polling for receiver verification status
  const { data: sessionStatus, refetch, isFetching } = useQuery<LivenessStatusResponse>({
    queryKey: ['livenessStatus', sessionId],
    queryFn: async () => {
      try {
        const res = await apiClient.get<LivenessStatusResponse>(`/api/liveness/status/${sessionId}`);
        return res.data;
      } catch {
        // Mock fallback response for sandbox/demo
        return {
          sessionId,
          status: 'PENDING',
          receiverVpa: vpa || 'recipient@upi',
        };
      }
    },
    refetchInterval: 4000, // Poll every 4 seconds
  });

  const isVerified = sessionStatus?.status === 'VERIFIED';
  const isExpired = secondsRemaining === 0 || sessionStatus?.status === 'EXPIRED';

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(challengeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReleaseFunds = () => {
    setStep('PIN_ENTRY');
    navigate('/payment/pin');
  };

  const handleCancelEscrow = () => {
    reset();
    navigate('/home');
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-canvas py-6 px-4">
      {/* Terracotta Ambient Glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-15"
        style={{
          background: 'radial-gradient(circle at 50% 0%, #C2410C 0%, rgba(194, 65, 12, 0) 70%)',
        }}
      />

      <div className="relative max-w-xl mx-auto space-y-6">
        {/* Header Badges */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-accent-orange/15 border border-accent-orange/30 text-accent-orange text-xs font-mono font-bold">
            <Lock className="w-3.5 h-3.5" /> CRYPTOGRAPHIC ESCROW
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-bone-muted">
            <Clock className="w-3.5 h-3.5 text-accent-yellow" />
            <span className="tnum font-bold text-bone">{formatCountdown(secondsRemaining)}</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-bone tracking-tight">
            Awaiting Biometric Liveness
          </h1>
          <p className="text-bone-muted text-sm mt-1">
            Funds are locked in high-security escrow. The receiver must complete a 3D face scan before settlement.
          </p>
        </div>

        {/* Escrow Status Banner */}
        <div className="bg-canvas-card border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <span className="text-[11px] font-mono text-bone-muted uppercase tracking-wider">
                Escrow Hold Amount
              </span>
              <div className="mt-0.5">
                <AmountDisplay amount={amount || 0} size="lg" />
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono text-bone-muted uppercase tracking-wider">
                Vault Status
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {isVerified ? (
                  <span className="text-xs font-mono font-bold text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-pill border border-accent-green/20 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED
                  </span>
                ) : isExpired ? (
                  <span className="text-xs font-mono font-bold text-accent-red bg-accent-red/10 px-2 py-0.5 rounded-pill border border-accent-red/20 inline-flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> EXPIRED
                  </span>
                ) : (
                  <span className="text-xs font-mono font-bold text-accent-yellow bg-accent-yellow/10 px-2 py-0.5 rounded-pill border border-accent-yellow/20 inline-flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} /> PENDING LIVENESS
                  </span>
                )}
              </div>
            </div>
          </div>

          <ReceiverCard
            name={receiverName}
            vpa={vpa || 'receiver@upi'}
            bank={receiverBank}
            compact
          />
        </div>

        {/* Shareable Verification Link Card */}
        <div className="bg-canvas-card border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-bone">Receiver Challenge Dispatch</h3>
            <button
              onClick={() => void refetch()}
              className="text-bone-muted hover:text-bone text-xs font-mono inline-flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} /> Check Status
            </button>
          </div>

          <p className="text-xs text-bone-muted">
            Share this one-time challenge link with the receiver. Once they complete the scan, you can unlock and release the funds.
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-canvas border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-bone-muted truncate select-all">
              {challengeUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-canvas-elevated hover:bg-white/10 border border-white/10 text-bone text-xs font-semibold inline-flex items-center gap-1.5 transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              title="Show QR Code"
              className="p-2 rounded-xl bg-canvas-elevated hover:bg-white/10 border border-white/10 text-bone text-xs transition-colors flex-shrink-0"
            >
              <QrCode className="w-4 h-4 text-primary" />
            </button>
          </div>

          {/* Test Action / Receiver Simulation Link */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-bone-muted">Testing receiver flow?</span>
            <a
              href={`/liveness/${sessionId}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-mono inline-flex items-center gap-1 font-semibold"
            >
              Open Receiver Challenge <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Auto-Refund Policy Notice */}
        <div className="p-3.5 rounded-xl bg-canvas-elevated border border-white/5 flex items-start gap-2.5 text-xs text-bone-muted">
          <AlertCircle className="w-4 h-4 text-accent-yellow flex-shrink-0 mt-0.5" />
          <span>
            If the receiver does not complete biometric verification before the timer reaches 00:00, the escrow vault will cancel and automatically refund your account.
          </span>
        </div>

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          {isVerified ? (
            <button
              type="button"
              onClick={handleReleaseFunds}
              className="w-full py-4 px-6 rounded-pill bg-accent-green hover:bg-accent-green/90 text-canvas font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Receiver Verified — Enter PIN to Release</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-4 px-6 rounded-pill bg-canvas-elevated border border-white/10 text-bone-muted font-bold text-sm tracking-wide opacity-60 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Awaiting Receiver Liveness Proof...</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCancelEscrow}
            className="w-full py-3 px-5 rounded-pill bg-canvas-card hover:bg-canvas-elevated border border-white/10 text-bone-muted hover:text-bone font-medium text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" /> Cancel Escrow & Return Home
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-canvas-card border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-bone font-bold text-base">Receiver Scan QR</h3>
            <p className="text-bone-muted text-xs">
              Scan with mobile camera to open face liveness verification.
            </p>
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-xl flex items-center justify-center">
              <QrCode className="w-36 h-36 text-canvas" />
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-canvas-elevated hover:bg-white/10 text-bone text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};