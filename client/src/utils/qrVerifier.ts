// client/src/utils/qrVerifier.ts

export interface ClientQRCheck {
  ok: boolean;
  reason?: string;
  parsed?: {
    vpa: string;
    payeeName: string;
    amount: number;
    txnId: string;
    merchantId?: string;
    timestamp: number;
    ttl: number;
  };
}

/**
 * Lightweight client-side pre-validation.
 * Does NOT verify the HMAC (secret lives on server).
 * Catches: malformed data, expired QRs, missing fields.
 */
export function clientPreCheckQR(rawScanned: string): ClientQRCheck {
  try {
    // 1. Must contain signature delimiter
    if (!rawScanned.includes('::')) {
      return { ok: false, reason: 'Not a SPYDE QR — missing security signature' };
    }

    const [encoded, sig] = rawScanned.split('::');

    if (!encoded || !sig || sig.length !== 64) {
      return { ok: false, reason: 'QR signature is malformed' };
    }

    // 2. Decode payload
    let payload: any;
    try {
      payload = JSON.parse(atob(encoded));
    } catch {
      return { ok: false, reason: 'QR payload is corrupted or not base64' };
    }

    // 3. Validate required fields
    const required = ['vpa', 'payeeName', 'amount', 'txnId', 'timestamp', 'ttl'];
    for (const key of required) {
      if (payload[key] === undefined || payload[key] === null) {
        return { ok: false, reason: `Missing required field: ${key}` };
      }
    }

    // 4. Check expiry locally
    if (Date.now() - payload.timestamp > payload.ttl) {
      const expiredAgo = Math.round((Date.now() - payload.timestamp - payload.ttl) / 1000);
      return { ok: false, reason: `QR expired ${expiredAgo}s ago — request a fresh one` };
    }

    // 5. Sanity checks
    if (typeof payload.amount !== 'number' || payload.amount <= 0) {
      return { ok: false, reason: 'Invalid payment amount' };
    }

    if (!payload.vpa.includes('@')) {
      return { ok: false, reason: 'Invalid VPA format' };
    }

    return { ok: true, parsed: payload };
  } catch (err: any) {
    return { ok: false, reason: `Parse error: ${err.message}` };
  }
}