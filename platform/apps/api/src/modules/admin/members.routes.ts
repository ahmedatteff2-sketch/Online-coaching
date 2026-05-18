import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role, MemberStatus, Gender, Goal, FitnessLevel } from '@prisma/client';

import { asyncHandler } from '@/utils/asyncHandler.js';
import { created, noContent, ok } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';
import { Conflict, NotFound } from '@/lib/errors.js';
import { validate } from '@/middleware/validate.js';

const router = Router();

const memberCreateSchema = z.object({
  phone: z.string().min(6).max(32),
  password: z.string().min(6).max(128),
  fullName: z.string().min(2).max(120),
  profileImage: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  profile: z
    .object({
      age: z.number().int().min(8).max(110).optional().nullable(),
      gender: z.nativeEnum(Gender).optional().nullable(),
      heightCm: z.number().min(80).max(260).optional().nullable(),
      currentWeightKg: z.number().min(20).max(400).optional().nullable(),
      goal: z.nativeEnum(Goal).optional().nullable(),
      fitnessLevel: z.nativeEnum(FitnessLevel).optional().nullable(),
      medicalNotes: z.string().max(2000).optional().nullable(),
      status: z.nativeEnum(MemberStatus).optional(),
      startDate: z.coerce.date().optional().nullable(),
      expiryDate: z.coerce.date().optional().nullable(),
    })
    .partial()
    .optional(),
});

const memberUpdateSchema = memberCreateSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(6).max(128).optional(),
  });

const passwordSchema = z.object({ password: z.string().min(6).max(128) });
const statusSchema = z.object({ status: z.nativeEnum(MemberStatus) });

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(MemberStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const memberSelect = {
  id: true,
  phone: true,
  fullName: true,
  profileImage: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  memberProfile: true,
} as const;

// LIST
router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search, status, page, pageSize } = req.query as unknown as z.infer<typeof listQuerySchema>;
    const where: Record<string, unknown> = { role: Role.MEMBER };
    if (search) {
      Object.assign(where, {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      });
    }
    if (status) {
      Object.assign(where, { memberProfile: { status } });
    }
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: memberSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return ok(res, items, { total, page, pageSize });
  }),
);

// CREATE
router.post(
  '/',
  validate(memberCreateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof memberCreateSchema>;
    const exists = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (exists) throw Conflict('Phone already registered');

    const passwordHash = await bcrypt.hash(body.password, 12);
    const member = await prisma.user.create({
      data: {
        phone: body.phone,
        passwordHash,
        fullName: body.fullName,
        profileImage: body.profileImage ?? null,
        isActive: body.isActive ?? true,
        role: Role.MEMBER,
        memberProfile: { create: { ...(body.profile ?? {}) } },
      },
      select: memberSelect,
    });
    return created(res, member);
  }),
);

// READ
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const member = await prisma.user.findFirst({
      where: { id: req.params.id, role: Role.MEMBER },
      select: memberSelect,
    });
    if (!member) throw NotFound('Member not found');
    return ok(res, member);
  }),
);

// UPDATE
router.patch(
  '/:id',
  validate(memberUpdateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof memberUpdateSchema>;
    const data: Record<string, unknown> = {
      ...(body.fullName !== undefined && { fullName: body.fullName }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.profileImage !== undefined && { profileImage: body.profileImage }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    };
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 12);
    }
    if (body.profile) {
      data.memberProfile = {
        upsert: {
          create: body.profile as object,
          update: body.profile as object,
        },
      };
    }
    const member = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: memberSelect,
    });
    return ok(res, member);
  }),
);

// DELETE
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

// Reset password
router.post(
  '/:id/password',
  validate(passwordSchema),
  asyncHandler(async (req, res) => {
    const passwordHash = await bcrypt.hash((req.body as z.infer<typeof passwordSchema>).password, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    return ok(res, { success: true });
  }),
);

// Set status
router.post(
  '/:id/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const status = (req.body as z.infer<typeof statusSchema>).status;
    await prisma.memberProfile.upsert({
      where: { userId: req.params.id },
      create: { userId: req.params.id, status },
      update: { status },
    });
    return ok(res, { success: true });
  }),
);

// Member overview (combined data)
router.get(
  '/:id/overview',
  asyncHandler(async (req, res) => {
    const memberId = req.params.id;
    const [member, weights, measurements, photos, checkIns, plans, nutrition] = await Promise.all([
      prisma.user.findFirst({
        where: { id: memberId, role: Role.MEMBER },
        select: memberSelect,
      }),
      prisma.weightLog.findMany({ where: { memberId }, orderBy: { date: 'asc' }, take: 100 }),
      prisma.bodyMeasurement.findMany({ where: { memberId }, orderBy: { date: 'asc' }, take: 100 }),
      prisma.progressPhoto.findMany({ where: { memberId }, orderBy: { date: 'desc' }, take: 30 }),
      prisma.checkIn.findMany({ where: { memberId }, orderBy: { weekStart: 'desc' }, take: 12 }),
      prisma.trainingPlan.findMany({
        where: { memberId, isActive: true },
        include: { days: { include: { exercises: true }, orderBy: { dayNumber: 'asc' } } },
      }),
      prisma.nutritionPlan.findMany({
        where: { memberId, isActive: true },
        include: { meals: { include: { foods: true }, orderBy: { order: 'asc' } } },
      }),
    ]);
    if (!member) throw NotFound('Member not found');
    return ok(res, { member, weights, measurements, photos, checkIns, plans, nutrition });
  }),
);

// Sub-resources (read-only convenience)
router.get(
  '/:id/weights',
  asyncHandler(async (req, res) =>
    ok(res, await prisma.weightLog.findMany({ where: { memberId: req.params.id }, orderBy: { date: 'asc' } })),
  ),
);
router.get(
  '/:id/measurements',
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.bodyMeasurement.findMany({ where: { memberId: req.params.id }, orderBy: { date: 'asc' } }),
    ),
  ),
);
router.get(
  '/:id/photos',
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.progressPhoto.findMany({ where: { memberId: req.params.id }, orderBy: { date: 'desc' } }),
    ),
  ),
);
router.get(
  '/:id/check-ins',
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.checkIn.findMany({ where: { memberId: req.params.id }, orderBy: { weekStart: 'desc' } }),
    ),
  ),
);
router.get(
  '/:id/workout-logs',
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.workoutLog.findMany({
        where: { memberId: req.params.id },
        orderBy: { date: 'desc' },
        include: { setLogs: { include: { exercise: true } } },
        take: 200,
      }),
    ),
  ),
);
router.get(
  '/:id/nutrition-logs',
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.nutritionLog.findMany({
        where: { memberId: req.params.id },
        orderBy: { date: 'desc' },
        take: 200,
      }),
    ),
  ),
);

// Check-in feedback
router.post(
  '/check-ins/:id/feedback',
  validate(z.object({ adminFeedback: z.string().min(1).max(4000) })),
  asyncHandler(async (req, res) => {
    const { adminFeedback } = req.body as { adminFeedback: string };
    const updated = await prisma.checkIn.update({
      where: { id: req.params.id },
      data: { adminFeedback, reviewedAt: new Date() },
    });
    await prisma.notification.create({
      data: {
        userId: updated.memberId,
        type: 'CHECKIN_REVIEWED',
        title: 'Your check-in has feedback',
        body: 'Your coach left feedback on this week\'s check-in.',
      },
    });
    return ok(res, updated);
  }),
);

export default router;
