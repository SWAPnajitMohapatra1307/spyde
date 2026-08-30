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
    <div className="min-h-screen bg-canvas text-bone flex flex-col justify-between selection:bg-primary/30 selection:text-white">
      {/* Ambient Cyber Mesh */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-20">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-primary/40 to-transparent rounded-pill blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent-orange flex items-center justify-center text-canvas font-black text-xl shadow-lg">
            S
          </div>
          <span className="font-black text-2xl tracking-tight text-bone">SPYDE</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-bone hover:text-primary transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-canvas font-bold text-xs tracking-wide transition-all shadow-md"
          >
            Sign Up Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-12 text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-primary/15 border border-primary/30 text-primary text-xs font-mono font-bold">
          <Zap className="w-3.5 h-3.5" /> NEXT-GEN UPI FRAUD PREVENTION MIDDLEWARE
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-bone tracking-tight leading-tight sm:leading-none">
          Every Rupee Deserves a <span className="text-primary">Receiver Check</span>.
        </h1>

        <p className="text-bone-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Zero-trust UPI payments with real-time merchant geofencing, 3D face liveness escrow, and Ed25519 non-repudiation certificates.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-canvas font-extrabold text-sm tracking-wide transition-all shadow-xl flex items-center justify-center gap-2"
          >
            <span>Activate SPYDE Shield</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-canvas-card hover:bg-canvas-elevated border border-white/10 text-bone font-bold text-sm tracking-wide transition-colors"
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
                className="bg-canvas-card border border-white/10 rounded-2xl p-5 space-y-3 shadow-lg hover:border-primary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-canvas-elevated border border-white/5 flex items-center justify-center text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-bone">{feat.title}</h3>
                <p className="text-xs text-bone-muted leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-bone-muted">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-green" />
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