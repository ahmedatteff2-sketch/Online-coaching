import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { ok } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [settings, sections, services, testimonials, faqs, pricingPlans] = await Promise.all([
      prisma.siteSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
      prisma.landingPageSection.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.service.findMany({ where: { isVisible: true }, orderBy: { order: 'asc' } }),
      prisma.testimonial.findMany({ where: { isVisible: true }, orderBy: { order: 'asc' } }),
      prisma.fAQ.findMany({ where: { isVisible: true }, orderBy: { order: 'asc' } }),
      prisma.pricingPlan.findMany({ where: { isVisible: true }, orderBy: { order: 'asc' } }),
    ]);
    return ok(res, { settings, sections, services, testimonials, faqs, pricingPlans });
  }),
);

export default router;
