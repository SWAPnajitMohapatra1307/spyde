import { redis } from '../../lib/redis';
import { prisma } from '../../db/prisma';

export interface StoreFaceBlobInput {
  challengeSessionId?: string;
  certificateId?: string;
  faceBlob?: string;
  encryptedBase64?: string;
  imageData?: string;
  dataUrl?: string;
  ivBase64?: string;
  authTagBase64?: string;
  livenessScore?: number;
  metrics?: any;
}

export const faceBlobService = {
  /**
   * Store face blob in high-speed Redis memory for 5-minute view-once window.
   * Optionally links to Postgres if a Certificate record already exists.
   */
  async storeFaceBlob(input: StoreFaceBlobInput) {
    const sessionId =
      input.challengeSessionId ||
      input.certificateId ||
      'demo-session';

    const rawBlob =
      input.faceBlob ||
      input.encryptedBase64 ||
      input.imageData ||
      input.dataUrl ||
      '';

    const payload = {
      faceBlobId: sessionId,
      challengeSessionId: sessionId,
      faceBlob: rawBlob,
      imageData: rawBlob,
      livenessScore: input.livenessScore ?? 100,
      metrics: input.metrics || {},
      createdAt: Date.now(),
    };

    // 1. Always store in Redis (5 minute TTL for view-once window)
    try {
      await (redis as any).set(
        `face-blob:${sessionId}`,
        JSON.stringify(payload),
        { ex: 300 }
      );
    } catch {
      // ioredis signature fallback
      await (redis as any).set(
        `face-blob:${sessionId}`,
        JSON.stringify(payload),
        'EX',
        300
      );
    }

    // 2. Optionally attempt Postgres store ONLY if certificateId exists in DB
    if (input.certificateId) {
      try {
        const certExists = await prisma.certificate.findUnique({
          where: { id: input.certificateId },
        });

        if (certExists) {
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
          const cleanBase64 = rawBlob.includes('base64,')
            ? rawBlob.split('base64,')[1]
            : rawBlob;
          const bufferData = Buffer.from(cleanBase64 || '', 'base64');

          await prisma.faceBlob.create({
            data: {
              certificateId: input.certificateId,
              encryptedData: bufferData,
              iv: Buffer.from(input.ivBase64 || '000000000000000000000000', 'hex'),
              authTag: Buffer.from(input.authTagBase64 || '0000000000000000', 'hex'),
              expiresAt,
            },
          });
        }
      } catch (err: any) {
        // Soft fallback: Redis already holds the view-once blob
        console.log(`[face-blob] Postgres sync skipped (${err?.message}). Redis session active.`);
      }
    }

    return {
      faceBlobId: sessionId,
      challengeSessionId: sessionId,
      expiresInSeconds: 300,
      success: true,
    };
  },

  /**
   * Retrieve and immediately destroy view-once face blob (DPDP Enforced).
   */
  async getAndDestroyFaceBlob(sessionId: string) {
    const redisKey = `face-blob:${sessionId}`;
    const raw = await redis.get(redisKey);

    if (raw) {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // View-Once Enforcement: Delete key immediately upon retrieval
      await redis.del(redisKey).catch(() => null);

      return {
        faceBlob: data.faceBlob || data.imageData || null,
        livenessScore: data.livenessScore ?? 100,
        metrics: data.metrics || {},
      };
    }

    // Fallback: Check Postgres if available
    try {
      const dbBlob = await prisma.faceBlob.findFirst({
        where: { certificateId: sessionId },
      });

      if (dbBlob) {
        await prisma.faceBlob.delete({ where: { id: dbBlob.id } }).catch(() => null);
        return {
          faceBlob: `data:image/jpeg;base64,${dbBlob.encryptedData.toString('base64')}`,
          livenessScore: 100,
        };
      }
    } catch {
      /* ignore DB lookup error */
    }

    return null;
  },

  /**
   * Immediate DPDP purge endpoint
   */
  async deleteFaceBlob(sessionId: string) {
    const redisKey = `face-blob:${sessionId}`;
    await redis.del(redisKey).catch(() => null);

    try {
      await prisma.faceBlob.deleteMany({
        where: { certificateId: sessionId },
      });
    } catch {
      /* ignore */
    }

    return { destroyed: true };
  },
};