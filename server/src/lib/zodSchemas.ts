import { z } from 'zod';

export const vpaSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9.\-_]+@[a-z]+$/, {
    message: 'Invalid VPA format. Expected username@bankhandle',
  })
  .transform((val) => val.toLowerCase().trim());

export const phoneSchema = z
  .string()
  .regex(/^(\+91)?[6-9]\d{9}$/, {
    message: 'Invalid phone number. Expected 10 digits starting with 6, 7, 8, or 9, with optional +91 prefix',
  })
  .transform((val) => {
    const digits = val.replace(/^\+91/, '');
    return '+91' + digits;
  });

export const amountRupeesSchema = z
  .number()
  .positive({ message: 'Amount must be greater than zero' })
  .min(1, { message: 'Minimum transaction amount is INR 1.00' })
  .max(100000, { message: 'Maximum transaction amount is INR 100,000.00' });

export const pinSchema = z
  .string()
  .length(4, { message: 'PIN must be exactly 4 digits' })
  .regex(/^\d{4}$/, { message: 'PIN must contain numeric characters only' });