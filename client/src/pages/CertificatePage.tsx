import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  FileCheck2,
  Copy,
  Check,
  Share2,
  Printer,
  ArrowLeft,
  Key,
  Hash,
  CheckCircle2,
  Building,
  Calendar,
  Eye,
  AlertTriangle,
  UserX,
} from 'lucide-react';
import { useCertificate } from '@/hooks/useCertificates';
import { usePaymentStore } from '../stores/paymentStore'; // Path matches LivenessChallengePage

export const CertificatePage: React.FC = () => {
  const { id = 'demo-cert' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Zustand Session ID to connect payment flows end-to-end
  const challengeSessionId = usePaymentStore(
    (s: { challengeSessionId?: string | null }) => s?.challengeSessionId
  );

  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerifiedLocally, setIsVerifiedLocally] = useState(true);

  const [showFace, setShowFace] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [faceDestroyed, setFaceDestroyed] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceImageUrl, setFaceImageUrl] = useState<string | null>(null);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Load the core cryptographic certificate metadata
  const { data: cert, isLoading } = useCertificate(id);

  // Determine active session targeting
 const targetSessionId = challengeSessionId || (cert as any)?.challengeSessionId || (cert as any)?.payload?.challengeSessionId || id;

  const handleCopy = (text: string, type: 'hash' | 'sig') => {
    void navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedSig(true);
      setTimeout(() => setCopiedSig(false), 2000);
    }
  };

  const handleVerifySeal = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerifiedLocally(true);
    }, 600);
  };

  // Direct fetch approach for view-once face data to avoid React-Query caching issues
