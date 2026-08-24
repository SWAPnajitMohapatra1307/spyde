import { z } from 'zod';

export const livenessChallengeSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
});

export const livenessVerifySchema = z.object({
  challengeId: z.string().min(1, 'Challenge ID is required'),
  challengeCode: z.string().regex(/^\d{4}$/, 'Challenge code must be exactly 4 digits'),
  clientScore: z.number().int().min(0).max(100),
  blinkCount: z.number().int().min(0),
  faceEmbeddingHash: z.string().regex(/^[a-f0-9]{64}$/, 'Must be valid SHA-256 hex string'),
});

export type LivenessChallengeInput = z.infer<typeof livenessChallengeSchema>;
export type LivenessVerifyInput = z.infer<typeof livenessVerifySchema>;
