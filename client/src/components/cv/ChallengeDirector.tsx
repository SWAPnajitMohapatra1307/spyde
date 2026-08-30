// client/src/components/cv/ChallengeDirector.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Eye,
  Smile,
  CircleDot,
} from 'lucide-react';
import { useCVStore } from '@/stores/cvStore';
import type { LivenessChallenge, LivenessChallengeType } from '@/types/cv';

interface ChallengeDirectorProps {
  onAllComplete: () => void;
}

const challengeIcons: Record<LivenessChallengeType, React.ReactNode> = {
  turn_left: <ArrowLeft className="w-10 h-10" />,
  turn_right: <ArrowRight className="w-10 h-10" />,
  blink: <Eye className="w-10 h-10" />,
  smile: <Smile className="w-10 h-10" />,
  nod_up: <ArrowUp className="w-10 h-10" />,
  nod_down: <ArrowDown className="w-10 h-10" />,
  open_mouth: <CircleDot className="w-10 h-10" />,
};

const challengeAnimations: Record<LivenessChallengeType, string> = {
  turn_left: 'animate-pulse-left',
  turn_right: 'animate-pulse-right',
  blink: 'animate-blink',
  smile: 'animate-bounce',
  nod_up: 'animate-pulse-up',
  nod_down: 'animate-pulse-down',
  open_mouth: 'animate-ping-slow',
};

export const ChallengeDirector: React.FC<ChallengeDirectorProps> = ({
  onAllComplete,
}) => {
  const {
    sessionConfig,
    currentChallengeIndex,
    challengeStartTime,
    startChallenge,
    advanceChallenge,
    faceDetected,
  } = useCVStore();

  const [elapsed, setElapsed] = useState(0);
  const [simulatedConfidence, setSimulatedConfidence] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confidenceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const challenges = sessionConfig?.challenges ?? [];
  const currentChallenge: LivenessChallenge | undefined =
    challenges[currentChallengeIndex];
  const isLastChallenge = currentChallengeIndex >= challenges.length - 1;

  const handleChallengeComplete = useCallback(
    (passed: boolean) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (confidenceRef.current) clearInterval(confidenceRef.current);

      if (!currentChallenge) return;

      advanceChallenge({
        challengeId: currentChallenge.id,
        type: currentChallenge.type,
        passed,
        confidence: passed ? simulatedConfidence : 0,
        frames: [],
        duration: elapsed,
      });

      setElapsed(0);
      setSimulatedConfidence(0);

      if (isLastChallenge) {
        onAllComplete();
      }
    },
    [
      currentChallenge,
      advanceChallenge,
      simulatedConfidence,
      elapsed,
      isLastChallenge,
      onAllComplete,
    ]
  );

  // Timer for current challenge
  useEffect(() => {
    if (!challengeStartTime || !currentChallenge) {
      return undefined;
    }

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - challengeStartTime;
      setElapsed(elapsedMs);

      if (elapsedMs >= currentChallenge.duration * 1000) {
        handleChallengeComplete(false);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [challengeStartTime, currentChallenge, handleChallengeComplete]);

  // Simulate confidence building when face is detected
  useEffect(() => {
    if (!challengeStartTime || !faceDetected) {
      setSimulatedConfidence(0);
      return undefined;
    }

    confidenceRef.current = setInterval(() => {
      setSimulatedConfidence((prev) => {
        const next = prev + 0.03 + Math.random() * 0.04;
        if (next >= (currentChallenge?.requiredConfidence ?? 0.85)) {
          handleChallengeComplete(true);
          return 1;
        }
        return Math.min(next, 1);
      });
    }, 150);

    return () => {
      if (confidenceRef.current) clearInterval(confidenceRef.current);
    };
  }, [challengeStartTime, faceDetected, currentChallenge, handleChallengeComplete]);

  // Auto-start first challenge
  useEffect(() => {
    if (currentChallenge && !challengeStartTime && faceDetected) {
      const delay = setTimeout(() => {
        startChallenge();
      }, 1500);
      return () => {
        clearTimeout(delay);
      };
    }
    return undefined;
  }, [currentChallengeIndex, faceDetected, currentChallenge, challengeStartTime, startChallenge]);

  if (!currentChallenge) {
    return (
      <div className="text-center p-6">
        <p className="text-bone-muted text-sm">No challenges configured</p>
      </div>
    );
  }

  const timeRemaining = Math.max(
    0,
    currentChallenge.duration - elapsed / 1000
  );
  const progressPercent = challengeStartTime
    ? (elapsed / (currentChallenge.duration * 1000)) * 100
    : 0;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Progress dots */}
      <div className="flex gap-2">
        {challenges.map((_, idx) => (
          <div
            key={idx}
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              idx < currentChallengeIndex
                ? 'bg-accent-green'
                : idx === currentChallengeIndex
                  ? 'bg-primary'
                  : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Challenge step label */}
      <p className="text-bone-muted text-xs font-mono">
        Step {currentChallengeIndex + 1} of {challenges.length}
      </p>

      {/* Animated icon */}
      <div
        className={`text-primary ${challengeAnimations[currentChallenge.type] ?? ''}`}
      >
        {challengeIcons[currentChallenge.type]}
      </div>

      {/* Instruction */}
      <p className="text-bone text-lg font-medium text-center">
        {currentChallenge.instruction}
      </p>

      {/* Timer bar */}
      {challengeStartTime && (
        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <p className="text-bone-muted text-xs text-center mt-1 font-mono tabular-nums">
            {timeRemaining.toFixed(1)}s remaining
          </p>
        </div>
      )}

      {/* Confidence ring */}
      {challengeStartTime && faceDetected && (
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#FF6600"
              strokeWidth="3"
              strokeDasharray={`${simulatedConfidence * 175.93} 175.93`}
              strokeLinecap="round"
              className="transition-all duration-150"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-bone tabular-nums">
            {(simulatedConfidence * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Waiting for face */}
      {!faceDetected && challengeStartTime && (
        <p className="text-accent-yellow text-sm animate-pulse">
          Face not detected — look at the camera
        </p>
      )}

      {!challengeStartTime && !faceDetected && (
        <p className="text-bone-muted text-sm">
          Position your face to begin
        </p>
      )}

      {!challengeStartTime && faceDetected && (
        <p className="text-accent-green text-sm animate-pulse">
          Starting in a moment...
        </p>
      )}
    </div>
  );
};