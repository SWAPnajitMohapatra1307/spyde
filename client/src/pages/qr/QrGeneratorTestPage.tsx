// client/src/pages/qr/QrGeneratorTestPage.tsx
import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QrGeneratorTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [vpa, setVpa] = useState('artisan.cafe@okhdfcbank');
  const [amount, setAmount] = useState('350');
  const [name, setName] = useState('Artisan Cafe & Bakery');

  // 1. Generate Valid SPYDE Cryptographic Payload
  const validPayload = {
    vpa,
    payeeName: name,
    amount: parseFloat(amount) || 0,
    txnId: `TXN_${Date.now()}`,
    timestamp: Date.now(),
    ttl: 300000,
  };
  const validEncoded = btoa(JSON.stringify(validPayload));
  // Mock HMAC SHA-256 Signature
  const validSignature = '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';
  const authenticQrString = `${validEncoded}::${validSignature}`;

  // 2. Generate Tampered QR (Amount or VPA modified without valid key)
  const tamperedPayload = {
    vpa: 'attacker.bot@paytm',
    payeeName: `${name} (Overlaid Sticker)`,
    amount: 1500, // Altered amount
    txnId: `TXN_TAMPERED_${Date.now()}`,
    timestamp: Date.now(),
    ttl: 300000,
  };
  const tamperedEncoded = btoa(JSON.stringify(tamperedPayload));
  // Corrupted / forged signature
  const tamperedQrString = `${tamperedEncoded}::INVALID_FORGED_SIGNATURE_9999999999`;

  const getQrUrl = (data: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data)}`;

  return (
    <div className="min-h-screen bg-canvas text-on-dark p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/qr/scan')}
          className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Scanner
        </button>
        <span className="text-xs font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-pill border border-primary/20">
          SPYDE QR Lab
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-on-dark flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> QR Authenticity Test Bench
        </h1>
        <p className="text-xs text-muted mt-1">
          Scan these QR codes using the SPYDE Scanner to verify real-time cryptographic tamper detection.
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-3 bg-surface-card-dark p-4 rounded-xl border border-hairline-dark">
        <div>
          <label className="text-[11px] font-mono text-muted block mb-1">Payee Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-canvas border border-hairline-dark rounded px-2.5 py-1.5 text-xs text-on-dark"
          />
        </div>
        <div>
          <label className="text-[11px] font-mono text-muted block mb-1">VPA</label>
          <input
            type="text"
            value={vpa}
            onChange={(e) => setVpa(e.target.value)}
            className="w-full bg-canvas border border-hairline-dark rounded px-2.5 py-1.5 text-xs text-on-dark"
          />
        </div>
        <div>
          <label className="text-[11px] font-mono text-muted block mb-1">Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-canvas border border-hairline-dark rounded px-2.5 py-1.5 text-xs text-on-dark"
          />
        </div>
      </div>

      {/* Side-by-Side QR Codes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Authentic QR Card */}
        <div className="bg-surface-card-dark border border-trading-up/40 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 shadow-lg">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-trading-up bg-trading-up/10 px-3 py-1 rounded-pill">
            <ShieldCheck className="w-4 h-4" /> 1. Authentic SPYDE QR
          </div>
          <div className="bg-white p-3 rounded-xl shadow-inner">
            <img src={getQrUrl(authenticQrString)} alt="Authentic QR" className="w-44 h-44" />
          </div>
          <p className="text-[11px] font-mono text-muted">
            Includes valid HMAC-SHA256 signature matching registered merchant keys.
          </p>
        </div>

        {/* Tampered QR Card */}
        <div className="bg-surface-card-dark border border-trading-down/40 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 shadow-lg">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-trading-down bg-trading-down/10 px-3 py-1 rounded-pill">
            <ShieldAlert className="w-4 h-4" /> 2. Tampered / Overlaid QR
          </div>
          <div className="bg-white p-3 rounded-xl shadow-inner">
            <img src={getQrUrl(tamperedQrString)} alt="Tampered QR" className="w-44 h-44" />
          </div>
          <p className="text-[11px] font-mono text-muted">
            Simulates a physical sticker overlay with altered payee & invalid signature.
          </p>
        </div>
      </div>
    </div>
  );
};