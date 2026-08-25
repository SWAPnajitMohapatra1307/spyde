import { calculateLevenshteinDistance } from './levenshtein';

export interface TypoDetectionResult {
  isTypo: boolean;
  score: number;
  matchedGenuineHandle?: string;
  reason?: string;
}

const GENUINE_BANK_HANDLES = [
  'okhdfcbank',
  'okhdfc',
  'okicici',
  'oksbi',
  'okaxis',
  'paytm',
  'ybl',
  'sbi',
  'hdfcbank',
  'icici',
  'axisbank',
];

/**
 * Evaluates whether a target VPA suffix or handle attempts to spoof a known authentic banking handle.
 */
export function detectTypo(targetVpa: string): TypoDetectionResult {
  const parts = targetVpa.toLowerCase().split('@');
  if (parts.length !== 2) {
    return { isTypo: false, score: 0 };
  }

  const [username, handle] = parts;

  // Exact match to known genuine handles is safe
  if (GENUINE_BANK_HANDLES.includes(handle)) {
    // Check if the username itself is attempting to spoof a bank brand (e.g. sbi_support, hdfc_service)
    const spoofedPrefixes = ['sbi', 'hdfc', 'icici', 'axis', 'paytm', 'phonepe', 'gpay', 'support', 'kyc'];
    for (const prefix of spoofedPrefixes) {
      if (username.startsWith(prefix) && !username.includes('.')) {
        return {
          isTypo: true,
          score: 25,
          matchedGenuineHandle: prefix,
          reason: 'Username starts with financial brand keyword (' + prefix + ')',
        };
      }
    }
    return { isTypo: false, score: 0 };
  }

  // Check handle similarity against genuine handles
  for (const genuine of GENUINE_BANK_HANDLES) {
    const distance = calculateLevenshteinDistance(handle, genuine);
    // Distance of 1 or 2 on short bank handles is a strong indicator of typosquatting
    if (distance > 0 && distance <= 2 && Math.abs(handle.length - genuine.length) <= 2) {
      return {
        isTypo: true,
        score: 25,
        matchedGenuineHandle: genuine,
        reason: 'Handle @' + handle + ' is a typosquat of legitimate bank handle @' + genuine + ' (distance: ' + distance + ')',
      };
    }
  }

  return { isTypo: false, score: 0 };
}