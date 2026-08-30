// client/src/pages/PaymentPage.tsx
import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, VerdictBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import type { PaymentDraft, Verdict } from '@/types/app';

type PaymentStep = 'entry' | 'confirm' | 'pin' | 'success' | 'failed';

const bankByVpa: Record<string, string> = {
  'bob@okhdfc': 'HDFC Bank',
  'priya@ybl': 'SBI',
  'bob@oksdi': 'HDFC Bank (suspect)',
  'scam99@fake': 'Unknown',
  'chaicorner@paytm': 'Paytm Payments Bank',
};

const derivePayment = (
  vpa: string,
  amount: number,
  note: string
): PaymentDraft => {
  if (vpa === 'scam99@fake') {
    return {
      vpa,
      label: 'Scammer 99',
      bank: 'Unknown',
      amount,
      note,
      verdict: 'BLOCK',
      riskScore: 95,
      isSafeCircle: false,
      isTyposquat: false,
      signals: [{ label: 'Known fraud VPA', detail: 'Multiple complaints filed' }],
    };
  }
  if (vpa === 'challenge@ybl') {
    return {
      vpa,
      label: 'Challenge Receiver',
      bank: 'SBI',
      amount,
      note,
      verdict: 'CHALLENGE',
      riskScore: 82,
      isSafeCircle: false,
      isTyposquat: false,
      signals: [{ label: 'New payee', detail: 'First-time transaction to this VPA' }],
    };
  }
  if (vpa === 'bob@oksdi') {
    return {
      vpa,
      label: 'Bob Typosquat',
      bank: 'HDFC Bank (suspect)',
      amount,
      note,
      verdict: 'WARN',
      riskScore: 55,
      isSafeCircle: false,
      isTyposquat: true,
      signals: [{ label: 'Typosquatting detected', detail: 'VPA resembles bob@okhdfc' }],
    };
  }

  const name = vpa.split('@')[0] || 'Receiver';
  return {
    vpa,
    label: name,
    bank: bankByVpa[vpa] ?? 'UPI Partner Bank',
    amount,
    note,
    verdict: 'PASS',
    riskScore: 10,
    isSafeCircle: true,
    isTyposquat: false,
    signals: [],
  };
};

