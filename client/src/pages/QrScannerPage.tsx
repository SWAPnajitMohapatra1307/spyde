// client/src/pages/qr/QrScannerPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { 
  Camera, 
  MapPin, 
  Flashlight, 
  ArrowLeft, 
  AlertCircle, 
  Sparkles,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface GeoLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: 'PENDING' | 'ACQUIRED' | 'DENIED';
}

export interface ParsedUpiData {
  vpa: string;
  name?: string;
  amount?: number;
  merchantCode?: string;
  transactionRef?: string;
  rawUri: string;
  isSimulatedTamper?: boolean;
  isSignedSpydeQr?: boolean;
  signature?: string;
}

export const parseUpiUri = (rawUri: string): ParsedUpiData | null => {
  try {
    const cleanUri = rawUri.trim();

    // 1. Check for SPYDE Tamper-Proof Cryptographic QR format (base64::hmacSignature)
    if (cleanUri.includes('::')) {
      const [encodedPayload, signature] = cleanUri.split('::');
      try {
        const decoded = JSON.parse(atob(encodedPayload));
        return {
          vpa: (decoded.vpa || '').toLowerCase(),
          name: decoded.payeeName || decoded.name || 'SPYDE Verified Merchant',
          amount: typeof decoded.amount === 'number' ? decoded.amount : parseFloat(decoded.amount) || undefined,
          merchantCode: decoded.merchantId || decoded.mc || 'SPYDE_SECURE',
          transactionRef: decoded.txnId || decoded.tr,
          rawUri: cleanUri,
          isSignedSpydeQr: true,
          signature: signature,
        };
      } catch {
        // Fall through to standard parsing if JSON decode fails
      }
    }

    // 2. Check for Standard UPI URI: upi://pay?pa=...
    if (cleanUri.startsWith('upi://pay')) {
      const url = new URL(cleanUri);
      const params = url.searchParams;
      const vpa = params.get('pa');

      if (!vpa) return null;

      const amountStr = params.get('am');
      const parsedAmount = amountStr ? parseFloat(amountStr) : undefined;

      return {
        vpa: vpa.toLowerCase(),
        name: params.get('pn') || undefined,
        amount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount : undefined,
        merchantCode: params.get('mc') || undefined,
        transactionRef: params.get('tr') || undefined,
        rawUri: cleanUri,
      };
    }

    // 3. Raw VPA String (e.g., store@okaxis)
    if (cleanUri.includes('@') && !cleanUri.includes(' ')) {
      return {
        vpa: cleanUri.toLowerCase(),
        rawUri: cleanUri,
      };
    }

    return null;
  } catch {
    return null;
  }
};

