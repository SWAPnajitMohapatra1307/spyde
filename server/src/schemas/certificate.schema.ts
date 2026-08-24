import { z } from 'zod';

export const certificateVerifySchema = z.object({
  certificateId: z.string().min(1, 'Certificate ID is required'),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/, 'Must be valid SHA-256 hex string'),
});

export const faceBlobUploadSchema = z.object({
  certificateId: z.string().min(1, 'Certificate ID is required'),
  encryptedBase64: z.string().min(1, 'Encrypted blob data is required'),
  ivBase64: z.string().min(1, 'Initialization vector is required'),
  authTagBase64: z.string().min(1, 'Authentication tag is required'),
});

export type CertificateVerifyInput = z.infer<typeof certificateVerifySchema>;
export type FaceBlobUploadInput = z.infer<typeof faceBlobUploadSchema>;
