import { z } from 'zod';

const VALID_CATEGORIES = [
  'FRAUD',
  'IMPERSONATION',
  'SPAM',
  'HARASSMENT',
  'QR_TAMPERING',
  'OTHER',
] as const;

export const fileComplaintSchema = z.object({
  targetVpa: z.string().regex(/^[a-z0-9.\-_]+@[a-z]+$/, 'Invalid VPA format'),
  category: z.enum(VALID_CATEGORIES),
  description: z.string().min(10).max(1000),
  evidenceUrl: z.string().url().optional(),
  transactionId: z.string().min(1).optional(),
});

export type FileComplaintInput = z.infer<typeof fileComplaintSchema>;