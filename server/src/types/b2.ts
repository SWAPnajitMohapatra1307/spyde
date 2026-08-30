export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'SUCCESS' | 'FAILED' | 'BLOCKED';
export type RiskVerdict = 'PASS' | 'WARN' | 'CHALLENGE' | 'BLOCK';
export type ComplaintCategory = 'FRAUD' | 'IMPERSONATION' | 'SPAM' | 'HARASSMENT' | 'QR_TAMPERING' | 'OTHER';
export type ComplaintStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type LivenessVerdict = 'PASS' | 'FAIL' | 'EXPIRED';
export type QrVerdict = 'VERIFIED' | 'UNVERIFIED' | 'TAMPERED';

export interface ApiResponseMeta {
  timestamp: string;
  requestId: string;
}

export interface ApiResponseEnvelope<T> {
  success: true;
  data: T;
  meta: ApiResponseMeta;
}

export interface ValidationErrorDetail {
  field: string;
  issue: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationErrorDetail[] | Record<string, unknown>[];
  };
  meta: ApiResponseMeta;
}

export interface QrVerifyRequest {
  qrPayload: string;
  deviceLat: number;
  deviceLng: number;
}

export interface DecodedQrData {
  vpa: string;
  businessName: string;
  merchantCategoryCode?: string;
  currency?: string;
}

export interface QrVerifyResponse {
  verdict: QrVerdict;
  merchant: {
    businessName: string;
    vpa: string;
    businessType?: string;
    isVerified: boolean;
  };
  geoAnalysis: {
    distanceMeters: number;
    allowedRadiusMeters: number;
    inRange: boolean;
  };
  alert?: {
    severity: 'CRITICAL' | 'WARNING';
    title: string;
    explanation: string;
  };
  message?: string;
}

export interface LivenessChallengeRequest {
  transactionId: string;
}

export interface LivenessChallengeResponse {
  challengeId: string;
  challengeCode: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface LivenessVerifyRequest {
  challengeId: string;
  challengeCode: string;
  clientScore: number;
  blinkCount: number;
  faceEmbeddingHash: string;
}

export interface LivenessVerifyResponse {
  sessionId: string;
  verdict: LivenessVerdict;
  totalScore: number;
  breakdown: {
    clientScore: number;
    serverChallengeBonus: number;
  };
  livenessToken: string;
  message: string;
}

export interface CertificatePayload {
  txId: string;
  senderVpa: string;
  receiverVpa: string;
  amountPaisa: number;
  riskVerdict: RiskVerdict;
  riskScore: number;
  timestamp: string;
}

export interface CertificateResponse {
  certificateId: string;
  transactionId: string;
  payloadHash: string;
  jwtSignature: string;
  payload: CertificatePayload;
  hasViewOnceFace: boolean;
  faceBlobId: string | null;
  isFaceViewed: boolean;
  issuedAt: string;
}

export interface CertificateVerifyRequest {
  certificateId: string;
  payloadHash: string;
}

export interface CertificateVerifyResponse {
  isValid: boolean;
  issuedAt: string;
  verifiedBy: string;
  message: string;
}

export interface FaceBlobUploadRequest {
  certificateId: string;
  encryptedBase64: string;
  ivBase64: string;
  authTagBase64: string;
}

export interface FaceBlobUploadResponse {
  faceBlobId: string;
  expiresAt: string;
  ttlHours: number;
  message: string;
}

export interface FaceBlobRetrieveResponse {
  faceBlobId: string;
  encryptedBase64: string;
  ivBase64: string;
  authTagBase64: string;
  viewCountdownSeconds: number;
  autoDeleteInSeconds: number;
  warning: string;
}

export interface FileComplaintRequest {
  targetVpa: string;
  category: ComplaintCategory;
  description: string;
  evidenceUrl?: string;
  transactionId?: string;
}

export interface FileComplaintResponse {
  complaintId: string;
  targetVpa: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  createdAt: string;
  message: string;
}

export interface ComplaintStatsResponse {
  targetVpa: string;
  totalComplaints: number;
  verifiedComplaints: number;
  breakdown: Record<ComplaintCategory, number>;
  communityRiskWeight: number;
  firstReportedAt: string;
  lastReportedAt: string;
}

export interface AdminStatsResponse {
  overview: {
    totalUsers: number;
    totalTransactions: number;
    totalVolumePaisa: number;
    blockedTransactions: number;
    preventedLossPaisa: number;
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

export interface TopFlaggedMerchant {
  vpa: string;
  complaintCount: number;
  primaryCategory: ComplaintCategory;
  calculatedRiskScore: number;
  blockedAttempts: number;
  lastActive: string;
}

export interface TopFlaggedResponse {
  topFlagged: TopFlaggedMerchant[];
}

export interface ModerateComplaintRequest {
  status: ComplaintStatus;
  adminNote?: string;
}

export interface ModerateComplaintResponse {
  complaintId: string;
  status: ComplaintStatus;
  updatedAt: string;
  message: string;
}