import { prisma } from '../../db/prisma';
import type { 
  FaceBlobUploadRequest, 
  FaceBlobUploadResponse, 
  FaceBlobRetrieveResponse 
} from '../../types/b2';

export class FaceBlobService {
  async storeFaceBlob(payload: FaceBlobUploadRequest): Promise<FaceBlobUploadResponse> {
    const { certificateId, encryptedBase64, ivBase64, authTagBase64 } = payload;

    const encryptedData = Buffer.from(encryptedBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    if (encryptedData.length > 500 * 1024) {
      const error = new Error('Encrypted blob exceeds maximum size limit of 500KB');
      (error as unknown as { code: string }).code = 'VALIDATION_ERROR';
      throw error;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const faceBlob = await prisma.faceBlob.create({
      data: {
        certificateId,
        encryptedData,
        iv,
        authTag,
        expiresAt,
      },
    });

    await prisma.certificate.update({
      where: { id: certificateId },
      data: { faceBlobId: faceBlob.id },
    });

    console.log('[INFO] Encrypted face blob stored: ' + faceBlob.id);

    return {
      faceBlobId: faceBlob.id,
      expiresAt: expiresAt.toISOString(),
      ttlHours: 24,
      message: 'Encrypted face blob stored. Viewable once by sender.',
    };
  }

  async getAndDestroyFaceBlob(blobId: string): Promise<FaceBlobRetrieveResponse> {
    const faceBlob = await prisma.faceBlob.findUnique({
      where: { id: blobId },
    });

    if (!faceBlob) {
      const error = new Error('Face confirmation record not found');
      (error as unknown as { code: string }).code = 'NOT_FOUND';
      throw error;
    }

    if (faceBlob.isViewed || new Date() > faceBlob.expiresAt) {
      const error = new Error('This face confirmation was already viewed and has been permanently purged from server memory (DPDP Compliance).');
      (error as unknown as { code: string }).code = 'GONE';
      throw error;
    }

    await prisma.faceBlob.update({
      where: { id: blobId },
      data: { isViewed: true, viewedAt: new Date() },
    });

    setTimeout(async () => {
      try {
        await prisma.faceBlob.delete({ where: { id: blobId } });
        console.log('[INFO] Face blob permanently purged: ' + blobId);
      } catch {
        // Ignored if already deleted
      }
    }, 60000);

    return {
      faceBlobId: faceBlob.id,
      encryptedBase64: faceBlob.encryptedData.toString('base64'),
      ivBase64: faceBlob.iv.toString('base64'),
      authTagBase64: faceBlob.authTag.toString('base64'),
      viewCountdownSeconds: 10,
      autoDeleteInSeconds: 60,
      warning: 'Key and blob will be destroyed permanently after countdown.',
    };
  }
}

export const faceBlobService = new FaceBlobService();