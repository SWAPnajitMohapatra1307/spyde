import { z } from 'zod';

const VALID_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;

export const moderateComplaintSchema = z.object({
  status: z.enum(VALID_STATUSES),
  adminNote: z.string().max(500).optional(),
});

export type ModerateComplaintInput = z.infer<typeof moderateComplaintSchema>;
