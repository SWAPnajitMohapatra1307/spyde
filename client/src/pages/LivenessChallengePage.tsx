import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  LivenessEngine,
  type LivenessState,
  type LivenessStep,
} from '../lib/livenessEngine';
import { usePaymentStore } from '../stores/paymentStore';

type UiPhase = 'ENGINE' | 'CONSENT' | 'UPLOADING' | 'COMPLETE' | 'FAIL';

const STEP_INSTRUCTIONS: Record<LivenessStep, string> = {
  LOADING_MODELS: 'Loading AI models…',
  DETECT_FACE: 'Position your face in the oval',
  BLINK_LEFT: 'Blink your LEFT eye 👁️',
  BLINK_RIGHT: 'Blink your RIGHT eye 👁️',
  TURN_HEAD: 'Slowly turn your head left or right',
  HOLD_STILL: 'Hold still… capturing',
  PROCESSING: 'Verifying liveness…',
  PASS: '✅ Liveness verified!',
  FAIL: '❌ Verification failed — try again',
};

const STEP_ORDER: LivenessStep[] = [
  'DETECT_FACE',
  'BLINK_LEFT',
  'BLINK_RIGHT',
  'TURN_HEAD',
  'HOLD_STILL',
];

export function LivenessChallengePage() {
  const { sessionId: sessionIdFromUrl } = useParams<{ sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code');

  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<LivenessEngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedBlobRef = useRef<string | null>(null);
  const capturedScoreRef = useRef<number>(0);
  const capturedMetricsRef = useRef<any>(null);

  const [state, setState] = useState<LivenessState>({
    step: 'LOADING_MODELS',
    faceDetected: false,
    earLeft: 1,
    earRight: 1,
    blinkCountLeft: 0,
    blinkCountRight: 0,
    headYaw: 0,
    headTurned: false,
    stabilityFrames: 0,
    livenessScore: 0,
    error: null,
  });

  const [uiPhase, setUiPhase] = useState<UiPhase>('ENGINE');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [consentChoice, setConsentChoice] = useState<'pending' | 'allow' | 'decline'>('pending');

  const storeSessionId = usePaymentStore((s) => s.challengeSessionId);
  const activeSessionId = sessionIdFromUrl || storeSessionId || 'demo-session';

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraReady(false);
    setUiPhase('ENGINE');
    setConsentChoice('pending');
    capturedBlobRef.current = null;
    setState((s) => ({
      ...s,
      error: null,
      step: 'LOADING_MODELS',
      faceDetected: false,
      blinkCountLeft: 0,
      blinkCountRight: 0,
      headYaw: 0,
      headTurned: false,
      stabilityFrames: 0,
      livenessScore: 0,
    }));

    if (!window.isSecureContext) {
      const msg =
        'Camera requires HTTPS or localhost. Open http://localhost:5173 (not a LAN IP).';
      setCameraError(msg);
      setUiPhase('FAIL');
      setState((s) => ({ ...s, error: msg, step: 'FAIL' }));
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = 'This browser does not support camera access.';
      setCameraError(msg);
      setUiPhase('FAIL');
      setState((s) => ({ ...s, error: msg, step: 'FAIL' }));
      return;
    }

    stopCamera();
    engineRef.current?.stop();
    engineRef.current = null;

    const attempts: MediaStreamConstraints[] = [
      {
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      },
      { video: { facingMode: 'user' }, audio: false },
      { video: true, audio: false },
    ];

    let lastErr: unknown = null;

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          await videoRef.current.play();
        }
        setCameraReady(true);
        setCameraError(null);
        setState((s) => ({ ...s, step: 'DETECT_FACE', error: null }));
        return;
      } catch (err) {
        lastErr = err;
      }
    }

    const e = lastErr as { name?: string; message?: string } | null;
    const name = e?.name || 'Error';
    let msg = 'Camera access denied or unavailable';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      msg = 'Camera permission denied. Click the lock icon → Allow Camera → Retry.';
    } else if (name === 'NotFoundError') {
      msg = 'No camera found on this device.';
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      msg = 'Camera is in use by another app/tab. Close it and Retry.';
    } else if (e?.message) {
      msg = `${name}: ${e.message}`;
    }

    setCameraError(msg);
    setUiPhase('FAIL');
    setState((s) => ({ ...s, error: msg, step: 'FAIL' }));
  };

  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
      engineRef.current?.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cameraReady || !videoRef.current || uiPhase !== 'ENGINE') return;

    const engine = new LivenessEngine(videoRef.current, setState);
    engineRef.current = engine;
    void engine.start();

    return () => {
      engine.stop();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [cameraReady, uiPhase]);

  useEffect(() => {
    if (uiPhase !== 'ENGINE') return;
    if (state.step !== 'PROCESSING') return;

    const engine = engineRef.current;
    if (!engine) return;

    const result = engine.getResult();
    engine.stop();
    engineRef.current = null;

    if (!result.passed || !result.faceBlob) {
      setUiPhase('FAIL');
      setState((s) => ({
        ...s,
        step: 'FAIL',
        error: 'Liveness score too low or face capture failed. Please retry.',
      }));
      stopCamera();
      return;
    }

    capturedBlobRef.current = result.faceBlob;
    capturedScoreRef.current = result.score;
    capturedMetricsRef.current = result.metrics;

    stopCamera();
    setState((s) => ({ ...s, step: 'PASS', livenessScore: result.score }));
    setUiPhase('CONSENT');
  }, [state.step, uiPhase]);

  const submitToServer = async (shareFace: boolean) => {
    setConsentChoice(shareFace ? 'allow' : 'decline');
    setUiPhase('UPLOADING');

    const challengeId = activeSessionId;
    const score = Math.max(
      0,
      Math.min(100, Math.round(Number(capturedScoreRef.current || state.livenessScore || 100)))
    );
    const metrics = capturedMetricsRef.current || {
      blinksDetected: 2,
      headTurnDegrees: 0,
      stabilityFrames: 0,
      onnxScore: null,
    };
    const faceBlob = capturedBlobRef.current;

    try {
      if (shareFace && faceBlob) {
        await fetch('/api/certificates/face-blob', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeSessionId: challengeId,
            faceBlob,
            livenessScore: score,
            metrics,
          }),
        });
      }

      const embeddingSource =
        (faceBlob || `${challengeId}:${score}:${metrics.blinksDetected}`).slice(0, 8000);

      let faceEmbeddingHash: string;
      try {
        const buf = new TextEncoder().encode(embeddingSource);
        const digest = await crypto.subtle.digest('SHA-256', buf);
        faceEmbeddingHash = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch {
        faceEmbeddingHash = 'ab'.repeat(32);
      }

      const store = usePaymentStore.getState();
      const codeCandidate =
        codeFromUrl ||
        store.challengeCode ||
        '';
      let challengeCode = String(codeCandidate).replace(/\D/g, '').slice(0, 4);
      if (!/^\d{4}$/.test(challengeCode)) {
        challengeCode = '0000';
      }

      const verifyBody = {
        challengeId: String(challengeId),
        challengeCode,
        clientScore: score,
        blinkCount: Math.max(0, Math.round(Number(metrics.blinksDetected ?? 2))),
        faceEmbeddingHash,
      };

      console.log('[Liveness] verify body', verifyBody);

      const verifyRes = await fetch('/api/liveness/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyBody),
      });

      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        console.warn('[Liveness] verify failed:', verifyRes.status, errText);
        setUiPhase('FAIL');
        setState((s) => ({
          ...s,
          step: 'FAIL',
          error: 'Could not notify sender. Check connection and retry.',
        }));
        return;
      }

      setUiPhase('COMPLETE');
    } catch (err) {
      console.warn('[Liveness] submit failed', err);
      setUiPhase('FAIL');
      setState((s) => ({
        ...s,
        step: 'FAIL',
        error: 'Network error while completing verification.',
      }));
    }
  };

  const currentStepIdx = STEP_ORDER.indexOf(state.step);
  const progress =
    uiPhase === 'CONSENT' || uiPhase === 'UPLOADING' || uiPhase === 'COMPLETE'
      ? 100
      : state.step === 'PROCESSING' || state.step === 'PASS'
        ? 100
        : Math.max(0, (currentStepIdx / STEP_ORDER.length) * 100);

  const showCamera = uiPhase === 'ENGINE' && !['PASS', 'FAIL', 'PROCESSING'].includes(state.step);

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mb-6 text-center">
        <h1 className="text-2xl font-bold text-on-dark mb-1">Liveness Verification</h1>
        <p className="text-sm text-on-dark/60">
          Receiver biometric check · unlocks sender PIN
        </p>
        <p className="text-[10px] font-mono text-on-dark/40 mt-1 truncate">
          session: {activeSessionId}
        </p>
      </div>

      <div className="w-full max-w-sm mb-4">
        <div className="h-2 bg-surface-card-dark rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: progress >= 100 ? '#10b981' : '#3b82f6',
            }}
          />
        </div>
      </div>

      {showCamera && (
        <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-white/20 mb-6 shadow-2xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <div className="absolute inset-0 rounded-full border-4 border-blue-400/40 pointer-events-none" />
          {state.faceDetected && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                Face Tracked
              </span>
            </div>
          )}
        </div>
      )}

      {uiPhase === 'ENGINE' && state.step === 'PROCESSING' && (
        <div className="w-72 h-72 rounded-full bg-surface-card-dark flex items-center justify-center mb-6 border-4 border-blue-500/50">
          <div className="text-center p-4">
            <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-on-dark text-sm">Analyzing liveness…</p>
          </div>
        </div>
      )}

      {uiPhase === 'CONSENT' && (
        <div className="w-full max-w-sm bg-surface-card-dark border border-hairline-dark rounded-2xl p-6 mb-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-lg font-bold text-on-dark">Liveness passed</h2>
            <p className="text-xs text-on-dark/60 mt-1">
              Score {capturedScoreRef.current || state.livenessScore}/100
            </p>
          </div>

          {capturedBlobRef.current && (
            <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-primary/50">
              <img
                src={capturedBlobRef.current}
                alt="Your capture"
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
          )}

          <div className="rounded-xl bg-canvas/50 border border-hairline-dark p-3 text-xs text-on-dark/70 leading-relaxed">
            <p className="font-semibold text-on-dark mb-1">Share this photo with the sender?</p>
            <p>
              If you allow, the sender can view your face once (view-once) as proof you completed
              verification. You can decline and still unlock the payment — only liveness is required.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void submitToServer(true)}
            className="w-full py-3 rounded-xl bg-primary text-canvas text-sm font-bold"
          >
            Allow — share photo with sender
          </button>
          <button
            type="button"
            onClick={() => void submitToServer(false)}
            className="w-full py-3 rounded-xl bg-surface-elevated-dark border border-hairline-dark text-on-dark text-sm font-semibold"
          >
            Decline — verify without sharing photo
          </button>
        </div>
      )}

      {uiPhase === 'UPLOADING' && (
        <div className="w-full max-w-sm text-center mb-6 space-y-3">
          <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-on-dark text-sm font-medium">
            {consentChoice === 'allow'
              ? 'Sharing securely & notifying sender…'
              : 'Notifying sender — verification complete…'}
          </p>
        </div>
      )}

      {uiPhase === 'COMPLETE' && (
        <div className="w-full max-w-sm bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-6 mb-6 text-center space-y-3">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-emerald-400">Verification complete</h2>
          <p className="text-sm text-on-dark/70">
            {consentChoice === 'allow'
              ? 'You shared a view-once photo. The sender can now enter their UPI PIN.'
              : 'Liveness verified without sharing a photo. The sender can now enter their UPI PIN.'}
          </p>
          <p className="text-[11px] font-mono text-on-dark/40">
            You can close this page. Sender device will unlock automatically.
          </p>
        </div>
      )}

      {uiPhase === 'FAIL' && (
        <div className="w-72 rounded-2xl bg-red-950/40 border border-red-500 p-6 mb-6 text-center">
          <div className="text-5xl mb-2">❌</div>
          <p className="text-red-400 font-bold mb-3">Verification failed</p>
          <button
            type="button"
            onClick={() => void startCamera()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold uppercase"
          >
            Retry
          </button>
        </div>
      )}

      {uiPhase === 'ENGINE' && (
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold text-on-dark mb-2">
            {STEP_INSTRUCTIONS[state.step]}
          </p>
          {state.faceDetected &&
            state.step !== 'PROCESSING' &&
            state.step !== 'PASS' &&
            state.step !== 'FAIL' && (
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs bg-surface-card-dark/80 p-2.5 rounded-xl border border-white/5">
                <div>
                  <div className="text-on-dark font-mono">{state.earLeft.toFixed(2)}</div>
                  <div className="text-on-dark/40 text-[10px]">Left EAR</div>
                </div>
                <div>
                  <div className="text-on-dark font-mono">{state.earRight.toFixed(2)}</div>
                  <div className="text-on-dark/40 text-[10px]">Right EAR</div>
                </div>
                <div>
                  <div className="text-on-dark font-mono">{Math.abs(state.headYaw).toFixed(0)}°</div>
                  <div className="text-on-dark/40 text-[10px]">Yaw</div>
                </div>
              </div>
            )}
        </div>
      )}

      {(cameraError || state.error) && uiPhase === 'FAIL' && (
        <p className="mt-2 text-red-400 text-xs max-w-sm text-center">{cameraError || state.error}</p>
      )}
    </div>
  );
}