const formatRupees = (amount: number): string => {
  return `₹${Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

interface RiskGaugeProps {
  score: number;
  verdict: Exclude<Verdict, 'REFUNDED'>;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score, verdict }) => {
  const color =
    verdict === 'PASS'
      ? 'text-accent-green'
      : verdict === 'WARN'
        ? 'text-accent-yellow'
        : verdict === 'CHALLENGE'
          ? 'text-primary'
          : 'text-accent-red';

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 64 64" className="w-14 h-14 -rotate-90">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${(score / 100) * 175.93} 175.93`}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-mono font-bold tabular-nums ${color}`}>
          {score}
        </span>
      </div>
      <VerdictBadge verdict={verdict} />
    </div>
  );
};

export const PaymentPage: React.FC = () => {
  const [step, setStep] = useState<PaymentStep>('entry');
  const [vpa, setVpa] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);

  const handleLookup = () => {
    setError('');
    if (!vpa.includes('@')) {
      setError('Enter a valid UPI VPA (e.g. name@bank)');
      return;
    }
    const amountVal = parseFloat(amountStr) || 0;
    if (amountVal <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setDraft(derivePayment(vpa, amountVal, note));
    setStep('confirm');
  };

  const handleEvaluate = () => {
    if (!draft) return;
    if (draft.verdict === 'BLOCK') {
      setStep('failed');
      return;
    }
    setStep('pin');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    if (pin === '1234') {
      setStep('success');
    } else {
      setStep('failed');
    }
  };

  const handleReset = () => {
    setStep('entry');
    setVpa('');
    setAmountStr('');
    setNote('');
    setPin('');
    setDraft(null);
    setError('');
  };

  if (!draft) {
    // ── Entry Step ──
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-bold text-bone">Send Money</h1>
        <Card className="space-y-5">
          <Badge tone="neutral" className="ml-auto">UI preview</Badge>

          <Input
            id="receiver-vpa"
            label="Receiver UPI VPA"
            value={vpa}
            onChange={(e) => setVpa(e.target.value)}
            placeholder="name@bank"
            autoComplete="off"
            error={error}
            hint="Use the handle exactly as shown by the receiver."
            className="font-mono"
          />

          <Input
            id="payment-amount"
            label="Amount (₹)"
            type="number"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            min="1"
            step="0.01"
          />

          <Input
            id="payment-note"
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 50))}
            placeholder="Optional note"
            maxLength={50}
            hint={`${note.length}/50 characters`}
          />

          <Button variant="primary" size="full" icon={ArrowRight} onClick={handleLookup}>
            Verify Receiver
          </Button>
        </Card>
      </div>
    );
  }

  const receiverName = draft.label;
  const receiverVpa = draft.vpa;
  const isTyposquat = receiverVpa === 'bob@oksdi';
  const isPass = draft.verdict === 'PASS';
  const isWarn = draft.verdict === 'WARN';
  const isChallenge = draft.verdict === 'CHALLENGE';
  const safeVerdict = (draft.verdict === 'REFUNDED' ? 'PASS' : draft.verdict) as Exclude<Verdict, 'REFUNDED'>;

  // ── Confirm Step ──
  if (step === 'confirm') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-bold text-bone">Confirm Payment</h1>

        <Card variant={isTyposquat ? 'warn' : 'default'} className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={receiverName} size="lg" status="online" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-normal text-bone">{receiverName}</p>
              <p className="truncate font-mono text-[10px] text-bone-muted">{receiverVpa}</p>
              <p className="mt-1 text-[10px] text-bone-muted">
                {bankByVpa[receiverVpa] ?? 'SPYDE partner network'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-bone-muted">You are paying</p>
            <p className="mt-1 font-mono text-2xl font-normal text-bone">
              {formatRupees(draft.amount)}
            </p>
          </div>

          <RiskGauge score={draft.riskScore} verdict={safeVerdict} />

          {draft.signals.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              {draft.signals.map((signal) => (
                <div key={signal.label} className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-accent-yellow mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-bone">{signal.label}</p>
                    <p className="text-[10px] text-bone-muted">{signal.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Button variant="primary" size="full" icon={ShieldCheck} onClick={handleEvaluate}>
              Check with SPYDE
            </Button>
            <Button variant="ghost" size="full" onClick={() => setStep('entry')}>
              Edit Details
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── PIN Step ──
  if (step === 'pin') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-bold text-bone">Enter UPI PIN</h1>

        <Card className="overflow-hidden">
          <div className="text-center py-4">
            <p className="text-bone-muted text-xs">Paying {formatRupees(draft.amount)} to {receiverName}</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4 pt-4 border-t border-white/5">
            <Input
              id="upi-pin"
              label="4-digit UPI PIN"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="font-mono"
            />

            <div className="space-y-2">
              {isPass && (
                <Button variant="safe" size="full" icon={KeyRound} type="submit">
                  Continue to PIN
                </Button>
              )}
              {isWarn && (
                <Button variant="challenge" size="full" icon={ArrowRight} type="submit">
                  Proceed Anyway
                </Button>
              )}
              {isChallenge && (
                <>
                  <Button
                    variant="challenge"
                    size="full"
                    icon={ShieldCheck}
                    type="button"
                    onClick={() => setHandoffOpen(true)}
                  >
                    Verify Receiver Identity
                  </Button>
                  <Button
                    variant="outline"
                    size="full"
                    type="submit"
                  >
                    Proceed Without Verification
                  </Button>
                </>
              )}
              {draft.verdict === 'BLOCK' && (
                <Button variant="ghost" size="full" type="button" onClick={handleReset}>
                  Go Back to Home
                </Button>
              )}
              {!isPass && draft.verdict !== 'BLOCK' && (
                <Button variant="ghost" size="full" type="button" onClick={() => setStep('confirm')}>
                  Go Back
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Liveness Handoff Modal */}
        {handoffOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <Card className="w-full max-w-sm p-5 space-y-4">
              <h3 className="text-bone font-semibold">Receiver Verification</h3>
              <p className="text-bone-muted text-xs">
                A liveness challenge has been sent to the receiver. Payment will be held in escrow
                until they complete biometric verification.
              </p>
              <Button
                variant="challenge"
                size="full"
                onClick={() => {
                  setHandoffOpen(false);
                  setStep('pin');
                }}
              >
                Acknowledge Handoff
              </Button>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ── Success Step ──
  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card variant="safe" className="text-center p-6">
          <CheckCircle2 className="w-16 h-16 text-accent-green mx-auto" />
          <VerdictBadge verdict={draft.verdict} />
          <h2 className="mt-4 text-xl font-bold text-bone">Payment Successful</h2>
          <p className="mt-2 text-sm text-bone-muted">
            {formatRupees(draft.amount)} paid to {receiverName}
          </p>
        </Card>

        <div className="space-y-2">
          <Button variant="outline" size="full" icon={ChevronRight}>
            View Certificate
          </Button>
          <Button variant="safe" size="full" onClick={handleReset}>
            Done
          </Button>
          <Button variant="ghost" size="full" icon={RotateCcw} onClick={handleReset}>
            Pay Again
          </Button>
        </div>
      </div>
    );
  }

  // ── Failed Step ──
  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card variant="danger" className="p-6 text-center">
        <XCircle className="w-16 h-16 text-accent-red mx-auto" />
        <Badge tone="danger">Failed</Badge>
        <h2 className="mt-4 text-xl font-bold text-bone">Payment Not Completed</h2>
        <p className="mt-2 text-sm text-bone-muted">
          {draft.verdict === 'BLOCK'
            ? 'This transaction was blocked due to high fraud risk. No funds were moved.'
            : 'The payment could not be settled. No funds were moved.'}
        </p>
      </Card>

      {draft.verdict === 'BLOCK' && draft.signals.length > 0 && (
        <Card variant="danger" className="p-5">
          <p className="text-[10px] uppercase tracking-wider text-accent-red font-bold">Risk Signals</p>
          <div className="mt-3 space-y-2">
            {draft.signals.map((signal) => (
              <div key={signal.label} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-accent-red mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-bone">{signal.label}</p>
                  <p className="text-[10px] text-bone-muted">{signal.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {draft.verdict !== 'BLOCK' && (
          <Button
            variant="primary"
            size="full"
            onClick={() => {
              setPin('');
              setStep('pin');
            }}
          >
            Try Again
          </Button>
        )}
        <Button variant="ghost" size="full" onClick={handleReset}>
          Go Home
        </Button>
      </div>
    </div>
  );
};