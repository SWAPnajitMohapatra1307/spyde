import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { notificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * ✅ GET /api/notifications/unread-count
 * Returns live unread notification count for header bell badge (polled every 10s).
 * Placed BEFORE '/' to avoid parameter collision.
 */
router.get(
  '/unread-count',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id ?? 'usr_sandbox_default';
    const result = await notificationService.getUnreadCount(userId);

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
 * ✅ GET /api/notifications
 * Returns paginated computed notification stream.
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id ?? 'usr_sandbox_default';
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const result = await notificationService.getNotifications(userId, limit, offset);

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

export default router;