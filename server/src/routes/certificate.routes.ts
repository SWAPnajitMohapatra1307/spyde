import { Router } from 'express';

import {
  certificateVerifySchema,
  faceBlobUploadSchema,
} from '../schemas/certificate.schema';
import {
  certificateService,
  faceBlobService,
} from '../services/certificate/index';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * GET /api/certificates/:id
 * Retrieves a certificate record by ID with associated face blob metadata.
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(`[INFO] Certificate fetch request for id: ${id}`);

    const certificate = await certificateService.getCertificate(id);

    res.status(200).json({
      success: true,
      data: certificate,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  })
);

/**
 * POST /api/certificates/verify
 * Validates certificate cryptographic integrity (JWT signature + SHA-256 hash).
 */
router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    console.log('[INFO] Certificate verification request received');

    const validated = certificateVerifySchema.parse(req.body);
    const result = await certificateService.verifyCertificate(validated);

    console.log(`[SECURITY] Certificate validation result: isValid=${result.isValid}`);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  })
);

/**
 * POST /api/certificates/face-blob
 * Uploads an encrypted face biometric blob (max 500KB) linked to a liveness session.
 */
router.post(
  '/face-blob',
  asyncHandler(async (req, res) => {
    console.log('[INFO] Encrypted face blob upload received');

    const validated = faceBlobUploadSchema.parse(req.body);
    const result = await faceBlobService.storeFaceBlob(validated);

    console.log(`[SUCCESS] Face blob stored with id: ${result.faceBlobId}`);

    res.status(201).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  })
);

/**
 * GET /api/certificates/face-blob/:id
 * View-once retrieval of encrypted face blob. Arms 60-second self-destruct timer.
 */
router.get(
  '/face-blob/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(`[SECURITY] View-once face blob retrieval for id: ${id}`);

    const result = await faceBlobService.getAndDestroyFaceBlob(id);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        destructionScheduledInSeconds: 60,
      },
    });
  })
);

export default router;