import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import {
  resolveVpa,
  initiatePayment,
  confirmPayment,
  getPaymentHistory,
} from '../services/paymentService';
import { authenticateToken } from '../middleware/auth';
import { amountRupeesSchema, pinSchema, vpaSchema } from '../lib/zodSchemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const resolveSchema = z.object({
  vpa: vpaSchema,
});

const initiateSchema = z.object({
  receiverVpa: vpaSchema,
  amount: amountRupeesSchema,
  note: z.string().max(100).optional(),
  idempotencyKey: z.string().optional(),
});

const confirmSchema = z.object({
  transactionId: z.string().min(1),
  pin: pinSchema,
});

/**
 * POST /api/vpa/resolve
 */
router.post(
  '/vpa/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = resolveSchema.parse(req.body);
    const details = await resolveVpa(parsed.vpa);

    res.status(200).json({
      success: true,
      data: details,
    });
  })
);

/**
 * POST /api/payment/initiate
 */
router.post(
  '/payment/initiate',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const parsed = initiateSchema.parse(req.body);

    const result = await initiatePayment({
      senderId: userId,
      receiverVpa: parsed.receiverVpa,
      amountRupees: parsed.amount,
      note: parsed.note,
      idempotencyKey: parsed.idempotencyKey,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/payment/confirm
 */
router.post(
  '/payment/confirm',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const parsed = confirmSchema.parse(req.body);

    const result = await confirmPayment({
      transactionId: parsed.transactionId,
      senderId: userId,
      pin: parsed.pin,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/payment/history
 */
router.get(
  '/payment/history',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const history = await getPaymentHistory(userId, limit, offset);

    res.status(200).json({
      success: true,
      data: history,
    });
  })
);

export default router;