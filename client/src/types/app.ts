// client/src/types/app.ts

// --- API Wrapper Types ---
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// --- User & Auth ---
export interface BankAccount {
  id: string;
  ifsc: string;
  accountNumberMasked: string;
  accountType: 'SAVINGS' | 'CURRENT';
  balancePaisa: string;
  balanceRupees: number;
}

export interface UpiHandle {
  id: string;
  vpa: string;
  isPrimary: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vpa?: string;
  upiHandle?: string;
  riskScore: number;
  isAdmin: boolean;
  role?: string;
  createdAt?: string;
  bankAccounts: BankAccount[];
  upiHandles: UpiHandle[];
}

export interface AuthSessionData {
  user: {
    id: string;
    name: string;
    phone: string;
    vpa?: string;
    isAdmin: boolean;
  };
  accessToken: string;
  refreshToken?: string;
}

// --- Safe Circle ---
export interface SafeCircleContact {
  id: string;
  contactVpa: string;
  contactName: string;
  addedAt: string;
  hasAnomaly: boolean;
}

export interface SafeCircleListResponse {
  contacts: SafeCircleContact[];
  total: number;
}

// Fully loaded safe circle properties for robust dashboard rendering
export interface SafeContact {
  id: string;
  name: string;
  vpa: string;
  bank: string;
  addedAt: string;
  isVerified: boolean;
  nickname: string;
  phone: string;
  addedDate: string;
  complaints: number;
}

// --- Risk & Payment State Machine ---
export type RiskVerdict = 'PASS' | 'WARN' | 'CHALLENGE' | 'BLOCK' | 'REFUNDED';

// Legacy alias
export type Verdict = RiskVerdict;

export type PaymentStep =
  | 'IDLE'
  | 'VPA_ENTRY'
  | 'VPA_LOOKUP'
  | 'CONFIRM'
  | 'SAFE_CIRCLE_CHECK'
  | 'RISK_EVAL'
  | 'EVALUATING'
  | 'FRICTION_PASS'
  | 'FRICTION_WARN'
  | 'FRICTION_CHALLENGE'
  | 'FRICTION_BLOCK'
  | 'LIVENESS_REDIRECT'
  | 'AWAITING_RECEIVER'
  | 'PIN_ENTRY'
  | 'SETTLING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

// Application view identifier for legacy UI navigation
export type AppView =
  | 'home'
  | 'payment'
  | 'history'
  | 'profile'
  | 'circle'
  | 'qr'
  | 'admin'
  | 'notifications'
  | 'complaints';

export interface RiskSignal {
  type: string;
  weight: number;
  reason: string;
  // optional helpers for client rendering
  code?: string;
  label?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detail?: string;
}

export interface VpaResolution {
  vpa: string;
  name: string;
  bank: string;
  isRegistered: boolean;
  riskVerdict: RiskVerdict;
  riskScore: number;
  signals: RiskSignal[];
  isSafeCircle?: boolean;
}

export interface PaymentInitiatePayload {
  receiverVpa: string;
  amount: number;
  note?: string;
}

export interface PaymentInitResult {
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'BLOCKED' | 'FAILED';
  verdict: RiskVerdict;
  riskScore: number;
  signals: RiskSignal[];
  amountRupees: number;
  challengeSessionId?: string;
  aiExplanation?: string;
}

export interface PaymentConfirmPayload {
  transactionId: string;
  pin: string; // Strictly "1234"
}

export interface PaymentConfirmResult {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED';
  amountRupees: number;
  receiverVpa: string;
  timestamp: string;
  certificateId?: string;
  message?: string;
}

// Payment draft — used by legacy PaymentPage UI
export interface PaymentDraft {
  vpa: string;
  label: string;
  bank: string;
  amount: number;
  note: string;
  riskScore: number;
  verdict: Verdict;
  isSafeCircle: boolean;
  isTyposquat: boolean;
  signals: Array<{ label: string; detail: string }>;
  certificateId?: string;
  // Legacy fields used by PaymentPage
  receiverVpa?: string;
  receiverName?: string;
  amountPaisa?: number;
}