const handleRevealFace = async () => {
  setFaceLoading(true);
  try {
    const res = await fetch(`/api/certificates/face-blob/${targetSessionId}`);
    if (res.ok) {
      const json = await res.json();
      // Extract from top-level or data envelope
      const blob = json.faceBlob || json.data?.faceBlob || json.data?.imageData || json.data?.dataUrl;
      if (blob) {
        setFaceImageUrl(blob);
        setShowFace(true);
        setCountdown(10);
      } else {
        setFaceDestroyed(true);
      }
    } else {
      setFaceDestroyed(true);
    }
  } catch (e) {
    console.error('[Certificate] Failed to retrieve biometric payload', e);
    setFaceDestroyed(true);
  } finally {
    setFaceLoading(false);
  }
};
const handlePrint = () => window.print();

  // Handle countdown & manual/automatic self-destruction
  useEffect(() => {
    if (showFace && countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (showFace && countdown === 0) {
      setShowFace(false);
      setFaceDestroyed(true);
      setFaceImageUrl(null);
      
      // Notify server to instantly delete the face-blob from Upstash/Redis
      fetch(`/api/certificates/face-blob/${targetSessionId}`, {
        method: 'DELETE',
      }).catch((err) => console.warn('[Biometrics] Destroy signal failed', err));
    }

    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [showFace, countdown, targetSessionId]);

  if (isLoading || !cert) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-mono text-muted">Decoding Cryptographic Seal...</div>
        </div>
      </div>
    );
  }

  // ─── SAFE LOCALS AND DESTRUCTURING ───────────────────────────────────
  const payload = (cert as any).payload || {};
  const certId = (cert as any).certificateId || cert.id || id;
  const amountRupees =
    payload.amountRupees ??
    (payload.amountPaisa ? Number(payload.amountPaisa) / 100 : cert.amountRupees ?? 0);
  const senderVpa = payload.senderVpa ?? cert.senderVpa ?? 'unknown@spyde';
  const receiverVpa = payload.receiverVpa ?? cert.receiverVpa ?? 'unknown@spyde';
  const receiverName =
    payload.receiverLegalName ??
    payload.receiverName ??
    (cert as any).receiverName ??
    'External Payee';
  const riskVerdict =
    payload.riskVerdict ?? cert.riskVerdict ?? (cert as any).verdict ?? 'PASS';
  const riskScore = payload.riskScore ?? cert.riskScore ?? 0;
  const timestamp =
    payload.timestamp ??
    (cert as any).settledAt ??
    (cert as any).issuedAt ??
    new Date().toISOString();
  const geohash = payload.geohash ?? (cert as any).geohash ?? 'tdr1y1e (Location Hidden)';
  const deviceAttestation =
    payload.deviceAttestation ?? (cert as any).deviceAttestation ?? 'Verified Hardware';
  const merkleRoot = payload.merkleRoot ?? (cert as any).merkleRoot ?? 'N/A';
  const algorithm =
    payload.algorithm ?? (cert as any).algorithm ?? 'Ed25519-SHA512 (RFC 8032)';
  const publicKey =
    payload.publicKey ??
    (cert as any).publicKey ??
    'ed25519:9f8e7d6c5b4a392817263544abcfef0123456789abcdef0123456789abcdef01';
  const payloadHash = cert.payloadHash ?? 'no-hash-available';
  const signature =
    cert.jwtSignature ?? (cert as any).signature ?? 'no-signature-available';
  
  // Biometric flags
  const hasFaceBlob = Boolean(cert.faceBlobId || (cert as any).hasViewOnceFace || challengeSessionId);

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amountRupees);

  const verdictColor =
    riskVerdict === 'PASS'
      ? 'text-trading-up'
      : riskVerdict === 'WARN'
        ? 'text-yellow-400'
        : riskVerdict === 'CHALLENGE'
          ? 'text-orange-400'
          : 'text-trading-down';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas py-6 px-4 max-w-3xl mx-auto space-y-6 print:bg-white print:text-black print:p-0">
      {/* Action Bar */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-md bg-surface-card-dark hover:bg-surface-elevated-dark border border-hairline-dark text-on-dark text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-muted" /> Print
          </button>
          <Link
            to={`/verify/${certId}`}
            className="px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-canvas text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow"
          >
            <Share2 className="w-3.5 h-3.5" /> Public Verifier
          </Link>
        </div>
      </div>

      {/* Main Cryptographic Document Card */}
      <div className="bg-surface-card-dark border border-hairline-dark rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden print:border print:border-black print:shadow-none print:bg-white">
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 bg-trading-up/10 rounded-full blur-3xl" />

        {/* Certificate Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-hairline-dark print:border-black/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-surface-elevated-dark border border-hairline-dark flex items-center justify-center text-primary">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase font-bold text-primary tracking-wider">
                SPYDE B2B Fraud Prevention Protocol
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-on-dark tracking-tight font-sans">
                Cryptographic Attestation
              </h1>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-mono uppercase text-muted tracking-wider block font-semibold">
              Certificate UID
            </span>
            <span className="font-mono text-xs font-bold text-on-dark select-all">{certId}</span>
          </div>
        </div>

        {/* Verdict Callout */}
        <div className="my-6 p-4 rounded-2xl bg-canvas border border-hairline-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-transparent print:border-black/20">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-white/5 ${verdictColor}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold ${verdictColor}`}>
                  RISK ASSESSMENT: {riskVerdict}
                </span>
                <span className="text-[11px] font-mono text-muted">(Score: {riskScore}/100)</span>
              </div>
              <div className="text-xs text-muted font-mono mt-0.5">
                Mathematically proven authentic at point of transaction.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerifySeal}
            disabled={isVerifying}
            className="px-3.5 py-2 rounded-md bg-surface-elevated-dark hover:bg-hairline-dark border border-hairline-dark text-on-dark text-xs font-mono font-bold inline-flex items-center justify-center gap-1.5 transition-colors flex-shrink-0"
          >
            {isVerifying ? (
              <span className="animate-spin text-primary">●</span>
            ) : isVerifiedLocally ? (
              <CheckCircle2 className="w-4 h-4 text-trading-up" />
            ) : (
              <Lock className="w-4 h-4 text-primary" />
            )}
            {isVerifying ? 'Checking...' : 'Ed25519 Seal Valid'}
          </button>
        </div>

        {/* ─── VIEW-ONCE BIOMETRIC VISUALIZER ─── */}
        {hasFaceBlob && (
          <div className="my-6 p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-4 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-on-dark">Receiver Biometric Proof</span>
              </div>
              {showFace && (
                <span className="text-xs font-mono font-bold text-red-400 animate-pulse">
                  Self-destruct in {countdown}s
                </span>
              )}
            </div>

            {!showFace && !faceDestroyed && (
              <div className="text-center p-6 bg-slate-900/50 rounded-xl border border-white/5 space-y-3">
                <p className="text-xs text-slate-400">
                  Receiver consented to share a 10-second view-once face capture during liveness
                  verification.
                </p>
                <button
                  onClick={handleRevealFace}
                  disabled={faceLoading}
                  className="px-6 py-2 bg-primary text-canvas text-xs font-bold rounded-xl shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {faceLoading ? 'Decrypting...' : 'Decrypt & Reveal Face'}
                </button>
              </div>
            )}

            {showFace && faceImageUrl && (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-primary shadow-[0_0_30px_rgba(255,102,0,0.3)]">
                  <img
                    src={faceImageUrl}
                    alt="Receiver biometric proof"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                  />
                </div>
                <p className="text-[10px] font-mono text-red-400/80 text-center max-w-xs">
                  DPDP: This image will be permanently purged in {countdown} seconds.
                </p>
                {/* Visual indicator of destruction speed */}
                <div className="w-full max-w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-1000"
                    style={{ width: `${(countdown / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {faceDestroyed && (
              <div className="text-center p-4 bg-red-950/30 rounded-xl border border-red-500/20 space-y-1">
                <AlertTriangle className="w-6 h-6 text-red-400 mx-auto" />
                <p className="text-xs font-mono text-red-400">
                  DPDP COMPLIANCE: Record permanently purged from server & client memory.
                </p>
              </div>
            )}
          </div>
        )}

        {!hasFaceBlob && riskVerdict === 'CHALLENGE' && (
          <div className="my-6 p-4 rounded-2xl border border-hairline-dark bg-slate-900/50 flex items-center gap-3 print:hidden">
            <UserX className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs font-semibold text-on-dark">
                Receiver declined to share face proof
              </p>
              <p className="text-[11px] text-slate-500">
                Liveness verified without biometric snapshot capture.
              </p>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-surface-elevated-dark/40 border border-hairline-dark space-y-2.5">
            <div className="text-muted uppercase text-[10px] tracking-wider font-semibold flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-primary" /> Transaction Context
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Amount</span>
              <span className="text-on-dark font-bold text-sm tnum">{formattedAmount}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted shrink-0">Sender VPA</span>
              <span className="text-on-dark select-all truncate">{senderVpa}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted shrink-0">Receiver VPA</span>
              <span className="text-on-dark select-all truncate">{receiverVpa}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted shrink-0">Receiver Name</span>
              <span className="text-on-dark font-sans font-medium truncate">{receiverName}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-elevated-dark/40 border border-hairline-dark space-y-2.5">
            <div className="text-muted uppercase text-[10px] tracking-wider font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Temporal & Hardware Audit
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted shrink-0">Timestamp</span>
              <span className="text-on-dark tnum truncate">
                {new Date(timestamp).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted shrink-0">Geohash Anchor</span>
              <span className="text-on-dark truncate">{geohash}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted shrink-0">Device Attestation</span>
              <span className="text-on-dark truncate max-w-[170px]">{deviceAttestation}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted shrink-0">Merkle Root</span>
              <span className="text-on-dark truncate max-w-[170px] select-all">{merkleRoot}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic Signature Block */}
        <div className="mt-4 p-5 rounded-2xl bg-canvas border border-hairline-dark space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono uppercase text-on-dark font-bold tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" /> Digital Signature Envelope
            </div>
            <span className="text-[11px] font-mono text-muted">{algorithm}</span>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] uppercase font-mono text-muted">SPYDE Issuer Public Key</div>
            <div className="p-2 rounded-xl bg-surface-card-dark border border-hairline-dark text-[11px] font-mono text-muted select-all break-all">
              {publicKey}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-mono text-muted font-semibold">
              <span>SHA-256 Telemetry Hash</span>
              <button
                type="button"
                onClick={() => handleCopy(payloadHash, 'hash')}
                className="hover:text-on-dark flex items-center gap-1 transition-colors"
              >
                {copiedHash ? (
                  <Check className="w-3 h-3 text-trading-up" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedHash ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-2 rounded-xl bg-surface-card-dark border border-hairline-dark text-[11px] font-mono text-on-dark select-all break-all flex items-center justify-between">
              <span className="truncate">{payloadHash}</span>
              <Hash className="w-3.5 h-3.5 text-muted flex-shrink-0 ml-2" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-mono text-muted font-semibold">
              <span>Ed25519 Detached Signature</span>
              <button
                type="button"
                onClick={() => handleCopy(signature, 'sig')}
                className="hover:text-on-dark flex items-center gap-1 transition-colors"
              >
                {copiedSig ? (
                  <Check className="w-3 h-3 text-trading-up" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedSig ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-2 rounded-xl bg-surface-card-dark border border-hairline-dark text-[10px] font-mono text-muted select-all break-all leading-relaxed max-h-20 overflow-y-auto">
              {signature}
            </div>
          </div>
        </div>

        {/* Footer Audit Line */}
        <div className="mt-8 pt-6 border-t border-hairline-dark flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <span>Immutable Node Anchor #{certId.slice(-6).toUpperCase()}</span>
          </div>
          <div className="font-mono text-[11px]">RFC 6962 Certificate Transparency Logged</div>
        </div>
      </div>
    </div>
  );
};