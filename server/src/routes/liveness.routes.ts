import { Router } from 'express';

import { authenticateToken } from '../middleware/auth';
import {
  livenessChallengeSchema,
  livenessVerifySchema,
} from '../schemas/liveness.schema';
import { livenessService } from '../services/liveness/index';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * POST /api/liveness/challenge
 * Initiates a 4-digit liveness challenge with 60s TTL for an escrowed transaction.
 */
router.post(
  '/challenge',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const parsed = livenessChallengeSchema.parse(req.body);
    const userId = (req as unknown as { user?: { id: string } }).user?.id ?? 'usr_sandbox_default';

    console.log(`[INFO] Liveness challenge requested for transaction: ${parsed.transactionId} by userId: ${userId}`);

    const result = await livenessService.generateChallenge(userId, parsed);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (req as unknown as { requestId?: string }).requestId ?? 'req_unknown',
      },
    });
  })
);

/**
 * POST /api/liveness/verify
 * Validates challenge code and client liveness score. Atomically releases escrow on PASS.
 */
router.post(
  '/verify',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const parsed = livenessVerifySchema.parse(req.body);
    const userId = (req as unknown as { user?: { id: string } }).user?.id ?? 'usr_sandbox_default';

    console.log(`[INFO] Liveness verify submitted for challenge: ${parsed.challengeId}`);

    const result = await livenessService.verifyLiveness(userId, parsed);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (req as unknown as { requestId?: string }).requestId ?? 'req_unknown',
      },
    });
  })
);

/**
 * GET /api/liveness/pending
 * Retrieves active pending liveness sessions for the authenticated user.
 */
router.get(
  '/pending',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id ?? 'usr_sandbox_default';
    console.log(`[INFO] Pending liveness sessions requested for userId: ${userId}`);

    const sessions = await livenessService.getPendingSessions(userId);

    res.status(200).json({
      success: true,
      data: {
        pendingCount: sessions.length,
        sessions,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (req as unknown as { requestId?: string }).requestId ?? 'req_unknown',
      },
    });
  })
);

export default router;