import { z } from 'zod';

export const loginSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  vpa: z
    .string()
    .regex(/^[a-z0-9._-]+@[a-z]+$/, 'VPA format must be username@bank (e.g. priya@okhdfc)')
    .toLowerCase(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;