export const QrScannerPage: React.FC = () => {
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(true);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);

  const [coords, setCoords] = useState<GeoLocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    status: 'PENDING',
  });

  // 1. Acquire GPS telemetry
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            status: 'ACQUIRED',
          });
        },
        () => {
          setCoords((prev) => ({ ...prev, status: 'DENIED' }));
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setCoords((prev) => ({ ...prev, status: 'DENIED' }));
    }
  }, []);

  const handleProcessScan = useCallback((payload: ParsedUpiData, tamperSimulation = false) => {
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 60, 40]);
    }

    const queryParams = new URLSearchParams({
      vpa: payload.vpa,
      name: payload.name || '',
      amount: payload.amount ? payload.amount.toString() : '',
      mc: payload.merchantCode || '',
      tamper: tamperSimulation ? 'true' : 'false',
      signed: payload.isSignedSpydeQr ? 'true' : 'false',
      sig: payload.signature || '',
      lat: coords.latitude ? coords.latitude.toString() : '12.9716',
      lng: coords.longitude ? coords.longitude.toString() : '77.5946',
    });

    navigate(`/qr/result?${queryParams.toString()}`);
  }, [coords, navigate]);

  // 2. Real-Time Camera & QR Decoding Loop
  useEffect(() => {
    let isCancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasCameraPermission(true);

        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        if (capabilities.torch) {
          setTorchSupported(true);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }

        // Initialize frame decoding loop
        runDecodeLoop();
      } catch (err) {
        if (!isCancelled) {
          console.error('Camera access failed:', err);
          setHasCameraPermission(false);
        }
      }
    }

    // ─── Continuous Frame Reader ──────────────────────────────
    function runDecodeLoop() {
      if (!isScanningActive || isCancelled) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data && code.data.trim().length > 0) {
            const raw = code.data.trim();
            if (raw !== lastScannedText) {
              const parsed = parseUpiUri(raw);
              if (parsed) {
                setIsScanningActive(false);
                setLastScannedText(raw);
                handleProcessScan(parsed, false);
                return;
              }
            }
          }
        }
      }

      // Schedule next frame scan (~20 FPS)
      scanLoopRef.current = window.setTimeout(runDecodeLoop, 50);
    }

    void startCamera();

    return () => {
      isCancelled = true;
      if (scanLoopRef.current) clearTimeout(scanLoopRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isScanningActive, lastScannedText, handleProcessScan]);

  // Torch Toggle Handler
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchActive;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchActive(nextState);
    } catch (e) {
      console.warn('Torch not supported or failed to toggle', e);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);

    const parsed = parseUpiUri(manualInput);
    if (!parsed) {
      setParseError('Invalid UPI QR link or VPA format. Format: upi://pay?pa=name@bank or raw VPA');
      return;
    }

    handleProcessScan(parsed, false);
  };

  // Preset Demonstrations for Instant Testing
  const handlePresetScan = (type: 'LEGIT_MERCHANT' | 'TAMPERED_STICKER') => {
    if (type === 'LEGIT_MERCHANT') {
      const parsed: ParsedUpiData = {
        vpa: 'bluecraft.coffee@okhdfcbank',
        name: 'Blue Craft Artisan Cafe',
        amount: 280,
        merchantCode: '5812',
        rawUri: 'upi://pay?pa=bluecraft.coffee@okhdfcbank&pn=Blue%20Craft%20Artisan%20Cafe&am=280&mc=5812',
        isSignedSpydeQr: true,
      };
      handleProcessScan(parsed, false);
    } else {
      const parsed: ParsedUpiData = {
        vpa: 'quickcash.bot89@paytm',
        name: 'Blue Craft Quick Pay (Fake Overlay)',
        amount: 500,
        merchantCode: '0000',
        rawUri: 'upi://pay?pa=quickcash.bot89@paytm&pn=Blue%20Craft%20Quick%20Pay&am=500',
        isSimulatedTamper: true,
      };
      handleProcessScan(parsed, true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas py-4 px-4 max-w-lg mx-auto flex flex-col justify-between space-y-4">
      {/* Hidden Offscreen Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
        <div className="flex items-center gap-1.5 text-[11px] font-mono bg-surface-card-dark px-2.5 py-1 rounded-pill border border-hairline-dark text-muted">
          <MapPin className={`w-3 h-3 ${coords.status === 'ACQUIRED' ? 'text-trading-up' : 'text-primary'}`} />
          {coords.status === 'ACQUIRED' ? 'GPS Locked' : 'Locating...'}
        </div>
      </div>

      {/* Main Viewfinder Box */}
      <div className="relative w-full aspect-[4/5] max-h-[400px] rounded-xl bg-surface-card-dark border border-hairline-dark overflow-hidden shadow-2xl flex items-center justify-center">
        {hasCameraPermission === false ? (
          <div className="w-full h-full bg-surface-card-dark flex flex-col items-center justify-center p-6 text-center">
            <Camera className="w-12 h-12 text-muted/40 mb-2" />
            <span className="text-xs text-muted font-mono max-w-[220px]">
              Camera access blocked. Please allow permissions in browser settings or use manual entry below.
            </span>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Reticle Scanner Overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
          <div className="relative w-56 h-56 border-2 border-primary/50 rounded-2xl transition-all">
            {/* 4 Corner Markers */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-md" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-md" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-md" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-md" />

            {/* Laser Scanning Animation */}
            {isScanningActive && (
              <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_8px_#3b82f6]" />
            )}
          </div>
        </div>

        {/* Status Indicator Pill */}
        <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
          <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white/90 flex items-center gap-1.5 shadow-lg">
            {isScanningActive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live QR Detection Active
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                QR Code Captured!
              </>
            )}
          </div>
        </div>

        {/* Floating Scanner Controls */}
        <div className="absolute bottom-4 inset-x-4 flex items-center justify-center gap-3">
          {torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-3 rounded-pill backdrop-blur-md border transition-all ${
                torchActive
                  ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/30'
                  : 'bg-surface-card-dark/90 text-on-dark border-hairline-dark hover:bg-surface-elevated-dark'
              }`}
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          {!isScanningActive && (
            <button
              type="button"
              onClick={() => {
                setLastScannedText(null);
                setIsScanningActive(true);
              }}
              className="px-3 py-2 rounded-pill backdrop-blur-md bg-surface-card-dark/90 text-on-dark border border-hairline-dark hover:bg-surface-elevated-dark text-xs font-mono flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Rescan
            </button>
          )}
        </div>
      </div>

      {/* Manual Input or UPI URL Form */}
      <div className="bg-surface-card-dark border border-hairline-dark rounded-xl p-4 space-y-3 shadow-sm">
        <div className="text-[11px] font-mono uppercase font-semibold text-muted tracking-wider flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-primary" /> Paste Raw UPI QR Link / VPA
        </div>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => {
              setManualInput(e.target.value);
              setParseError(null);
            }}
            placeholder="upi://pay?pa=merchant@upi&pn=Store..."
            className="flex-1 bg-canvas border border-hairline-dark rounded-lg px-3 py-2 text-xs font-mono text-on-dark placeholder:text-muted focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40 text-on-primary font-semibold text-xs rounded-md transition-colors flex-shrink-0"
          >
            Inspect
          </button>
        </form>

        {parseError && (
          <div className="p-2 rounded-lg bg-trading-down/10 border border-trading-down/30 text-trading-down text-xs flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {/* Demo Simulation Presets */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono uppercase text-muted tracking-wider flex items-center gap-1 font-semibold">
          <Sparkles className="w-3 h-3 text-primary" /> Instant Simulation Presets
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handlePresetScan('LEGIT_MERCHANT')}
            className="p-3 rounded-xl bg-surface-card-dark hover:bg-surface-elevated-dark border border-trading-up/30 text-left transition-colors group shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-trading-up font-sans">
              <ShieldCheck className="w-3.5 h-3.5" /> Legitimate Merchant
            </div>
            <div className="text-[11px] text-muted truncate mt-0.5 font-mono">
              Signed Verified Merchant
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePresetScan('TAMPERED_STICKER')}
            className="p-3 rounded-xl bg-surface-card-dark hover:bg-surface-elevated-dark border border-trading-down/30 text-left transition-colors group shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-trading-down font-sans">
              <ShieldAlert className="w-3.5 h-3.5" /> Sticker Tamper
            </div>
            <div className="text-[11px] text-muted truncate mt-0.5 font-mono">
              Overlay Fraud Mismatch
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};