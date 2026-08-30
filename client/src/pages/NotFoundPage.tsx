import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6 bg-canvas-card border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-canvas-elevated border border-white/10 flex items-center justify-center text-accent-yellow">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono uppercase text-accent-yellow font-bold tracking-wider">
            HTTP 404 / Route Not Found
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-bone tracking-tight">
            Off the Security Grid
          </h1>
          <p className="text-xs text-bone-muted leading-relaxed">
            The telemetry endpoint or screen you requested does not exist on this SPYDE node.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 rounded-xl bg-canvas-elevated hover:bg-white/10 border border-white/10 text-bone text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-canvas text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <Home className="w-3.5 h-3.5" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};