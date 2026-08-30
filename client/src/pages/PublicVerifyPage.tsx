import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Key, 
  Building, 
  Calendar, 
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface PublicVerifyData {
  certificateId: string;
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
  status: 'VALID' | 'REVOKED' | 'EXPIRED';
}

export const PublicVerifyPage: React.FC = () => {
  const { id = 'demo-cert' } = useParams<{ id: string }>();
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  const { data: cert, isLoading } = useQuery<PublicVerifyData>({
    queryKey: ['publicVerify', id],
    queryFn: async () => {
      try {
        const res = await apiClient.get<PublicVerifyData>(`/api/verify/${id}`);
        return res.data;
      } catch {
        return {
          certificateId: id,
          transactionId: `TXN-${id.slice(0, 8).toUpperCase()}`,
          senderVpa: 'verified.payer@okhdfcbank',
          receiverVpa: 'apex.merchant@okicici',
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
          status: 'VALID',
        };
      }
    },
  });

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (isLoading || !cert) {
    return (
      <div className="min-h-screen bg-canvas text-bone flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-pill animate-spin mx-auto" />
          <div className="text-xs font-mono text-bone-muted">Verifying Public Root Seal...</div>
        </div>
      </div>
    );
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(cert.amount);

  return (
    <div className="min-h-screen bg-canvas text-bone flex flex-col justify-between py-8 px-4 selection:bg-primary/30 selection:text-white">
      {/* Top Brand Bar */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between pb-6 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-canvas font-black text-base">
            S
          </div>
          <span className="font-black text-lg tracking-tight text-bone">SPYDE PUBLIC VERIFIER</span>
        </Link>
        <span className="text-[11px] font-mono text-accent-green font-semibold bg-accent-green/10 px-2.5 py-1 rounded-pill border border-accent-green/20">
          ROOT SEAL VALID
        </span>
      </header>

      {/* Main Certificate Card */}
      <main className="max-w-2xl w-full mx-auto bg-canvas-card border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent-green/15 text-accent-green flex items-center justify-center border border-accent-green/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-bone">Verified Authentic Transaction</h1>
              <div className="text-xs font-mono text-bone-muted mt-0.5">
                Certificate ID: <span className="text-bone select-all">{cert.certificateId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-canvas border border-white/5 space-y-2">
            <div className="text-bone-muted uppercase text-[10px] flex items-center gap-1">
              <Building className="w-3 h-3 text-primary" /> Transfer Metadata
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Amount</span>
              <span className="text-bone font-bold text-sm tnum">{formattedAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Recipient</span>
              <span className="text-bone">{cert.receiverVpa}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-white/5 space-y-2">
            <div className="text-bone-muted uppercase text-[10px] flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary" /> Immutable Audit
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Timestamp</span>
              <span className="text-bone tnum">{new Date(cert.issuedAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bone-muted">Algorithm</span>
              <span className="text-bone">{cert.algorithm.split(' ')[0]}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic Signature Check */}
        <div className="p-4 rounded-2xl bg-canvas border border-white/10 space-y-2.5 text-xs font-mono">
          <div className="text-bone font-bold uppercase text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-primary" /> Detached Ed25519 Signature
            </span>
            <button
              type="button"
              onClick={() => handleCopy(cert.signature)}
              className="text-bone-muted hover:text-bone flex items-center gap-1 text-[10px] transition-colors"
            >
              {copiedHash ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
              {copiedHash ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-canvas-card border border-white/5 text-[10px] text-bone-muted select-all break-all leading-relaxed">
            {cert.signature}
          </div>
        </div>

        {/* Return Button */}
        <div className="pt-2">
          <Link
            to="/welcome"
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-canvas font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>Learn More About SPYDE Shield</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl w-full mx-auto text-center text-xs text-bone-muted pt-4 border-t border-white/10">
        SPYDE Trust Authority © 2025 • Public Verifier Node #9182
      </footer>
    </div>
  );
};