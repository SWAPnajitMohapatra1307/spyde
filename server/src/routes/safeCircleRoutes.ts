import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import {
  addContact,
  removeContact,
  listContacts,
} from '../services/safeCircleService';
import { authenticateToken } from '../middleware/auth';
import { vpaSchema } from '../lib/zodSchemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const addContactSchema = z.object({
  contactVpa: vpaSchema,
  contactName: z.string().min(1).max(50).optional(),
});

/**
 * GET /api/circle
 * Returns all contacts in the authenticated user's Safe Circle with anomaly indicators.
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const contacts = await listContacts(userId);

    res.status(200).json({
      success: true,
      data: {
        contacts,
        total: contacts.length,
      },
    });
  })
);

/**
 * POST /api/circle/add
 * Adds a verified VPA to the user's Safe Circle whitelist (max 20).
 */
router.post(
  '/add',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const parsed = addContactSchema.parse(req.body);

    const contact = await addContact({
      userId,
      contactVpa: parsed.contactVpa,
      contactName: parsed.contactName,
    });

    res.status(201).json({
      success: true,
      data: contact,
    });
  })
);

/**
 * DELETE /api/circle/:id
 * Removes a contact from the Safe Circle and purges Redis cache.
 */
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const contactId = req.params.id;

    await removeContact(userId, contactId);

    res.status(200).json({
      success: true,
      data: {
        message: 'Contact removed from Safe Circle',
      },
    });
  })
);

export default router;