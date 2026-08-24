import jwt from 'jsonwebtoken';

import { env } from '../config/env';

export interface CertificateJwtPayload {
  hash: string;
  transactionId: string;
  iat?: number;
  exp?: number;
}

/**
 * Signs a certificate payload hash into a JWT using HS256.
 * The resulting token serves as the signature stored in the Certificate table.
 */
export function signCertificate(
  payloadHash: string,
  transactionId: string
): string {
  return jwt.sign(
    { hash: payloadHash, transactionId },
    env.CERT_SIGNING_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '24h',
    }
  );
}

/**
 * Verifies a certificate JWT signature and returns the decoded payload.
 */
export function verifyCertificateJwt(token: string): CertificateJwtPayload {
  return jwt.verify(token, env.CERT_SIGNING_SECRET, {
    algorithms: ['HS256'],
  }) as CertificateJwtPayload;
}