import { Router } from 'express';
import { qrVerifySchema } from '../schemas/qr.schema';
import { qrService } from '../services/qr/qr.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * POST /api/qr/verify
 * Verifies a QR code payload against registered merchants and GPS bounds.
 */
router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    console.log('[INFO] Received QR verification request');

    // Parse coordinates from custom headers if present, falling back to body fields.
    const latHeader = req.headers['x-device-lat'];
    const lngHeader = req.headers['x-device-lng'];

    const payload = {
      qrPayload: req.body.qrPayload || req.body.rawQr,
      deviceLat: latHeader ? parseFloat(latHeader as string) : req.body.deviceLat,
      deviceLng: lngHeader ? parseFloat(lngHeader as string) : req.body.deviceLng,
    };

    const validated = qrVerifySchema.parse(payload);

    const result = await qrService.verifyQr({
      qrPayload: validated.qrPayload,
      deviceLat: validated.deviceLat,
      deviceLng: validated.deviceLng,
    });

    console.log(`[SUCCESS] QR verification completed with verdict: ${result.verdict}`);

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

export default router;