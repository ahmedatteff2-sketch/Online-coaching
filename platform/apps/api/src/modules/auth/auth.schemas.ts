import { z } from 'zod';

export const loginSchema = z.object({
  phone: z
    .string()
    .min(6, 'Phone is required')
    .max(32)
    .transform((v) => v.trim()),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
