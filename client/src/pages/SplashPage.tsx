import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Only auto-navigate if the user is on the root '/' landing page!
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
    <div className="min-h-screen bg-canvas text-on-dark flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4 animate-pulse">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-black text-2xl shadow-2xl">
          S
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-wider text-on-dark font-sans">SPYDE</h1>
          <p className="text-xs font-mono text-muted">Zero-Trust Fraud Interception Engine</p>
        </div>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mt-4" />
      </div>
    </div>
  );
};