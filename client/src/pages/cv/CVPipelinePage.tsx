// client/src/pages/cv/CVPipelinePage.tsx

import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Camera,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useCVStore } from '@/stores/cvStore';
import { useCreateCVSession, useSubmitCVResult } from '@/hooks/useCV';
import { FaceDetectionOverlay } from '@/components/cv/FaceDetectionOverlay';
import { ChallengeDirector } from '@/components/cv/ChallengeDirector';
import { AntiSpoofBadge } from '@/components/cv/AntiSpoofBadge';
import type { CVPipelineStatus, FaceDetectionBox, FaceQualityMetrics } from '@/types/cv';

const VIDEO_WIDTH = 360;
const VIDEO_HEIGHT = 480;

export const CVPipelinePage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();

  const {
    status,
    error,
    sessionConfig,
    sessionResult,
    challengeResults,
    setStatus,
    setFaceDetection,
    setError,
    reset,
  } = useCVStore();

  const { videoRef, canvasRef, start, stop, isActive } = useCamera({
    facingMode: 'user',
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
  });

  const createSession = useCreateCVSession();
  const submitResult = useSubmitCVResult();

  const [antiSpoofResult, setAntiSpoofResult] = useState<{
    isReal: boolean;
    score: number;
    method: 'texture' | 'depth' | 'motion' | 'infrared';
    details: string;
  } | null>(null);

  // Initialize session
  useEffect(() => {
    if (!transactionId) return;

    reset();
    createSession.mutate(
      {
        transactionId,
        challengeCount: 3,
        antiSpoof: true,
      },
      {
        onError: () => {
          setError({
            code: 'NETWORK_ERROR',
            message: 'Failed to create verification session',
            recoverable: true,
          });
        },
      }
    );

    return () => {
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  // Start camera once session is configured
  useEffect(() => {
    if (sessionConfig && status === 'initializing') {
      start().then(() => {
        setStatus('detecting_face');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionConfig]);

  // Simulate face detection
  useEffect(() => {
    if (status !== 'detecting_face' && status !== 'face_aligned' && status !== 'challenge_active') {
      return undefined;
    }

    const interval = setInterval(() => {
      const detected = Math.random() > 0.15;
      const box: FaceDetectionBox | null = detected
        ? {
            x: VIDEO_WIDTH * 0.25 + (Math.random() - 0.5) * 10,
            y: VIDEO_HEIGHT * 0.15 + (Math.random() - 0.5) * 10,
            width: VIDEO_WIDTH * 0.5,
            height: VIDEO_HEIGHT * 0.55,
            confidence: 0.85 + Math.random() * 0.14,
          }
        : null;

      const quality: FaceQualityMetrics | null = detected
        ? {
            brightness: 0.6 + Math.random() * 0.3,
            sharpness: 0.7 + Math.random() * 0.25,
            faceSize: 0.45 + Math.random() * 0.1,
            faceAngle: {
              yaw: (Math.random() - 0.5) * 20,
              pitch: (Math.random() - 0.5) * 15,
              roll: (Math.random() - 0.5) * 10,
            },
            occluded: false,
            quality: Math.random() > 0.2 ? 'good' : 'fair',
          }
        : null;

      setFaceDetection(detected, box, quality);
    }, 200);

    return () => {
      clearInterval(interval);
    };
  }, [status, setFaceDetection]);

  // Handle all challenges complete
  const handleAllChallengesComplete = useCallback(() => {
    const spoofResult = {
      isReal: Math.random() > 0.1,
      score: 0.85 + Math.random() * 0.14,
      method: 'texture' as const,
      details: 'Live face texture patterns confirmed',
    };
    setAntiSpoofResult(spoofResult);

    if (!sessionConfig) return;

    submitResult.mutate(
      {
        sessionId: sessionConfig.sessionId,
        challengeResults,
        antiSpoofResult: spoofResult,
        frames: [],
        embedding: Array.from({ length: 512 }, () => (Math.random() - 0.5) * 2),
      },
      {
        onSuccess: (result) => {
          stop();
          if (result.status === 'passed') {
            setTimeout(() => {
              navigate('/payment/pin', { replace: true });
            }, 2000);
          }
        },
        onError: () => {
          setError({
            code: 'PROCESSING_ERROR',
            message: 'Verification submission failed',
            recoverable: true,
          });
        },
      }
    );
  }, [
    sessionConfig,
    challengeResults,
    submitResult,
    stop,
    navigate,
    setError,
  ]);

  // Retry handler
  const handleRetry = useCallback(() => {
    reset();
    if (transactionId) {
      createSession.mutate({
        transactionId,
        challengeCount: 3,
        antiSpoof: true,
      });
    }
  }, [reset, transactionId, createSession]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md px-4 pt-6 pb-3">
        <h1 className="text-bone text-lg font-semibold text-center">
          Face Verification
        </h1>
        <p className="text-bone-muted text-xs text-center mt-1 font-mono">
          {sessionConfig?.sessionId
            ? `Session: ${sessionConfig.sessionId.slice(0, 8)}...`
            : 'Initializing...'}
        </p>
      </div>

      {/* Camera viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
        <video
          ref={videoRef}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          className="block"
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            transform: 'scaleX(-1)',
          }}
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        <FaceDetectionOverlay
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          mirrored
        />

        {/* Status chip */}
        <div className="absolute top-3 left-3">
          <StatusChip status={status} isActive={isActive} />
        </div>

        {/* Anti-spoof badge */}
        <div className="absolute top-3 right-3">
          <AntiSpoofBadge result={antiSpoofResult} compact />
        </div>
      </div>

      {/* Challenge area */}
      <div className="w-full max-w-md mt-4">
        {(status === 'face_aligned' ||
          status === 'challenge_active' ||
          status === 'detecting_face') &&
          sessionConfig && (
            <ChallengeDirector onAllComplete={handleAllChallengesComplete} />
          )}

        {status === 'processing' && (
          <div className="flex flex-col items-center gap-3 p-6">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-bone text-sm">Processing verification...</p>
          </div>
        )}

        {status === 'complete' && sessionResult && (
          <ResultCard result={sessionResult} />
        )}

        {status === 'error' && error && (
          <ErrorCard error={error} onRetry={handleRetry} />
        )}

        {status === 'idle' && !error && (
          <div className="flex flex-col items-center gap-3 p-6">
            <Camera className="w-8 h-8 text-bone-muted" />
            <p className="text-bone-muted text-sm">Preparing camera...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-components ---

const StatusChip: React.FC<{
  status: CVPipelineStatus;
  isActive: boolean;
}> = ({ status, isActive }) => {
  const statusConfig: Record<
    CVPipelineStatus,
    { label: string; color: string }
  > = {
    idle: { label: 'Idle', color: 'bg-white/10 text-bone-muted' },
    initializing: { label: 'Init', color: 'bg-white/10 text-bone-muted' },
    camera_ready: { label: 'Camera OK', color: 'bg-accent-green/20 text-accent-green' },
    detecting_face: { label: 'Detecting', color: 'bg-accent-yellow/20 text-accent-yellow' },
    face_aligned: { label: 'Aligned', color: 'bg-accent-green/20 text-accent-green' },
    challenge_active: { label: 'Challenge', color: 'bg-primary/20 text-primary' },
    processing: { label: 'Processing', color: 'bg-primary/20 text-primary' },
    complete: { label: 'Done', color: 'bg-accent-green/20 text-accent-green' },
    error: { label: 'Error', color: 'bg-accent-red/20 text-accent-red' },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-pill text-[10px] font-medium ${config.color}`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? 'bg-accent-green animate-pulse' : 'bg-bone-muted'
        }`}
      />
      {config.label}
    </div>
  );
};

const ResultCard: React.FC<{
  result: {
    status: string;
    overallConfidence: number;
    processingTimeMs: number;
    challengeResults: Array<{ passed: boolean; type: string }>;
  };
}> = ({ result }) => {
  const passed = result.status === 'passed';

  return (
    <div
      className={`mx-4 p-5 rounded-2xl border ${
        passed
          ? 'bg-accent-green/5 border-accent-green/20'
          : 'bg-accent-red/5 border-accent-red/20'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {passed ? (
          <CheckCircle2 className="w-8 h-8 text-accent-green" />
        ) : (
          <XCircle className="w-8 h-8 text-accent-red" />
        )}
        <div>
          <p
            className={`text-lg font-semibold ${
              passed ? 'text-accent-green' : 'text-accent-red'
            }`}
          >
            {passed ? 'Verification Passed' : 'Verification Failed'}
          </p>
          <p className="text-xs text-bone-muted">
            Confidence: {(result.overallConfidence * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <p className="text-bone-muted">Challenges</p>
          <p className="text-bone font-mono tabular-nums">
            {result.challengeResults.filter((c) => c.passed).length}/
            {result.challengeResults.length} passed
          </p>
        </div>
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <p className="text-bone-muted">Processing</p>
          <p className="text-bone font-mono tabular-nums">
            {result.processingTimeMs}ms
          </p>
        </div>
      </div>
    </div>
  );
};

const ErrorCard: React.FC<{
  error: { code: string; message: string; recoverable: boolean };
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <div className="mx-4 p-5 rounded-2xl bg-accent-red/5 border border-accent-red/20">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-6 h-6 text-accent-red flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-accent-red font-medium text-sm">{error.message}</p>
        <p className="text-bone-muted text-xs mt-1 font-mono">{error.code}</p>
      </div>
    </div>

    {error.recoverable && (
      <button
        onClick={onRetry}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-bone text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    )}
  </div>
);