// client/src/pages/cv/CVResultPage.tsx

import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Brain,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { useCVResult } from '@/hooks/useCV';
import { AntiSpoofBadge } from '@/components/cv/AntiSpoofBadge';
import { EmbeddingVisualizer } from '@/components/cv/EmbeddingVisualizer';

export const CVResultPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: result, isLoading, error } = useCVResult(sessionId ?? null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-bone-muted text-sm">Loading result...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 px-4">
        <XCircle className="w-12 h-12 text-accent-red" />
        <p className="text-bone text-lg font-medium">Result Not Found</p>
        <p className="text-bone-muted text-sm text-center">
          The verification session could not be loaded.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 rounded-xl bg-white/10 text-bone text-sm hover:bg-white/15 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const passed = result.status === 'passed';
  const passedChallenges = result.challengeResults.filter((c) => c.passed).length;
  const totalChallenges = result.challengeResults.length;

  return (
    <div className="min-h-screen bg-canvas pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-bone-muted hover:text-bone text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Hero result */}
      <div
        className={`mx-4 p-6 rounded-2xl border text-center ${
          passed
            ? 'bg-accent-green/5 border-accent-green/20'
            : result.status === 'expired'
              ? 'bg-accent-yellow/5 border-accent-yellow/20'
              : 'bg-accent-red/5 border-accent-red/20'
        }`}
      >
        {passed ? (
          <CheckCircle2 className="w-16 h-16 text-accent-green mx-auto" />
        ) : result.status === 'expired' ? (
          <Clock className="w-16 h-16 text-accent-yellow mx-auto" />
        ) : (
          <XCircle className="w-16 h-16 text-accent-red mx-auto" />
        )}
        <h1
          className={`text-2xl font-bold mt-3 ${
            passed
              ? 'text-accent-green'
              : result.status === 'expired'
                ? 'text-accent-yellow'
                : 'text-accent-red'
          }`}
        >
          {passed
            ? 'Verified'
            : result.status === 'expired'
              ? 'Session Expired'
              : 'Not Verified'}
        </h1>
        <p className="text-bone-muted text-sm mt-1">
          Session: <span className="font-mono">{result.sessionId.slice(0, 12)}...</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        <div className="bg-canvas-card rounded-xl p-3 text-center border border-white/5">
          <p className="text-2xl font-bold tabular-nums text-bone">
            {(result.overallConfidence * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-bone-muted mt-1">Confidence</p>
        </div>
        <div className="bg-canvas-card rounded-xl p-3 text-center border border-white/5">
          <p className="text-2xl font-bold tabular-nums text-bone">
            {passedChallenges}/{totalChallenges}
          </p>
          <p className="text-[10px] text-bone-muted mt-1">Challenges</p>
        </div>
        <div className="bg-canvas-card rounded-xl p-3 text-center border border-white/5">
          <p className="text-2xl font-bold tabular-nums text-bone font-mono">
            {result.processingTimeMs}
          </p>
          <p className="text-[10px] text-bone-muted mt-1">ms</p>
        </div>
      </div>

      {/* Challenge breakdown */}
      <div className="mx-4 mt-4">
        <h2 className="text-bone text-sm font-medium mb-2 flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Challenge Results
        </h2>
        <div className="space-y-2">
          {result.challengeResults.map((cr, idx) => (
            <div
              key={cr.challengeId}
              className="flex items-center justify-between bg-canvas-card rounded-xl px-4 py-3 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-bone-muted w-5">
                  {idx + 1}.
                </span>
                <div>
                  <p className="text-bone text-sm capitalize">
                    {cr.type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-bone-muted text-[10px] font-mono tabular-nums">
                    {(cr.duration / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-bone-muted">
                  {(cr.confidence * 100).toFixed(0)}%
                </span>
                {cr.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-accent-green" />
                ) : (
                  <XCircle className="w-4 h-4 text-accent-red" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anti-spoof */}
      {result.antiSpoofResult && (
        <div className="mx-4 mt-4">
          <h2 className="text-bone text-sm font-medium mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Anti-Spoof Analysis
          </h2>
          <div className="bg-canvas-card rounded-xl p-4 border border-white/5">
            <AntiSpoofBadge result={result.antiSpoofResult} />
          </div>
        </div>
      )}

      {/* Embedding visualization */}
      {result.embedding && (
        <div className="mx-4 mt-4">
          <h2 className="text-bone text-sm font-medium mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Face Embedding ({result.embedding.dimensions}D)
          </h2>
          <div className="bg-canvas-card rounded-xl p-4 border border-white/5">
            <EmbeddingVisualizer embedding={result.embedding} width={320} height={80} />
          </div>
        </div>
      )}

      {/* Export button */}
      <div className="mx-4 mt-6">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(result, null, 2)], {
              type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cv-result-${result.sessionId.slice(0, 8)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-bone text-sm hover:bg-white/10 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Result JSON
        </button>
      </div>
    </div>
  );
};