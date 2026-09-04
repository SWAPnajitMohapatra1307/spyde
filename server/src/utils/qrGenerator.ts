// server/src/utils/qrGenerator.ts
import crypto from 'crypto';
import QRCode from 'qrcode';

// ─── CONFIG ──────────────────────────────────────────────
const HMAC_SECRET = process.env.QR_HMAC_SECRET || 'spyde-qr-secret-change-in-prod-!@#2025';
const QR_TTL_MS = 5 * 60 * 1000; // 5 minutes expiry

// ─── TYPES ───────────────────────────────────────────────
export interface QRPayload {
  vpa: string;
  payeeName: string;
  amount: number;
  txnId: string;
  merchantId?: string;
  timestamp: number;
  ttl: number;
}

export interface SignedQR {
  payload: QRPayload;
  signature: string;
  qrDataString: string;   // The raw string encoded IN the QR
  qrImageBase64: string;  // PNG data URI for display
}

export type TamperVerdict = 'VALID' | 'TAMPERED' | 'EXPIRED' | 'MALFORMED';

// ─── GENERATE ────────────────────────────────────────────
export async function generateSignedQR(
  vpa: string,
  payeeName: string,
  amount: number,
  txnId: string,
  merchantId?: string
): Promise<SignedQR> {
  const payload: QRPayload = {
    vpa,
    payeeName,
    amount,
    txnId,
    merchantId,
    timestamp: Date.now(),
    ttl: QR_TTL_MS,
  };

  // 1. Create deterministic string to sign (sorted keys, no whitespace)
  const signString = buildSignString(payload);

  // 2. HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(signString)
    .digest('hex');

  // 3. Pack into QR data: base64(payload)::signature
  const qrDataString = `${Buffer.from(JSON.stringify(payload)).toString('base64')}::${signature}`;

  // 4. Generate PNG image
  const qrImageBase64 = await QRCode.toDataURL(qrDataString, {
    width: 400,
    margin: 2,
    color: {
      dark: '#1a1a2e',   // SPYDE dark theme
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H', // High correction = survives partial tampering/sticker overlap
  });

  return { payload, signature, qrDataString, qrImageBase64 };
}

// ─── VERIFY (Server-Side) ────────────────────────────────
export function verifyQR(qrDataString: string): {
  verdict: TamperVerdict;
  payload?: QRPayload;
  reason?: string;
} {
  try {
    // 1. Split data::signature
    const parts = qrDataString.split('::');
    if (parts.length !== 2) {
      return { verdict: 'MALFORMED', reason: 'Missing signature delimiter' };
    }

    const [encodedPayload, providedSig] = parts;

    // 2. Decode payload
    let payload: QRPayload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf-8'));
    } catch {
      return { verdict: 'MALFORMED', reason: 'Payload is not valid base64 JSON' };
    }

    // 3. Check expiry
    if (Date.now() - payload.timestamp > payload.ttl) {
      return { verdict: 'EXPIRED', reason: `QR expired ${Math.round((Date.now() - payload.timestamp - payload.ttl) / 1000)}s ago` };
    }

    // 4. Recompute HMAC and compare
    const signString = buildSignString(payload);
    const expectedSig = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(signString)
      .digest('hex');

    // Timing-safe comparison (prevents timing attacks)
    if (!crypto.timingSafeEqual(Buffer.from(providedSig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return { verdict: 'TAMPERED', reason: 'HMAC signature mismatch — QR data was altered' };
    }

    return { verdict: 'VALID', payload };
  } catch (err: any) {
    return { verdict: 'MALFORMED', reason: err.message };
  }
}

// ─── HELPERS ─────────────────────────────────────────────
function buildSignString(p: QRPayload): string {
  // Deterministic: always same order regardless of JSON key order
  return `${p.vpa}|${p.payeeName}|${p.amount}|${p.txnId}|${p.merchantId || ''}|${p.timestamp}|${p.ttl}`;
}