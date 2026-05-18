import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { MealStatus, PhotoType, Gender, Goal, FitnessLevel } from '@prisma/client';

import { asyncHandler } from '@/utils/asyncHandler.js';
import { created, noContent, ok } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';
import { Forbidden, NotFound, Unauthorized } from '@/lib/errors.js';
import { validate } from '@/middleware/validate.js';
import { requireAuth, requireMember } from '@/middleware/auth.js';

const router = Router();
router.use(requireAuth, requireMember);

const meId = (req: { user?: { sub: string } }) => {
  if (!req.user?.sub) throw Unauthorized();
  return req.user.sub;
};

// ============================================================================
// Profile
// ============================================================================

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: meId(req) },
      select: {
        id: true,
        phone: true,
        fullName: true,
        profileImage: true,
        memberProfile: true,
      },
    });
    if (!user) throw NotFound();
    return ok(res, user);
  }),
);

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  profileImage: z.string().optional().nullable(),
  profile: z
    .object({
      age: z.number().int().min(8).max(110).optional().nullable(),
      gender: z.nativeEnum(Gender).optional().nullable(),
      heightCm: z.number().min(80).max(260).optional().nullable(),
      currentWeightKg: z.number().min(20).max(400).optional().nullable(),
      goal: z.nativeEnum(Goal).optional().nullable(),
      fitnessLevel: z.nativeEnum(FitnessLevel).optional().nullable(),
      medicalNotes: z.string().max(2000).optional().nullable(),
    })
    .optional(),
});

router.patch(
  '/me',
  validate(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof profileUpdateSchema>;
    const data: Record<string, unknown> = {};
    if (body.fullName !== undefined) data.fullName = body.fullName;
    if (body.profileImage !== undefined) data.profileImage = body.profileImage;
    if (body.profile) {
      data.memberProfile = {
        upsert: { create: body.profile as object, update: body.profile as object },
      };
    }
    const user = await prisma.user.update({
      where: { id: meId(req) },
      data,
      select: { id: true, fullName: true, profileImage: true, memberProfile: true },
    });
    return ok(res, user);
  }),
);

router.post(
  '/me/password',
  validate(
    z.object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6).max(128),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    const u = await prisma.user.findUnique({ where: { id: meId(req) } });
    if (!u) throw NotFound();
    const ok2 = await bcrypt.compare(currentPassword, u.passwordHash);
    if (!ok2) throw Forbidden('Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } });
    return ok(res, { success: true });
  }),
);

// ============================================================================
// Overview
// ============================================================================

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    const [me, plan, nutrition, latestWeight, latestNote, recentLogs, recentNutritionLogs] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: memberId },
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            memberProfile: true,
          },
        }),
        prisma.trainingPlan.findFirst({
          where: { memberId, isActive: true },
          orderBy: { updatedAt: 'desc' },
          include: {
            days: { orderBy: { dayNumber: 'asc' }, include: { exercises: { orderBy: { order: 'asc' } } } },
          },
        }),
        prisma.nutritionPlan.findFirst({
          where: { memberId, isActive: true },
          orderBy: { updatedAt: 'desc' },
          include: { meals: { include: { foods: true }, orderBy: { order: 'asc' } } },
        }),
        prisma.weightLog.findFirst({ where: { memberId }, orderBy: { date: 'desc' } }),
        prisma.adminNote.findFirst({
          where: { memberId, isPrivate: false },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.workoutLog.findMany({
          where: { memberId, date: { gte: sevenDaysAgo } },
          include: { setLogs: true },
        }),
        prisma.nutritionLog.findMany({
          where: { memberId, date: { gte: sevenDaysAgo } },
        }),
      ]);

    // Adherence: workouts done this week / planDaysPerWeek; nutrition completed / total this week
    const workoutAdherence = plan?.daysPerWeek
      ? Math.min(100, Math.round((recentLogs.length / plan.daysPerWeek) * 100))
      : null;
    const totalNutLogs = recentNutritionLogs.length;
    const completedNutLogs = recentNutritionLogs.filter(
      (l) => l.status === MealStatus.COMPLETED,
    ).length;
    const nutritionAdherence =
      totalNutLogs === 0 ? null : Math.round((completedNutLogs / totalNutLogs) * 100);

    return ok(res, {
      me,
      plan,
      nutrition,
      latestWeight,
      latestNote,
      adherence: { workoutAdherence, nutritionAdherence },
    });
  }),
);

// ============================================================================
// Training plan + workout logs
// ============================================================================

router.get(
  '/training-plan',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const plan = await prisma.trainingPlan.findFirst({
      where: { memberId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        days: { orderBy: { dayNumber: 'asc' }, include: { exercises: { orderBy: { order: 'asc' } } } },
      },
    });
    return ok(res, plan);
  }),
);

