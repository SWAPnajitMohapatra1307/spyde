import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // CRITICAL FIX: Only auto-navigate if the user is on the root '/' landing page!
    if (location.pathname !== '/') {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate('/home', { replace: true });
      } else {
        navigate('/welcome', { replace: true });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [location.pathname, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4 animate-pulse">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-2xl">
          <Shield className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-wider text-white">SPYDE</h1>
          <p className="text-xs font-mono text-slate-400">Zero-Trust Fraud Interception Engine</p>
        </div>
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mt-4" />
      </div>
    </div>
  );
};