export interface Transaction {
  id: string;
  senderId?: string;
  receiverVpa?: string;
  receiverName?: string;
  amountRupees?: number;
  status?: 'SUCCESS' | 'PENDING' | 'BLOCKED' | 'FAILED';
  riskVerdict?: RiskVerdict;
  riskScore?: number;
  createdAt?: string;
  certificateId?: string;
  isSender?: boolean;
  note?: string;
  signals?: RiskSignal[];

  // Compatibility aliases used by history/demo modules
  amount?: number;
  verdict?: RiskVerdict;
  label?: string;
  vpa?: string;
  amountPaisa?: number;
  date?: string;
  time?: string;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

// --- Liveness & Verification ---
export interface LivenessChallengeResponse {
  challengeId: string;
  challengeCode: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface LivenessVerifyPayload {
  challengeId: string;
  challengeCode: string;
  clientScore: number;
  blinkCount: number;
  faceEmbeddingHash: string;
}

export interface LivenessVerifyResult {
  sessionId: string;
  verdict: 'PASS' | 'FAIL';
  totalScore: number;
  breakdown: {
    clientScore: number;
    serverChallengeBonus: number;
  };
  livenessToken?: string;
  message: string;
}

export interface PendingEscrowItem {
  id: string;
  transactionId: string;
  senderName: string;
  senderVpa: string;
  amountRupees: number;
  expiresAt: string;
  ttlSeconds: number;
}

// --- QR & Threats ---
export type QrVerdictType = 'VERIFIED' | 'UNVERIFIED' | 'TAMPERED';

export interface QrVerifyPayload {
  qrPayload: string;
  deviceLat?: number;
  deviceLng?: number;
}

export interface QrVerifyResult {
  verdict: QrVerdictType;
  merchant?: {
    businessName: string;
    vpa: string;
    isVerified: boolean;
    businessType?: string;
  };
  geoAnalysis?: {
    distanceMeters: number;
    allowedRadiusMeters: number;
    inRange: boolean;
  };
  alert?: {
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    explanation: string;
  };
}

// --- Certificates & Face Blob ---
export interface Certificate {
  id: string;
  transactionId: string;
  senderVpa: string;
  receiverVpa: string;
  amountRupees: number;
  riskVerdict: RiskVerdict;
  riskScore: number;
  payloadHash: string;
  jwtSignature: string;
  livenessVerified: boolean;
  settledAt: string;
  faceBlobId?: string | null;
  isFaceViewed?: boolean;
}

export interface FaceBlobUploadPayload {
  certificateId: string;
  encryptedBase64: string;
  ivBase64: string;
  authTagBase64: string;
}

export interface FaceBlobResponse {
  faceBlobId: string;
  encryptedBase64: string;
  ivBase64: string;
  authTagBase64: string;
  viewCountdownSeconds: number;
  autoDeleteInSeconds: number;
  warning: string;
}

// --- Complaints & Dispute Resolution ---
export type ComplaintCategory =
  | 'FRAUD'
  | 'IMPERSONATION'
  | 'SPAM'
  | 'HARASSMENT'
  | 'QR_TAMPERING'
  | 'OTHER';

export type ComplaintQualityTier = 'BASIC' | 'VERIFIED' | 'EVIDENCE';

export interface ComplaintCreatePayload {
  targetVpa: string;
  category: ComplaintCategory;
  description: string;
  qualityTier?: ComplaintQualityTier;
  transactionId?: string;
}

export interface Complaint {
  id: string;
  targetVpa: string;
  category: ComplaintCategory;
  description: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  reporterTrust?: 'LOW' | 'MEDIUM' | 'HIGH';
}

// --- Admin Shield Console ---
export interface AdminStats {
  overview: {
    totalUsers: number;
    totalTransactions: number;
    volumePaisa: number;
    blocked: number;
  };
  riskMetrics: {
    passCount: number;
    warnCount: number;
    challengeCount: number;
    blockCount: number;
  };
  complaints: {
    totalFiled: number;
    pendingReview: number;
    verifiedFraud: number;
    rejected: number;
  };
}

export interface TopFlaggedVpa {
  vpa: string;
  complaintCount: number;
  primaryCategory: ComplaintCategory;
  calculatedRiskScore: number;
  blockedAttempts: number;
}