const workoutLogSchema = z.object({
  dayId: z.string().optional().nullable(),
  date: z.coerce.date().optional(),
  durationSec: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  sets: z
    .array(
      z.object({
        exerciseId: z.string(),
        setNumber: z.number().int().min(1),
        weightKg: z.number().min(0).optional().nullable(),
        reps: z.number().int().min(0).optional().nullable(),
        completed: z.boolean().default(true),
        restSecondsUsed: z.number().int().min(0).optional().nullable(),
        rpe: z.number().min(1).max(10).optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

router.post(
  '/workout-logs',
  validate(workoutLogSchema),
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const body = req.body as z.infer<typeof workoutLogSchema>;
    const log = await prisma.workoutLog.create({
      data: {
        memberId,
        dayId: body.dayId ?? null,
        date: body.date ?? new Date(),
        durationSec: body.durationSec ?? null,
        notes: body.notes ?? null,
        setLogs: {
          create: body.sets.map((s) => ({
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            weightKg: s.weightKg ?? null,
            reps: s.reps ?? null,
            completed: s.completed,
            restSecondsUsed: s.restSecondsUsed ?? null,
            rpe: s.rpe ?? null,
            notes: s.notes ?? null,
          })),
        },
      },
      include: { setLogs: true },
    });
    return created(res, log);
  }),
);

router.get(
  '/workout-logs',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const { from, to, dayId } = req.query as { from?: string; to?: string; dayId?: string };
    const where: Record<string, unknown> = { memberId };
    if (dayId) where.dayId = dayId;
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    const logs = await prisma.workoutLog.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { setLogs: { include: { exercise: true } } },
      take: 200,
    });
    return ok(res, logs);
  }),
);

// Personal records — best e1RM-ish (just max weight*reps proxy by exercise)
router.get(
  '/personal-records',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const sets = await prisma.workoutSetLog.findMany({
      where: {
        log: { memberId },
        completed: true,
        exerciseId: { not: null },
        weightKg: { not: null },
        reps: { not: null },
      },
      include: { exercise: { select: { id: true, name: true } } },
    });
    const records = new Map<string, { exerciseId: string; name: string; maxWeight: number; bestReps: number; bestVolume: number }>();
    for (const s of sets) {
      if (!s.exerciseId || !s.exercise) continue;
      const w = s.weightKg ?? 0;
      const r = s.reps ?? 0;
      const v = w * r;
      const existing = records.get(s.exerciseId);
      if (!existing) {
        records.set(s.exerciseId, {
          exerciseId: s.exerciseId,
          name: s.exercise.name,
          maxWeight: w,
          bestReps: r,
          bestVolume: v,
        });
      } else {
        if (w > existing.maxWeight) existing.maxWeight = w;
        if (r > existing.bestReps) existing.bestReps = r;
        if (v > existing.bestVolume) existing.bestVolume = v;
      }
    }
    return ok(res, Array.from(records.values()));
  }),
);

// ============================================================================
// Nutrition plan + nutrition logs
// ============================================================================

router.get(
  '/nutrition-plan',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const plan = await prisma.nutritionPlan.findFirst({
      where: { memberId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      include: { meals: { orderBy: { order: 'asc' }, include: { foods: { orderBy: { order: 'asc' } } } } },
    });
    return ok(res, plan);
  }),
);

const nutritionLogSchema = z.object({
  mealId: z.string(),
  date: z.coerce.date().optional(),
  status: z.nativeEnum(MealStatus).default(MealStatus.COMPLETED),
  percentFollowed: z.number().int().min(0).max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post(
  '/nutrition-logs',
  validate(nutritionLogSchema),
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const body = req.body as z.infer<typeof nutritionLogSchema>;
    const log = await prisma.nutritionLog.create({
      data: {
        memberId,
        mealId: body.mealId,
        date: body.date ?? new Date(),
        status: body.status,
        percentFollowed: body.percentFollowed ?? null,
        notes: body.notes ?? null,
      },
    });
    return created(res, log);
  }),
);

router.get(
  '/nutrition-logs',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const logs = await prisma.nutritionLog.findMany({
      where: { memberId },
      orderBy: { date: 'desc' },
      take: 200,
    });
    return ok(res, logs);
  }),
);

// ============================================================================
// Weight / Measurements / Photos
// ============================================================================

const weightSchema = z.object({
  date: z.coerce.date().optional(),
  weightKg: z.number().min(20).max(400),
  notes: z.string().optional().nullable(),
});

router.get(
  '/weights',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const items = await prisma.weightLog.findMany({
      where: { memberId },
      orderBy: { date: 'asc' },
    });
    return ok(res, items);
  }),
);

