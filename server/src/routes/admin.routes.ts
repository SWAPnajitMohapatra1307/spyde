import { Router, type Request, type Response, type NextFunction } from 'express';

import { moderateComplaintSchema } from '../schemas/admin.schema';
import { adminService } from '../services/admin/index';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * Middleware that guards admin routes.
 * Checks for authenticated user and verifies admin privilege flag.
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as unknown as { user?: { id: string; isAdmin?: boolean } }).user;

  if (user && !user.isAdmin) {
    console.warn(`[SECURITY] Forbidden admin access attempt by user: ${user.id}`);
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin privileges required',
      },
    });
    return;
  }

  next();
};

/**
 * GET /api/admin/stats
 * Retrieves aggregated platform statistics for dashboard.
 */
router.get(
  '/stats',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    console.log('[INFO] Admin stats request received');

    const stats = await adminService.getStats();

    res.status(200).json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  })
);

/**
 * GET /api/admin/top-flagged
 * Retrieves top flagged VPAs ranked by complaint count.
 */
router.get(
  '/top-flagged',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    console.log('[INFO] Admin top-flagged VPAs request received');

    const topFlagged = await adminService.getTopFlagged();

    res.status(200).json({
      success: true,
      data: topFlagged,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  })
);

/**
 * PATCH /api/admin/complaints/:id
 * Updates complaint status (PENDING -> VERIFIED / REJECTED).
 */
router.patch(
  '/complaints/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(`[INFO] Admin complaint moderation request for id: ${id}`);

    const validated = moderateComplaintSchema.parse(req.body);
    const result = await adminService.moderateComplaint(id, {
      status: validated.status,
      adminNote: validated.adminNote,
    });

    console.log(`[SUCCESS] Complaint ${id} moderated to ${validated.status}`);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  })
);

export default router;