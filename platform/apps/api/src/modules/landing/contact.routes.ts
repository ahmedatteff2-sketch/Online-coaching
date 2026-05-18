import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '@/utils/asyncHandler.js';
import { created } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';
import { validate } from '@/middleware/validate.js';
import { contactLimiter } from '@/middleware/rateLimit.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(6).max(32),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  message: z.string().min(1).max(2000),
});

router.post(
  '/',
  contactLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof contactSchema>;
    const msg = await prisma.contactMessage.create({ data: body });
    return created(res, { id: msg.id });
  }),
);

export default router;
