import crypto from 'node:crypto';

import { prisma } from '../../db/prisma';
import { signCertificate, verifyCertificateJwt } from '../../utils/jwt';
import type { 
  CertificateResponse, 
  CertificateVerifyRequest, 
  CertificateVerifyResponse, 
  CertificatePayload 
} from '../../types/b2';

export class CertificateService {
  async generateCertificate(
    transactionId: string,
    payloadData: CertificatePayload
  ): Promise<CertificateResponse> {
    const canonicalPayload = JSON.stringify(payloadData, Object.keys(payloadData).sort());
    const payloadHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
    const jwtSignature = signCertificate(payloadHash, transactionId);

    const certificate = await prisma.certificate.create({
      data: {
        transactionId,
        payloadHash,
        jwtSignature,
        payload: payloadData as unknown as object,
      },
    });

    console.log('[INFO] Certificate generated: ' + certificate.id);

    return {
      certificateId: certificate.id,
      transactionId: certificate.transactionId,
      payloadHash: certificate.payloadHash,
      jwtSignature: certificate.jwtSignature,
      payload: payloadData,
      hasViewOnceFace: false,
      faceBlobId: null,
      isFaceViewed: false,
      issuedAt: certificate.issuedAt.toISOString(),
    };
  }

  async getCertificate(certificateId: string): Promise<CertificateResponse> {
    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { faceBlob: true },
    });

    if (!cert) {
      const error = new Error('Certificate not found');
      (error as unknown as { code: string; statusCode: number }).code = 'NOT_FOUND';
      (error as unknown as { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    return {
      certificateId: cert.id,
      transactionId: cert.transactionId,
      payloadHash: cert.payloadHash,
      jwtSignature: cert.jwtSignature,
      payload: cert.payload as unknown as CertificatePayload,
      hasViewOnceFace: !!cert.faceBlobId,
      faceBlobId: cert.faceBlobId,
      isFaceViewed: cert.faceBlob?.isViewed || false,
      issuedAt: cert.issuedAt.toISOString(),
    };
  }

  async verifyCertificate(payload: CertificateVerifyRequest): Promise<CertificateVerifyResponse> {
    const { certificateId, payloadHash } = payload;

    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!cert) {
      const error = new Error('Certificate not found');
      (error as unknown as { code: string; statusCode: number }).code = 'NOT_FOUND';
      (error as unknown as { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    let isValid = false;
    try {
      const decodedJwt = verifyCertificateJwt(cert.jwtSignature);
      isValid = decodedJwt.hash === payloadHash && cert.payloadHash === payloadHash;
    } catch {
      isValid = false;
    }

    return {
      isValid,
      issuedAt: cert.issuedAt.toISOString(),
      verifiedBy: 'SPYDE Trust Authority v1.0',
      message: isValid
        ? 'Certificate signature matches ledger state. Content is tamper-proof.'
        : 'Certificate signature or hash mismatch. Tampering detected.',
    };
  }
}

export const certificateService = new CertificateService();
