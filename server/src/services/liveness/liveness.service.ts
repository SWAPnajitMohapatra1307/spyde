import { prisma } from '../../db/prisma';
import type {
  LivenessChallengeRequest,
  LivenessChallengeResponse,
  LivenessVerifyRequest,
  LivenessVerifyResponse,
} from '../../types/b2';

interface LivenessSessionWithTransaction {
  id: string;
  transactionId: string | null;
  expiresAt: Date;
  transaction: {
    id: string;
    amountPaisa: bigint;
    receiverVpa: string;
    createdAt: Date;
  } | null;
}

export class LivenessService {
  /**
   * Generates a 4-digit challenge code with 60-second TTL.
   * Persists the challenge to the LivenessSession table.
   */
  async generateChallenge(
    userId: string,
    payload: LivenessChallengeRequest
  ): Promise<LivenessChallengeResponse> {
    const challengeCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 60 * 1000);

    const session = await prisma.livenessSession.create({
      data: {
        userId,
        transactionId: payload.transactionId,
        challengeCode,
        expiresAt,
        verdict: 'FAIL',
      },
    });

    console.log(`[INFO] Liveness challenge created. Session: ${session.id}, Expires: ${expiresAt.toISOString()}`);

    return {
      challengeId: session.id,
      challengeCode,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: 60,
    };
  }

  /**
   * Verifies challenge code and client computer-vision liveness score.
   * On PASS (score >= 75), atomically updates session and marks transaction SUCCESS.
   * On FAIL, marks session and transaction as FAILED.
   */
  async verifyLiveness(
    _userId: string,
    payload: LivenessVerifyRequest
  ): Promise<LivenessVerifyResponse> {
    const { challengeId, challengeCode, clientScore, faceEmbeddingHash } = payload;
    console.log(`[SECURITY] Verifying liveness for session: ${challengeId}, clientScore: ${clientScore}`);

    const session = await prisma.livenessSession.findUnique({
      where: { id: challengeId },
    });

    if (!session) {
      const error = new Error('Liveness session not found');
      (error as unknown as { code: string; statusCode: number }).code = 'NOT_FOUND';
      (error as unknown as { statusCode: number }).statusCode = 404;
      throw error;
    }

    if (new Date() > session.expiresAt) {
      await prisma.livenessSession.update({
        where: { id: challengeId },
        data: { verdict: 'EXPIRED' },
      });
      console.warn(`[WARN] Liveness challenge expired at ${session.expiresAt.toISOString()}`);
      const error = new Error('Liveness challenge expired');
      (error as unknown as { code: string; statusCode: number }).code = 'GONE';
      (error as unknown as { statusCode: number }).statusCode = 410;
      throw error;
    }

    const codeMatches = session.challengeCode === challengeCode;
    const serverChallengeBonus = codeMatches ? 25 : 0;
    const totalScore = clientScore + serverChallengeBonus;
    const isPass = totalScore >= 75 && codeMatches;

    // Atomic transaction: update session and update linked transaction status
    const [updatedSession] = await prisma.$transaction([
      prisma.livenessSession.update({
        where: { id: challengeId },
        data: {
          clientScore,
          serverScore: serverChallengeBonus,
          totalScore,
          verdict: isPass ? 'PASS' : 'FAIL',
          faceEmbeddingHash,
        },
      }),
      ...(session.transactionId
        ? [
            prisma.simTransaction.update({
              where: { id: session.transactionId },
              data: {
                status: isPass ? 'SUCCESS' : 'FAILED',
              },
            }),
          ]
        : []),
    ]);

    if (isPass) {
      console.log(`[ESCROW] Escrow released. Liveness verified for session: ${challengeId}`);
    } else {
      console.warn(`[SECURITY] Liveness failed for session: ${challengeId}. Score: ${totalScore}`);
    }

    return {
      sessionId: updatedSession.id,
      verdict: updatedSession.verdict,
      totalScore,
      breakdown: {
        clientScore,
        serverChallengeBonus,
      },
      livenessToken: `liv_token_${updatedSession.id}_authorized`,
      message: isPass
        ? 'Liveness check passed. Proceed to transaction confirmation.'
        : 'Liveness check failed. Total score below threshold of 75.',
    };
  }

  /**
   * Retrieves active, unexpired pending liveness sessions for a given user.
   */
  async getPendingSessions(userId: string) {
    console.log(`[INFO] Querying pending liveness sessions for userId: ${userId}`);

    const sessions = await prisma.livenessSession.findMany({
      where: {
        userId,
        verdict: 'FAIL',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        transaction: {
          select: {
            id: true,
            amountPaisa: true,
            receiverVpa: true,
            createdAt: true,
          },
        },
      },
    });

    return sessions.map((s: LivenessSessionWithTransaction) => ({
      challengeId: s.id,
      transactionId: s.transactionId,
      expiresAt: s.expiresAt.toISOString(),
      amountPaisa: s.transaction ? s.transaction.amountPaisa.toString() : null,
      receiverVpa: s.transaction ? s.transaction.receiverVpa : null,
    }));
  }
}

export const livenessService = new LivenessService();