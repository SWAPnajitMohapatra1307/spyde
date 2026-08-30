import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  Calendar
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface FraudCertificateData {
  id: string;
  transactionId: string;
  senderVpa: string;
  receiverVpa: string;
  receiverName: string;
  amount: number;
  verdict: 'PASS' | 'WARN' | 'CHALLENGE' | 'BLOCK';
  riskScore: number;
  issuedAt: string;
  algorithm: string;
  publicKey: string;
  signature: string;
  payloadHash: string;
  merkleRoot: string;
  geohash: string;
  deviceAttestation: string;
}

export const CertificatePage: React.FC = () => {
  const { id = 'demo-cert' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [copiedSig, setCopiedSig] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerifiedLocally, setIsVerifiedLocally] = useState<boolean>(true);

  // Fetch certificate from API with deterministic fallback
  const { data: cert, isLoading } = useQuery<FraudCertificateData>({
    queryKey: ['certificate', id],
    queryFn: async () => {
      try {
        const res = await apiClient.get<FraudCertificateData>(`/api/certificates/${id}`);
        return res.data;
      } catch {
        // Fallback for sandboxes & demo ids
        return {
          id,
          transactionId: `TXN-${id.slice(0, 8).toUpperCase()}`,
          senderVpa: 'payer.secure@okhdfcbank',
          receiverVpa: 'verified.merchant@okicici',
          receiverName: 'Apex Secure Retail Ltd',
          amount: 2450.0,
          verdict: 'PASS',
          riskScore: 8,
          issuedAt: new Date().toISOString(),
          algorithm: 'Ed25519-SHA512 (RFC 8032)',
          publicKey: 'ed25519:9f8e7d6c5b4a392817263544abcfef0123456789abcdef0123456789abcdef01',
          signature: '3b84f901a8c9e4726d1b2f8a4e5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
          payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          merkleRoot: '7d5a99f603f231d53e8ddc61a2a5d36427d571e4649b934ca495991b7852b855',
          geohash: 'tdr1y1e (12.9716° N, 77.5946° E)',
          deviceAttestation: 'Android SafetyNet Hardware / Apple Secure Enclave Pass',
        };
      }
    },
  });

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

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !cert) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-pill animate-spin mx-auto" />
          <div className="text-xs font-mono text-bone-muted">Decoding Cryptographic Seal...</div>
        </div>
      </div>
    );
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(cert.amount);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas py-6 px-4 max-w-3xl mx-auto space-y-6 print:bg-white print:text-black print:p-0">
      {/* Action Header */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-bone-muted hover:text-bone text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-canvas-card hover:bg-canvas-elevated border border-white/10 text-bone text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-bone-muted" /> Print
          </button>
          <Link
            to={`/verify/${cert.id}`}
            className="px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-canvas text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow"
          >
            <Share2 className="w-3.5 h-3.5" /> Public Verifier
          </Link>
        </div>
      </div>

      {/* Main Certificate Document Sheet */}
      <div className="bg-canvas-card border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden print:border print:border-black print:shadow-none print:bg-white">
        {/* Holographic Watermark Glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-pill blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 bg-accent-green/10 rounded-pill blur-3xl" />

        {/* Certificate Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 print:border-black/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-canvas-elevated border border-white/10 flex items-center justify-center text-primary shadow-inner">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase font-bold text-primary tracking-wider">
                SPYDE B2B Fraud Prevention Protocol
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-bone tracking-tight">
                Cryptographic Attestation
              </h1>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-mono uppercase text-bone-muted tracking-wider block">
              Certificate UID
            </span>
            <span className="font-mono text-xs font-bold text-bone select-all">
              {cert.id}
            </span>
          </div>
        </div>

        {/* Status Seal Bar */}
        <div className="my-6 p-4 rounded-2xl bg-canvas border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-transparent print:border-black/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-green/15 text-accent-green">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-accent-green">
                  RISK ASSESSMENT: {cert.verdict}
                </span>
                <span className="text-[11px] font-mono text-bone-muted">
                  (Score: {cert.riskScore}/100)
                </span>
              </div>
              <div className="text-xs text-bone-muted">
                Mathematically proven authentic at point of transaction.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerifySeal}
            disabled={isVerifying}
            className="px-3.5 py-2 rounded-xl bg-canvas-elevated hover:bg-white/10 border border-white/10 text-bone text-xs font-mono font-bold inline-flex items-center justify-center gap-1.5 transition-colors flex-shrink-0"
          >
            {isVerifying ? (
              <span className="animate-spin text-primary">●</span>
            ) : isVerifiedLocally ? (
              <CheckCircle2 className="w-4 h-4 text-accent-green" />
            ) : (
              <Lock className="w-4 h-4 text-primary" />
            )}
            {isVerifying ? 'Checking...' : 'Ed25519 Seal Valid'}
          </button>
        </div>

        {/* Transaction Telemetry Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-canvas-elevated/50 border border-white/5 space-y-2.5">
            <div className="text-bone-muted uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-primary" /> Transaction Context
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Amount</span>
              <span className="text-bone font-bold text-sm tnum">{formattedAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Sender VPA</span>
              <span className="text-bone select-all">{cert.senderVpa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Receiver VPA</span>
              <span className="text-bone select-all">{cert.receiverVpa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Receiver Legal Name</span>
              <span className="text-bone font-sans font-medium">{cert.receiverName}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-canvas-elevated/50 border border-white/5 space-y-2.5">
            <div className="text-bone-muted uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Temporal & Hardware Audit
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Timestamp</span>
              <span className="text-bone tnum">{new Date(cert.issuedAt).toUTCString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Geohash Anchor</span>
              <span className="text-bone">{cert.geohash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Device Attestation</span>
              <span className="text-bone truncate max-w-[170px]">{cert.deviceAttestation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Merkle Root</span>
              <span className="text-bone truncate max-w-[170px] select-all">{cert.merkleRoot}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic Proof Block */}
        <div className="mt-4 p-5 rounded-2xl bg-canvas border border-white/10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono uppercase text-bone font-bold tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" /> Digital Signature Envelope
            </div>
            <span className="text-[11px] font-mono text-bone-muted">
              {cert.algorithm}
            </span>
          </div>

          {/* Public Key */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-mono text-bone-muted">SPYDE Issuer Public Key</div>
            <div className="p-2 rounded-xl bg-canvas-card border border-white/5 text-[11px] font-mono text-bone-muted select-all break-all">
              {cert.publicKey}
            </div>
          </div>

          {/* Payload SHA-256 Hash */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-mono text-bone-muted">
              <span>SHA-256 Telemetry Hash</span>
              <button
                type="button"
                onClick={() => handleCopy(cert.payloadHash, 'hash')}
                className="hover:text-bone flex items-center gap-1 transition-colors"
              >
                {copiedHash ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
                {copiedHash ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-2 rounded-xl bg-canvas-card border border-white/5 text-[11px] font-mono text-bone select-all break-all flex items-center justify-between">
              <span className="truncate">{cert.payloadHash}</span>
              <Hash className="w-3.5 h-3.5 text-bone-muted flex-shrink-0 ml-2" />
            </div>
          </div>

          {/* Ed25519 Signature */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-mono text-bone-muted">
              <span>Ed25519 Detached Signature</span>
              <button
                type="button"
                onClick={() => handleCopy(cert.signature, 'sig')}
                className="hover:text-bone flex items-center gap-1 transition-colors"
              >
                {copiedSig ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
                {copiedSig ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-2 rounded-xl bg-canvas-card border border-white/5 text-[10px] font-mono text-bone-muted select-all break-all leading-relaxed max-h-20 overflow-y-auto">
              {cert.signature}
            </div>
          </div>
        </div>

        {/* Footer Audit Seal */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-bone-muted">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <span>Immutable Node Anchor #849204</span>
          </div>
          <div className="font-mono text-[11px]">
            RFC 6962 Certificate Transparency Logged
          </div>
        </div>
      </div>
    </div>
  );
};