import { create } from 'zustand';
import { PaymentVerdict, PaymentSignal } from '@/components/payment/RiskVerdictCard';

export type PaymentStep =
  | 'IDLE'
  | 'VPA_ENTRY'
  | 'SAFE_CIRCLE_CHECK'
  | 'CONFIRM'
  | 'EVALUATING'
  | 'FRICTION_PASS'
  | 'FRICTION_WARN'
  | 'FRICTION_CHALLENGE'
  | 'FRICTION_BLOCK'
  | 'PIN_ENTRY'
  | 'PROCESSING'
  | 'LIVENESS_REDIRECT'
  | 'AWAITING_RECEIVER'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export interface PaymentState {
  step: PaymentStep;
  vpa: string;
  receiverName: string | null;
  receiverBank: string | null;
  isSafeCircle: boolean;
  amount: number | null;
  note: string;
  transactionId: string | null;
  challengeSessionId: string | null;
  verdict: PaymentVerdict | null;
  riskScore: number | null;
  signals: PaymentSignal[];
  pin: string;
  certificateId: string | null;
  failureReason: string | null;

  // Actions
  setStep: (step: PaymentStep) => void;
  setVpa: (vpa: string) => void;
  setAmount: (amount: number) => void;
  setNote: (note: string) => void;
  setReceiverDetails: (details: {
    vpa: string;
    name?: string | null;
    bank?: string | null;
    riskScore?: number | null;
    isSafeCircle?: boolean;
  }) => void;
  setTransactionId: (transactionId: string) => void;
  setChallengeSessionId: (challengeSessionId: string | null) => void;
  setTransaction: (data: {
    transactionId: string;
    verdict: PaymentVerdict;
    signals?: PaymentSignal[];
    riskScore?: number;
    challengeSessionId?: string | null;
  }) => void;
  setVerdict: (verdict: PaymentVerdict, signals?: PaymentSignal[], riskScore?: number) => void;
  setPin: (pin: string) => void;
  setCertificateId: (certificateId: string) => void;
  setFailureReason: (reason: string) => void;
  reset: () => void;
}

const initialState = {
  step: 'IDLE' as PaymentStep,
  vpa: '',
  receiverName: null,
  receiverBank: null,
  isSafeCircle: false,
  amount: null,
  note: '',
  transactionId: null,
  challengeSessionId: null,
  verdict: null,
  riskScore: null,
  signals: [],
  pin: '',
  certificateId: null,
  failureReason: null,
};

export const usePaymentStore = create<PaymentState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setVpa: (vpa) => set({ vpa }),
  setAmount: (amount) => set({ amount }),
  setNote: (note) => set({ note }),

  setReceiverDetails: ({ vpa, name, bank, riskScore, isSafeCircle }) =>
    set((state) => ({
      vpa,
      receiverName: name ?? state.receiverName,
      receiverBank: bank ?? state.receiverBank,
      riskScore: typeof riskScore === 'number' ? riskScore : state.riskScore,
      isSafeCircle: typeof isSafeCircle === 'boolean' ? isSafeCircle : state.isSafeCircle,
    })),

  setTransactionId: (transactionId) => set({ transactionId }),
  setChallengeSessionId: (challengeSessionId) => set({ challengeSessionId }),

  setTransaction: ({ transactionId, verdict, signals = [], riskScore, challengeSessionId }) =>
    set((state) => ({
      transactionId,
      verdict,
      signals,
      riskScore: typeof riskScore === 'number' ? riskScore : state.riskScore,
      challengeSessionId: challengeSessionId ?? state.challengeSessionId,
    })),

  setVerdict: (verdict, signals = [], riskScore) =>
    set((state) => ({
      verdict,
      signals,
      riskScore: typeof riskScore === 'number' ? riskScore : state.riskScore,
    })),

  setPin: (pin) => set({ pin }),
  setCertificateId: (certificateId) => set({ certificateId }),
  setFailureReason: (failureReason) => set({ failureReason }),

  reset: () => set(initialState),
}));