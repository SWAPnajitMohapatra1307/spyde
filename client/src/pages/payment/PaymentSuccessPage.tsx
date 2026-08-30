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
    const colors = ['#10B981', '#F59E0B', '#FF6600', '#3B82F6', '#EC4899'];
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
      <div className="bg-canvas-card border border-accent-green/30 rounded-2xl p-6 sm:p-8 text-center space-y-6 relative shadow-2xl">
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-pill bg-accent-green/15 border border-accent-green/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-accent-green animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-primary text-canvas p-1 rounded-pill shadow">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-accent-green font-bold bg-accent-green/10 px-3 py-1 rounded-pill border border-accent-green/20">
            Payment Completed
          </span>
          <div className="mt-3">
            <AmountDisplay amount={amount || 0} size="xl" colorClass="text-bone" />
          </div>
          <p className="text-bone-muted text-sm mt-1">
            Transferred successfully to{' '}
            <span className="text-bone font-semibold">{receiverName || vpa || 'Recipient'}</span>
          </p>
        </div>

        {/* Transaction Metadata Card */}
        <div className="bg-canvas border border-white/5 rounded-xl p-4 text-xs font-mono space-y-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-bone-muted">Recipient VPA</span>
            <span className="text-bone select-all">{vpa || 'N/A'}</span>
          </div>
          {transactionId && (
            <div className="flex items-center justify-between">
              <span className="text-bone-muted">Transaction ID</span>
              <div className="flex items-center gap-1.5">
                <span className="text-bone truncate max-w-[140px] sm:max-w-[200px]">
                  {transactionId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTxId}
                  className="text-bone-muted hover:text-bone transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-bone-muted">Timestamp</span>
            <span className="text-bone tnum">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Cryptographic Artifacts Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <Link
            to={`/certificates/${certificateId || transactionId || 'demo-cert'}`}
            className="p-3.5 rounded-xl bg-canvas-elevated hover:bg-white/10 border border-white/5 flex items-center justify-between group transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-4 h-4 text-primary" />
              <div>
                <div className="text-xs font-bold text-bone">Fraud Certificate</div>
                <div className="text-[10px] text-bone-muted font-mono">Ed25519 Signed</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-bone-muted group-hover:text-bone transition-colors" />
          </Link>

          <Link
            to={`/face-blob/${transactionId || 'demo-blob'}`}
            className="p-3.5 rounded-xl bg-canvas-elevated hover:bg-white/10 border border-white/5 flex items-center justify-between group transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-accent-green" />
              <div>
                <div className="text-xs font-bold text-bone">Face Vector Blob</div>
                <div className="text-[10px] text-bone-muted font-mono">Zero-Knowledge Proof</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-bone-muted group-hover:text-bone transition-colors" />
          </Link>
        </div>

        {/* CTA Return Home */}
        <button
          type="button"
          onClick={handleReturnHome}
          className="w-full py-3.5 px-5 rounded-xl bg-primary hover:bg-primary/90 text-canvas font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};