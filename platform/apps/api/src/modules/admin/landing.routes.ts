import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '@/utils/asyncHandler.js';
import { created, noContent, ok } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';
import { validate } from '@/middleware/validate.js';

const router = Router();

// ----- Site settings (singleton) -----
const settingsSchema = z.object({
  brandName: z.string().min(1).max(120).optional(),
  tagline: z.string().max(240).optional(),
  logoUrl: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#?[0-9a-fA-F]{3,8}$/).optional(),
  secondaryColor: z.string().regex(/^#?[0-9a-fA-F]{3,8}$/).optional(),
  fontFamily: z.string().optional(),
  heroFontScale: z.number().min(0.5).max(2).optional(),
  isDark: z.boolean().optional(),
  whatsappNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('').transform(() => null)),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  tiktok: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  twitter: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
});

router.get(
  '/site-settings',
  asyncHandler(async (_req, res) => {
    const s = await prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    return ok(res, s);
  }),
);

router.patch(
  '/site-settings',
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const s = await prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...(req.body as object) },
      update: req.body as object,
    });
    return ok(res, s);
  }),
);

// ----- Sections -----
const sectionSchema = z.object({
  key: z.string().min(1),
  order: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  content: z.any().default({}),
  image: z.string().optional().nullable(),
  ctaLabel: z.string().optional().nullable(),
  ctaLink: z.string().optional().nullable(),
});

router.get(
  '/sections',
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.landingPageSection.findMany({ orderBy: { order: 'asc' } })),
  ),
);
router.post(
  '/sections',
  validate(sectionSchema),
  asyncHandler(async (req, res) => {
    const item = await prisma.landingPageSection.create({ data: req.body as z.infer<typeof sectionSchema> });
    return created(res, item);
  }),
);
router.patch(
  '/sections/:id',
  validate(sectionSchema.partial()),
  asyncHandler(async (req, res) => {
    const item = await prisma.landingPageSection.update({
      where: { id: req.params.id },
      data: req.body as Partial<z.infer<typeof sectionSchema>>,
    });
    return ok(res, item);
  }),
);
router.delete(
  '/sections/:id',
  asyncHandler(async (req, res) => {
    await prisma.landingPageSection.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

// ----- Services -----
const serviceSchema = z.object({
  order: z.number().int().min(0).default(0),
  icon: z.string().default('dumbbell'),
  title: z.string().min(1),
  description: z.string().min(1),
  isVisible: z.boolean().default(true),
});

router.get(
  '/services',
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.service.findMany({ orderBy: { order: 'asc' } })),
  ),
);
router.post(
  '/services',
  validate(serviceSchema),
  asyncHandler(async (req, res) =>
    created(res, await prisma.service.create({ data: req.body as z.infer<typeof serviceSchema> })),
  ),
);
router.patch(
  '/services/:id',
  validate(serviceSchema.partial()),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.service.update({
        where: { id: req.params.id },
        data: req.body as Partial<z.infer<typeof serviceSchema>>,
      }),
    ),
  ),
);
router.delete(
  '/services/:id',
  asyncHandler(async (req, res) => {
    await prisma.service.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

// ----- Testimonials -----
const testimonialSchema = z.object({
  order: z.number().int().min(0).default(0),
  name: z.string().min(1),
  image: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).default(5),
  text: z.string().min(1),
  isVisible: z.boolean().default(true),
});

router.get(
  '/testimonials',
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.testimonial.findMany({ orderBy: { order: 'asc' } })),
  ),
);
router.post(
  '/testimonials',
  validate(testimonialSchema),
  asyncHandler(async (req, res) =>
    created(res, await prisma.testimonial.create({ data: req.body as z.infer<typeof testimonialSchema> })),
  ),
);
router.patch(
  '/testimonials/:id',
  validate(testimonialSchema.partial()),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.testimonial.update({
        where: { id: req.params.id },
        data: req.body as Partial<z.infer<typeof testimonialSchema>>,
      }),
    ),
  ),
);
router.delete(
  '/testimonials/:id',
  asyncHandler(async (req, res) => {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

// ----- FAQs -----
const faqSchema = z.object({
  order: z.number().int().min(0).default(0),
  question: z.string().min(1),
  answer: z.string().min(1),
  isVisible: z.boolean().default(true),
});

router.get(
  '/faqs',
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.fAQ.findMany({ orderBy: { order: 'asc' } })),
  ),
);
router.post(
  '/faqs',
  validate(faqSchema),
  asyncHandler(async (req, res) =>
    created(res, await prisma.fAQ.create({ data: req.body as z.infer<typeof faqSchema> })),
  ),
);
router.patch(
  '/faqs/:id',
  validate(faqSchema.partial()),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.fAQ.update({
        where: { id: req.params.id },
        data: req.body as Partial<z.infer<typeof faqSchema>>,
      }),
    ),
  ),
);
router.delete(
  '/faqs/:id',
  asyncHandler(async (req, res) => {
    await prisma.fAQ.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

// ----- Pricing plans -----
const pricingSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  priceCents: z.number().int().min(0),
  currency: z.string().default('USD'),
  durationDays: z.number().int().min(1).default(30),
  features: z.array(z.string()).default([]),
  ctaLabel: z.string().default('Choose plan'),
  ctaLink: z.string().optional().nullable(),
  isPopular: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

router.get(
  '/pricing-plans',
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.pricingPlan.findMany({ orderBy: { order: 'asc' } })),
  ),
);
router.post(
  '/pricing-plans',
  validate(pricingSchema),
  asyncHandler(async (req, res) =>
    created(res, await prisma.pricingPlan.create({ data: req.body as z.infer<typeof pricingSchema> })),
  ),
);
router.patch(
  '/pricing-plans/:id',
  validate(pricingSchema.partial()),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.pricingPlan.update({
        where: { id: req.params.id },
        data: req.body as Partial<z.infer<typeof pricingSchema>>,
      }),
    ),
  ),
);
router.delete(
  '/pricing-plans/:id',
  asyncHandler(async (req, res) => {
    await prisma.pricingPlan.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

// ----- Contact messages -----
router.get(
  '/contact-messages',
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })),
  ),
);
router.delete(
  '/contact-messages/:id',
  asyncHandler(async (req, res) => {
    await prisma.contactMessage.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

export default router;
