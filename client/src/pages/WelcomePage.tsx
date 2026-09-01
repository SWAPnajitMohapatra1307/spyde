import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Eye, 
  QrCode, 
  FileCheck2, 
  Users, 
  Zap, 
  Activity 
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Eye,
      title: '3D Biometric Liveness',
      desc: 'Escrow holds release only when the receiver completes passive anti-spoof biometric verification.',
    },
    {
      icon: QrCode,
      title: 'Counter QR Tamper Detection',
      desc: 'GPS geofencing and computer vision flag physical sticker overlays before you authorize payment.',
    },
    {
      icon: FileCheck2,
      title: 'Ed25519 Signed Certificates',
      desc: 'Every transaction is sealed with a non-repudiable cryptographic proof anchored on-chain.',
    },
    {
      icon: Users,
      title: 'Zero-Friction Safe Circle',
      desc: 'Trusted family and recurring vendor handles bypass security friction automatically.',
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col justify-between selection:bg-primary selection:text-on-primary">
      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary font-black text-xl shadow-sm">
            S
          </div>
          <span className="font-bold text-2xl tracking-tight text-on-dark font-sans">SPYDE</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="px-4 py-2 rounded-md text-sm font-semibold text-muted hover:text-on-dark transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 rounded-md bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm tracking-wide transition-all shadow-sm"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-12 text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold">
          <Zap className="w-3.5 h-3.5" /> NEXT-GEN UPI FRAUD PREVENTION MIDDLEWARE
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold text-on-dark tracking-tight leading-tight font-sans">
          Every Rupee Deserves a <span className="text-primary">Receiver Check</span>.
        </h1>

        <p className="text-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Zero-trust UPI payments with real-time merchant geofencing, 3D face liveness escrow, and Ed25519 non-repudiation certificates.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-semibold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Activate SPYDE Shield</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-surface-card-dark hover:bg-surface-elevated-dark border border-hairline-dark text-on-dark font-semibold text-sm tracking-wide transition-colors"
          >
            Sign In with Account
          </button>
        </div>
      </section>

      {/* Feature Pillar Matrix */}
      <section className="max-w-6xl mx-auto px-6 py-12 relative z-10 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-surface-card-dark border border-hairline-dark rounded-xl p-5 space-y-3 shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-elevated-dark border border-hairline-dark flex items-center justify-center text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-on-dark font-sans">{feat.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline-dark py-6 px-6 relative z-10 bg-surface-card-dark/40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-trading-up" />
            <span>SPYDE Core Network Active (100% SLA)</span>
          </div>
          <div className="font-mono text-[11px]">
            Compliant with NPCI Unified Payments Security Standards 2025
          </div>
        </div>
      </footer>
    </div>
  );
};