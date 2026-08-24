import { Router } from 'express';

import { authenticateToken } from '../middleware/auth';
import { fileComplaintSchema } from '../schemas/complaint.schema';
import { complaintService } from '../services/complaints/index';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * POST /api/complaints
 * Files a new community complaint against a target VPA with 24-hour deduplication.
 */
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const validated = fileComplaintSchema.parse(req.body);
    const complainantId = (req as unknown as { user?: { id: string } }).user?.id ?? 'usr_sandbox_default';

    console.log(`[INFO] Filing complaint by user ${complainantId} against VPA: ${validated.targetVpa}`);

    const result = await complaintService.fileComplaint(complainantId, validated);

    res.status(201).json({
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
 * GET /api/complaints/against/:vpa
 * Retrieves aggregated complaint statistics and breakdown for a target VPA.
 */
router.get(
  '/against/:vpa',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { vpa } = req.params;
    console.log(`[INFO] Complaint stats requested for target VPA: ${vpa}`);

    const stats = await complaintService.getComplaintStats(vpa);

    res.status(200).json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (req as unknown as { requestId?: string }).requestId ?? 'req_unknown',
      },
    });
  })
);

export default router;