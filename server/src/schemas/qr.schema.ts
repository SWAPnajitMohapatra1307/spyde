import { z } from 'zod';

export const qrVerifySchema = z.object({
  qrPayload: z.string().min(1, 'QR payload cannot be empty'),
  deviceLat: z.number().min(8.0).max(37.0),
  deviceLng: z.number().min(68.0).max(97.0),
});

export type QrVerifyInput = z.infer<typeof qrVerifySchema>;
