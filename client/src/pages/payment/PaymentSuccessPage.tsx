import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  FileCheck2, 
  Camera, 
  Home, 
  Copy, 
  Check 
} from 'lucide-react';
import { usePaymentStore } from '@/stores/paymentStore';
import { AmountDisplay } from '@/components/payment/AmountDisplay';

export const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { amount, vpa, receiverName, transactionId, certificateId, reset } = usePaymentStore();

  const [copied, setCopied] = useState<boolean>(false);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; color: string; size: number; duration: number }>
  >([]);

  useEffect(() => {
    // Generate simple confetti particles
    const colors = ['#0ecb81', '#fcd535', '#f0b90b', '#3b82f6', '#2dbdb6'];
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 80 - 40,
      color: colors[i % colors.length],
      size: Math.floor(Math.random() * 6) + 4,
      duration: Math.random() * 1.5 + 1.5,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const handleCopyTxId = () => {
    if (transactionId) {
      navigator.clipboard.writeText(transactionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReturnHome = () => {
    reset();
    navigate('/home');
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] max-w-xl mx-auto px-4 py-8 space-y-6 overflow-hidden">
      {/* Confetti Container */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-20">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-pill animate-bounce"
            style={{
              left: `${p.x}%`,
              top: `${Math.max(0, p.y)}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              animationDuration: `${p.duration}s`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>

      {/* Success Badge & Card */}
      <div className="bg-surface-card-dark border border-trading-up/30 rounded-xl p-6 sm:p-8 text-center space-y-6 relative shadow-2xl">
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-pill bg-trading-up/15 border border-trading-up/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-trading-up animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-primary text-on-primary p-1.5 rounded-full shadow">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-trading-up font-bold bg-trading-up/10 px-3 py-1 rounded-pill border border-trading-up/20">
            Payment Completed
          </span>
          <div className="mt-3">
            <AmountDisplay amount={amount || 0} size="xl" colorClass="text-on-dark" />
          </div>
          <p className="text-muted text-sm mt-1">
            Transferred successfully to{' '}
            <span className="text-on-dark font-semibold font-sans">{receiverName || vpa || 'Recipient'}</span>
          </p>
        </div>

        {/* Transaction Metadata Card */}
        <div className="bg-canvas border border-hairline-dark rounded-lg p-4 text-xs font-mono space-y-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-muted">Recipient VPA</span>
            <span className="text-on-dark select-all">{vpa || 'N/A'}</span>
          </div>
          {transactionId && (
            <div className="flex items-center justify-between">
              <span className="text-muted">Transaction ID</span>
              <div className="flex items-center gap-1.5">
                <span className="text-on-dark truncate max-w-[140px] sm:max-w-[200px]">
                  {transactionId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTxId}
                  className="text-muted hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-trading-up" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted">Timestamp</span>
            <span className="text-on-dark tnum">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Cryptographic Artifacts Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <Link
            to={`/certificates/${certificateId || transactionId || 'demo-cert'}`}
            className="p-3.5 rounded-lg bg-surface-elevated-dark hover:bg-hairline-dark border border-hairline-dark flex items-center justify-between group transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-4 h-4 text-primary" />
              <div>
                <div className="text-xs font-bold text-on-dark">Fraud Certificate</div>
                <div className="text-[10px] text-muted font-mono">Ed25519 Signed</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-white transition-colors" />
          </Link>

          <Link
            to={`/face-blob/${transactionId || 'demo-blob'}`}
            className="p-3.5 rounded-lg bg-surface-elevated-dark hover:bg-hairline-dark border border-hairline-dark flex items-center justify-between group transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-trading-up" />
              <div>
                <div className="text-xs font-bold text-on-dark">Face Vector Blob</div>
                <div className="text-[10px] text-muted font-mono">Zero-Knowledge Proof</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-white transition-colors" />
          </Link>
        </div>

        {/* CTA Return Home */}
        <button
          type="button"
          onClick={handleReturnHome}
          className="w-full py-3.5 px-5 rounded-md bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-semibold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};