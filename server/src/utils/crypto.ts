import crypto from 'crypto';

export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function canonicalJsonHash(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const canonicalObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    canonicalObj[key] = payload[key];
  }
  return sha256(JSON.stringify(canonicalObj));
}

export function generateNumericCode(length = 4): string {
  let result = '';
  const digits = '0123456789';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += digits[bytes[i] % 10];
  }
  return result;
}
