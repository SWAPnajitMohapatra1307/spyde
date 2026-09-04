// client/src/pages/QrResultPage.tsx
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  FileWarning,
  Lock,
  ArrowRight,
  Building2
} from 'lucide-react';
import { usePaymentStore } from '@/stores/paymentStore';

export const QrResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentStore = usePaymentStore() as any;

  const vpa = searchParams.get('vpa') || 'unknown@upi';
  const name = searchParams.get('name') || 'Merchant';
  const amountParam = searchParams.get('amount');
  const merchantCode = searchParams.get('mc') || '5812';
  const isTampered = searchParams.get('tamper') === 'true';
  const isSigned = searchParams.get('signed') === 'true';
  const signature = searchParams.get('sig') || '';
  const lat = searchParams.get('lat') || '12.9716';
  const lng = searchParams.get('lng') || '77.5946';

  const [customAmount, setCustomAmount] = useState<string>(amountParam || '');
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);

  const parsedAmount = parseFloat(customAmount) || (amountParam ? parseFloat(amountParam) : 0);

  // ─── HANDOFF TO PAYMENT PIPELINE ────────────────────────────
  const handleProceedToPayment = () => {
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Please specify a valid payment amount');
      return;
    }

    const targetPayload = {
      receiverVpa: vpa,
      amount: parsedAmount,
      merchantName: name,
      isSignedQr: isSigned,
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    };

    // Store update (supports setPaymentTarget / setTarget / setStep)
    if (typeof paymentStore.setPaymentTarget === 'function') {
      paymentStore.setPaymentTarget(targetPayload);
    } else if (typeof paymentStore.setTarget === 'function') {
      paymentStore.setTarget(targetPayload);
    }

    if (typeof paymentStore.setStep === 'function') {
      paymentStore.setStep('CONFIRM');
    }

    // Pass data via router state as well for instant UI hydration
    navigate('/payment/confirm', {
      state: targetPayload,
    });
  };

  const handleReportFraud = () => {
    const query = new URLSearchParams({
      vpa: vpa,
      name: name,
      category: 'QR_TAMPER',
      evidence: `Tampered QR detected at Lat: ${lat}, Lng: ${lng}. Signature: ${signature || 'FORGED'}`,
    });
    navigate(`/complaints/new?${query.toString()}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas py-4 px-4 max-w-lg mx-auto flex flex-col justify-between space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/qr')}
          className="inline-flex items-center gap-1.5 text-muted hover:text-on-dark text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Rescan QR
        </button>
        <span className="text-[11px] font-mono bg-surface-card-dark px-2.5 py-1 rounded-pill border border-hairline-dark text-muted">
          Security Check: {isTampered ? 'CRITICAL' : 'PASSED'}
        </span>
      </div>

      {/* ─── CASE A: TAMPERED / OVERLAY FRAUD DETECTED ─────── */}
      {isTampered ? (
        <div className="space-y-4">
          <div className="bg-trading-down/10 border-2 border-trading-down rounded-2xl p-5 text-left space-y-3 relative overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2.5 text-trading-down">
              <ShieldAlert className="w-7 h-7 flex-shrink-0 animate-bounce" />
              <div>
                <h2 className="text-base font-bold uppercase tracking-wide">
                  Physical Sticker Tamper Detected
                </h2>
                <p className="text-xs text-trading-down/80 font-mono">
                  Cryptographic Signature Verification Failed
                </p>
              </div>
            </div>

            <p className="text-xs text-on-dark leading-relaxed">
              SPYDE detected a <strong>mismatched cryptographic signature</strong> or an unverified beneficiary overlay.
              The genuine merchant account has likely been covered by an attacker's fake sticker.
            </p>

            {/* Fraud Telemetry Breakdown */}
            <div className="bg-surface-card-dark/80 rounded-xl p-3.5 border border-trading-down/30 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center text-muted">
                <span>Suspect Payee:</span>
                <span className="text-trading-down font-bold">{vpa}</span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Sticker Name:</span>
                <span className="text-on-dark">{name}</span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Merchant Category:</span>
                <span className="text-trading-down">{merchantCode}</span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Signature Status:</span>
                <span className="text-trading-down uppercase font-bold">FORGED / ABSENT</span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>GPS Coordinates:</span>
                <span className="text-on-dark">{lat.slice(0, 7)}, {lng.slice(0, 7)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleReportFraud}
              className="w-full py-3.5 bg-trading-down hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-trading-down/30 transition-all text-sm"
            >
              <FileWarning className="w-4 h-4" /> Report Fraud & Protect Others
            </button>

            <button
              onClick={() => navigate('/home')}
              className="w-full py-3 bg-surface-card-dark hover:bg-surface-elevated-dark text-on-dark border border-hairline-dark font-semibold rounded-xl text-sm transition-colors"
            >
              Abort Payment & Return Home
            </button>

            <button
              onClick={() => setShowOverrideModal(true)}
              className="w-full text-center text-[11px] text-muted hover:text-trading-down underline pt-1 font-mono"
            >
              I know what I'm doing (Force Pay) →
            </button>
          </div>
        </div>
      ) : (
        /* ─── CASE B: AUTHENTIC MERCHANT VERIFIED ──────────── */
        <div className="space-y-4">
          <div className="bg-trading-up/10 border border-trading-up/40 rounded-2xl p-5 text-left space-y-4 relative shadow-xl">
            <div className="flex items-center gap-2.5 text-trading-up">
              <ShieldCheck className="w-7 h-7 flex-shrink-0" />
              <div>
                <h2 className="text-base font-bold text-on-dark">
                  Authentic SPYDE Merchant
                </h2>
                <p className="text-xs text-trading-up font-mono">
                  HMAC-SHA256 Cryptographic Lock Verified ✓
                </p>
              </div>
            </div>

            {/* Merchant Details Card */}
            <div className="bg-surface-card-dark rounded-xl p-4 border border-hairline-dark space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-on-dark font-semibold text-sm">
                <Building2 className="w-4 h-4 text-primary" /> {name}
              </div>
              <div className="flex justify-between items-center text-muted font-mono text-[11px]">
                <span>UPI ID (VPA):</span>
                <span className="text-on-dark font-medium">{vpa}</span>
              </div>
              <div className="flex justify-between items-center text-muted font-mono text-[11px]">
                <span>MCC Category:</span>
                <span className="text-on-dark">{merchantCode}</span>
              </div>
              <div className="flex justify-between items-center text-muted font-mono text-[11px]">
                <span>Security Scheme:</span>
                <span className="text-trading-up">Signed Enclave v4.1</span>
              </div>
            </div>

            {/* Amount Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted uppercase">Payment Amount (INR)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-muted font-bold">₹</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-canvas border border-hairline-dark rounded-xl text-base font-bold text-on-dark focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleProceedToPayment}
              disabled={!parsedAmount || parsedAmount <= 0}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all text-sm"
            >
              <span>Pay ₹{parsedAmount ? parsedAmount.toFixed(2) : '0.00'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/circle')}
              className="w-full py-2.5 bg-surface-card-dark hover:bg-surface-elevated-dark text-muted hover:text-on-dark border border-hairline-dark font-semibold rounded-xl text-xs transition-colors"
            >
              Add to Safe Circle Contacts
            </button>
          </div>
        </div>
      )}

      {/* Safety Notice Footer */}
      <div className="text-[11px] font-mono text-muted/60 text-center flex items-center justify-center gap-1.5">
        <Lock className="w-3 h-3" /> SPYDE Zero-Trust QR Enclave Protocol
      </div>

      {/* ─── OVERRIDE MODAL ─── */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-card-dark border border-trading-down rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-trading-down font-bold text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              High Risk Warning Override
            </div>
            <p className="text-xs text-on-dark leading-relaxed">
              You are attempting to transfer funds to a VPA flagged as fraudulent or tampered (<strong>{vpa}</strong>). SPYDE will enforce Biometric Liveness Challenges and Escrow protection on this transaction.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="flex-1 py-2 bg-surface-elevated-dark border border-hairline-dark text-on-dark rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  handleProceedToPayment();
                }}
                className="flex-1 py-2 bg-trading-down hover:bg-red-700 text-white rounded-lg text-xs font-bold"
              >
                Confirm Risk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};