router.post(
  '/weights',
  validate(weightSchema),
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const body = req.body as z.infer<typeof weightSchema>;
    const date = body.date ?? new Date();
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const item = await prisma.weightLog.upsert({
      where: { memberId_date: { memberId, date: day } },
      create: { memberId, date: day, weightKg: body.weightKg, notes: body.notes ?? null },
      update: { weightKg: body.weightKg, notes: body.notes ?? null },
    });
    // also update memberProfile.currentWeightKg
    await prisma.memberProfile.upsert({
      where: { userId: memberId },
      create: { userId: memberId, currentWeightKg: body.weightKg },
      update: { currentWeightKg: body.weightKg },
    });
    return created(res, item);
  }),
);

const measurementSchema = z.object({
  date: z.coerce.date().optional(),
  chest: z.number().optional().nullable(),
  waist: z.number().optional().nullable(),
  hip: z.number().optional().nullable(),
  thigh: z.number().optional().nullable(),
  calf: z.number().optional().nullable(),
  biceps: z.number().optional().nullable(),
  forearm: z.number().optional().nullable(),
  shoulder: z.number().optional().nullable(),
  neck: z.number().optional().nullable(),
  bodyFatPct: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.get(
  '/measurements',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const items = await prisma.bodyMeasurement.findMany({
      where: { memberId },
      orderBy: { date: 'asc' },
    });
    return ok(res, items);
  }),
);

router.post(
  '/measurements',
  validate(measurementSchema),
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const body = req.body as z.infer<typeof measurementSchema>;
    const item = await prisma.bodyMeasurement.create({
      data: { memberId, ...(body as object), date: body.date ?? new Date() },
    });
    return created(res, item);
  }),
);

const photoSchema = z.object({
  url: z.string().min(1),
  type: z.nativeEnum(PhotoType),
  date: z.coerce.date().optional(),
  notes: z.string().optional().nullable(),
});

router.get(
  '/photos',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const items = await prisma.progressPhoto.findMany({
      where: { memberId },
      orderBy: { date: 'desc' },
    });
    return ok(res, items);
  }),
);

router.post(
  '/photos',
  validate(photoSchema),
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const body = req.body as z.infer<typeof photoSchema>;
    const item = await prisma.progressPhoto.create({
      data: {
        memberId,
        url: body.url,
        type: body.type,
        date: body.date ?? new Date(),
        notes: body.notes ?? null,
      },
    });
    return created(res, item);
  }),
);

router.delete(
  '/photos/:id',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    // ensure ownership
    const photo = await prisma.progressPhoto.findUnique({ where: { id: req.params.id } });
    if (!photo || photo.memberId !== memberId) throw NotFound();
    await prisma.progressPhoto.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

// ============================================================================
// Check-ins
// ============================================================================

const checkInSchema = z.object({
  weekStart: z.coerce.date().optional(),
  weightKg: z.number().optional().nullable(),
  energy: z.number().int().min(1).max(5).optional().nullable(),
  sleep: z.number().int().min(1).max(5).optional().nullable(),
  hunger: z.number().int().min(1).max(5).optional().nullable(),
  stress: z.number().int().min(1).max(5).optional().nullable(),
  workoutScore: z.number().int().min(1).max(5).optional().nullable(),
  nutritionScore: z.number().int().min(1).max(5).optional().nullable(),
  mood: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
  issues: z.string().optional().nullable(),
});

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday-based
  date.setDate(date.getDate() - diff);
  return date;
}

router.get(
  '/check-ins',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const items = await prisma.checkIn.findMany({
      where: { memberId },
      orderBy: { weekStart: 'desc' },
    });
    return ok(res, items);
  }),
);

router.post(
  '/check-ins',
  validate(checkInSchema),
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const body = req.body as z.infer<typeof checkInSchema>;
    const week = startOfWeek(body.weekStart ?? new Date());
    const item = await prisma.checkIn.upsert({
      where: { memberId_weekStart: { memberId, weekStart: week } },
      create: { memberId, weekStart: week, ...(body as object) },
      update: { ...(body as object) },
    });
    return created(res, item);
  }),
);

// ============================================================================
// Notes / Notifications
// ============================================================================

router.get(
  '/notes',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const items = await prisma.adminNote.findMany({
      where: { memberId, isPrivate: false },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, items);
  }),
);

const memberNoteSchema = z.object({ body: z.string().min(1).max(4000) });

router.get(
  '/my-notes',
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const items = await prisma.memberNote.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, items);
  }),
);

router.post(
  '/my-notes',
  validate(memberNoteSchema),
  asyncHandler(async (req, res) => {
    const memberId = meId(req);
    const item = await prisma.memberNote.create({
      data: { memberId, body: (req.body as { body: string }).body },
    });
    return created(res, item);
  }),
);

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const userId = meId(req);
    const items = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok(res, items);
  }),
);

router.post(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    const userId = meId(req);
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId },
      data: { readAt: new Date() },
    });
    return ok(res, { success: true });
  }),
);

router.post(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    const userId = meId(req);
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return ok(res, { success: true });
  }),
);

export default router;
