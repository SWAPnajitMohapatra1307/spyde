import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert, 
  MapPin, 
  Layers, 
  Building2, 
  ArrowLeft, 
  Lock, 
  FileWarning, 
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { usePaymentStore } from '@/stores/paymentStore';
import { AmountDisplay } from '@/components/payment/AmountDisplay';
import { ReceiverCard } from '@/components/payment/ReceiverCard';

export const QrResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentState = usePaymentStore();

  const vpa = searchParams.get('vpa') || 'unknown@upi';
  const name = searchParams.get('name') || 'Merchant Store';
  const amountStr = searchParams.get('amount');
  const amount = amountStr ? parseFloat(amountStr) : 0;
  const merchantCode = searchParams.get('mc') || '';
  const isTampered = searchParams.get('tamper') === 'true';

  // Derived telemetry metrics
  const riskScore = isTampered ? 89 : 12;
  const gpsVarianceDistance = isTampered ? '4.8 km discrepancy' : 'Within 15 meters';
  const layerDiscontinuityScore = isTampered ? 'HIGH (Physical Sticker Overlay Detected)' : 'NORMAL (Monolithic Print)';

  const handleProceedToPay = () => {
    paymentState.setReceiverDetails({
      vpa,
      name,
      bank: vpa.split('@')[1] ? `@${vpa.split('@')[1]}` : '@upi',
      riskScore,
      isSafeCircle: !isTampered,
    });

    if (amount > 0) {
      paymentState.setAmount(amount);
    }
    paymentState.setStep('CONFIRM');

    navigate('/payment/confirm');
  };

  const handleReportTamper = () => {
    const params = new URLSearchParams({
      vpa,
      category: 'FRAUD',
      description: `Physical QR sticker overlay detected. GPS variance discrepancy: ${gpsVarianceDistance}`,
    });
    navigate(`/complaints/new?${params.toString()}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-canvas py-6 px-4">
      {/* Dynamic Ambient Wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-15"
        style={{
          background: isTampered
            ? 'radial-gradient(circle at 50% 0%, #EF4444 0%, rgba(239, 68, 68, 0) 70%)'
            : 'radial-gradient(circle at 50% 0%, #10B981 0%, rgba(16, 185, 129, 0) 70%)',
        }}
      />

      <div className="relative max-w-xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/qr')}
            className="inline-flex items-center gap-1.5 text-bone-muted hover:text-bone text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Scan Another QR
          </button>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill border text-xs font-mono font-bold ${
              isTampered
                ? 'bg-accent-red/15 border-accent-red/30 text-accent-red'
                : 'bg-accent-green/15 border-accent-green/30 text-accent-green'
            }`}
          >
            {isTampered ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5" /> TAMPER WARNING
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" /> QR VERIFIED AUTHENTIC
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-bone tracking-tight flex items-center gap-2.5">
            {isTampered ? (
              <ShieldAlert className="w-8 h-8 text-accent-red flex-shrink-0" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-accent-green flex-shrink-0" />
            )}
            {isTampered ? 'QR Sticker Tamper Detected' : 'Verified Counter Standee'}
          </h1>
          <p className="text-bone-muted text-sm mt-1">
            {isTampered
              ? 'SPYDE computer vision and GPS correlation detected physical standee replacement.'
              : 'Physical standee matches registered merchant geofence and cryptographic signature.'}
          </p>
        </div>

        {/* Receiver Card */}
        <ReceiverCard
          name={name}
          vpa={vpa}
          bank={vpa.split('@')[1] ? `@${vpa.split('@')[1]}` : '@upi'}
          riskScore={riskScore}
        />

        {/* Amount Box (if encoded in QR) */}
        {amount > 0 && (
          <div className="bg-canvas-card border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-bone-muted tracking-wider">
              Preset Amount in QR
            </span>
            <AmountDisplay amount={amount} size="md" />
          </div>
        )}

        {/* Telemetry Inspection Grid */}
        <div className="bg-canvas-card border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="text-xs font-mono font-bold uppercase text-bone tracking-wider">
            Deep QR Telemetry Inspection
          </div>

          <div className="space-y-3 text-xs">
            {/* Geolocation check */}
            <div className="p-3 rounded-xl bg-canvas border border-white/5 flex items-start gap-3">
              <MapPin className={`w-4 h-4 mt-0.5 ${isTampered ? 'text-accent-red' : 'text-accent-green'}`} />
              <div className="flex-1">
                <div className="font-semibold text-bone flex items-center justify-between">
                  <span>Merchant GPS Geofence</span>
                  <span className={`font-mono text-[11px] ${isTampered ? 'text-accent-red' : 'text-accent-green'}`}>
                    {isTampered ? 'FAIL' : 'MATCH'}
                  </span>
                </div>
                <div className="text-bone-muted mt-0.5">{gpsVarianceDistance}</div>
              </div>
            </div>

            {/* Physical Layer / Edge Discontinuity */}
            <div className="p-3 rounded-xl bg-canvas border border-white/5 flex items-start gap-3">
              <Layers className={`w-4 h-4 mt-0.5 ${isTampered ? 'text-accent-red' : 'text-accent-green'}`} />
              <div className="flex-1">
                <div className="font-semibold text-bone flex items-center justify-between">
                  <span>Physical Layer Discontinuity</span>
                  <span className={`font-mono text-[11px] ${isTampered ? 'text-accent-red' : 'text-accent-green'}`}>
                    {isTampered ? 'SUSPICIOUS OVERLAY' : 'AUTHENTIC'}
                  </span>
                </div>
                <div className="text-bone-muted mt-0.5">{layerDiscontinuityScore}</div>
              </div>
            </div>

            {/* Merchant Category Code */}
            {merchantCode && (
              <div className="p-3 rounded-xl bg-canvas border border-white/5 flex items-start gap-3">
                <Building2 className="w-4 h-4 text-bone-muted mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-bone">Merchant Category Code (MCC)</div>
                  <div className="text-bone-muted font-mono mt-0.5">{merchantCode}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Warning Callout for Tampered Case */}
        {isTampered && (
          <div className="p-4 rounded-2xl bg-accent-red/10 border border-accent-red/25 text-xs text-bone space-y-1.5">
            <div className="font-bold text-accent-red uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Fraud Alert: Do Not Pay
            </div>
            <p className="text-bone-muted leading-relaxed">
              Scammers frequently paste fraudulent stickers over store QR stands. If you did not intend to pay{' '}
              <span className="text-bone font-semibold">{vpa}</span>, report this location to protect other shoppers.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          {isTampered ? (
            <>
              <button
                type="button"
                onClick={handleReportTamper}
                className="w-full py-4 px-6 rounded-pill bg-accent-red hover:bg-accent-red/90 text-white font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <FileWarning className="w-4 h-4" />
                <span>Report Tampered Standee to Store</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToPay}
                className="w-full py-3 px-5 rounded-pill bg-canvas-card hover:bg-canvas-elevated border border-white/10 text-bone-muted hover:text-bone font-medium text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Proceed Anyway (Strict Risk Controls Applied)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleProceedToPay}
              className="w-full py-4 px-6 rounded-pill bg-primary hover:bg-primary/90 text-canvas font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Proceed to Pay {amount > 0 ? `₹${amount}` : name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};