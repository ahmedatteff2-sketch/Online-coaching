import { Router } from 'express';
import { z } from 'zod';
import { Goal } from '@prisma/client';

import { asyncHandler } from '@/utils/asyncHandler.js';
import { created, noContent, ok } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';
import { NotFound } from '@/lib/errors.js';
import { validate } from '@/middleware/validate.js';

const router = Router();

const exerciseInputSchema = z.object({
  id: z.string().optional(),
  libraryId: z.string().optional().nullable(),
  name: z.string().min(1),
  muscleGroup: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  imageUrl: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  instructions: z.string().optional().nullable(),
  sets: z.number().int().min(1).max(20).default(3),
  repsMin: z.number().int().min(1).max(100).default(8),
  repsMax: z.number().int().min(1).max(200).default(12),
  restSeconds: z.number().int().min(0).max(900).default(90),
  tempo: z.string().optional().nullable(),
  rpe: z.number().min(1).max(10).optional().nullable(),
  notes: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
});

const dayInputSchema = z.object({
  id: z.string().optional(),
  dayNumber: z.number().int().min(1).max(14),
  name: z.string().min(1),
  targetMuscles: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  exercises: z.array(exerciseInputSchema).default([]),
});

const planInputSchema = z.object({
  memberId: z.string().optional().nullable(),
  isTemplate: z.boolean().default(false),
  isActive: z.boolean().default(true),
  name: z.string().min(1),
  goal: z.nativeEnum(Goal).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  daysPerWeek: z.number().int().min(1).max(7).default(3),
  notes: z.string().optional().nullable(),
  days: z.array(dayInputSchema).default([]),
});

const planUpdateSchema = planInputSchema.partial();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { memberId, template } = req.query as { memberId?: string; template?: string };
    const where: Record<string, unknown> = {};
    if (memberId) where.memberId = memberId;
    if (template === 'true') where.isTemplate = true;
    if (template === 'false') where.isTemplate = false;
    const plans = await prisma.trainingPlan.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { member: { select: { id: true, fullName: true } } },
    });
    return ok(res, plans);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id: req.params.id },
      include: {
        member: { select: { id: true, fullName: true } },
        days: {
          orderBy: { dayNumber: 'asc' },
          include: { exercises: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!plan) throw NotFound('Plan not found');
    return ok(res, plan);
  }),
);

router.post(
  '/',
  validate(planInputSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof planInputSchema>;
    const plan = await prisma.trainingPlan.create({
      data: {
        memberId: body.memberId ?? null,
        authorId: req.user?.sub,
        isTemplate: body.isTemplate,
        isActive: body.isActive,
        name: body.name,
        goal: body.goal ?? null,
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
        daysPerWeek: body.daysPerWeek,
        notes: body.notes ?? null,
        days: {
          create: body.days.map((d) => ({
            dayNumber: d.dayNumber,
            name: d.name,
            targetMuscles: d.targetMuscles,
            notes: d.notes ?? null,
            exercises: {
              create: d.exercises.map((e, i) => ({
                libraryId: e.libraryId ?? null,
                name: e.name,
                muscleGroup: e.muscleGroup ?? null,
                videoUrl: e.videoUrl ?? null,
                imageUrl: e.imageUrl ?? null,
                instructions: e.instructions ?? null,
                sets: e.sets,
                repsMin: e.repsMin,
                repsMax: e.repsMax,
                restSeconds: e.restSeconds,
                tempo: e.tempo ?? null,
                rpe: e.rpe ?? null,
                notes: e.notes ?? null,
                order: e.order ?? i,
              })),
            },
          })),
        },
      },
      include: { days: { include: { exercises: true } } },
    });
    if (plan.memberId) {
      await prisma.notification.create({
        data: {
          userId: plan.memberId,
          type: 'PLAN_ASSIGNED',
          title: 'New training plan assigned',
          body: plan.name,
          link: '/member/workouts',
        },
      });
    }
    return created(res, plan);
  }),
);

// Replace plan structure (simpler than partial day/exercise endpoints)
router.patch(
  '/:id',
  validate(planUpdateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof planUpdateSchema>;
    const id = req.params.id;
    const existing = await prisma.trainingPlan.findUnique({ where: { id } });
    if (!existing) throw NotFound('Plan not found');

    const updated = await prisma.$transaction(async (tx) => {
      await tx.trainingPlan.update({
        where: { id },
        data: {
          memberId: body.memberId ?? existing.memberId,
          isTemplate: body.isTemplate ?? existing.isTemplate,
          isActive: body.isActive ?? existing.isActive,
          name: body.name ?? existing.name,
          goal: body.goal ?? existing.goal,
          startDate: body.startDate ?? existing.startDate,
          endDate: body.endDate ?? existing.endDate,
          daysPerWeek: body.daysPerWeek ?? existing.daysPerWeek,
          notes: body.notes ?? existing.notes,
        },
      });

      if (body.days) {
        await tx.trainingDay.deleteMany({ where: { planId: id } });
        for (const d of body.days) {
          await tx.trainingDay.create({
            data: {
              planId: id,
              dayNumber: d.dayNumber,
              name: d.name,
              targetMuscles: d.targetMuscles,
              notes: d.notes ?? null,
              exercises: {
                create: d.exercises.map((e, i) => ({
                  libraryId: e.libraryId ?? null,
                  name: e.name,
                  muscleGroup: e.muscleGroup ?? null,
                  videoUrl: e.videoUrl ?? null,
                  imageUrl: e.imageUrl ?? null,
                  instructions: e.instructions ?? null,
                  sets: e.sets,
                  repsMin: e.repsMin,
                  repsMax: e.repsMax,
                  restSeconds: e.restSeconds,
                  tempo: e.tempo ?? null,
                  rpe: e.rpe ?? null,
                  notes: e.notes ?? null,
                  order: e.order ?? i,
                })),
              },
            },
          });
        }
      }
      return tx.trainingPlan.findUniqueOrThrow({
        where: { id },
        include: {
          days: { orderBy: { dayNumber: 'asc' }, include: { exercises: { orderBy: { order: 'asc' } } } },
        },
      });
    });

    return ok(res, updated);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.trainingPlan.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

router.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const original = await prisma.trainingPlan.findUnique({
      where: { id: req.params.id },
      include: { days: { include: { exercises: true } } },
    });
    if (!original) throw NotFound('Plan not found');
    const dup = await prisma.trainingPlan.create({
      data: {
        memberId: null,
        authorId: req.user?.sub,
        isTemplate: true,
        isActive: false,
        name: `${original.name} (copy)`,
        goal: original.goal,
        daysPerWeek: original.daysPerWeek,
        notes: original.notes,
        days: {
          create: original.days.map((d) => ({
            dayNumber: d.dayNumber,
            name: d.name,
            targetMuscles: d.targetMuscles,
            notes: d.notes,
            exercises: {
              create: d.exercises.map((e) => ({
                libraryId: e.libraryId,
                name: e.name,
                muscleGroup: e.muscleGroup,
                videoUrl: e.videoUrl,
                imageUrl: e.imageUrl,
                instructions: e.instructions,
                sets: e.sets,
                repsMin: e.repsMin,
                repsMax: e.repsMax,
                restSeconds: e.restSeconds,
                tempo: e.tempo,
                rpe: e.rpe,
                notes: e.notes,
                order: e.order,
              })),
            },
          })),
        },
      },
    });
    return created(res, dup);
  }),
);

router.post(
  '/:id/assign',
  validate(z.object({ memberIds: z.array(z.string()).min(1) })),
  asyncHandler(async (req, res) => {
    const { memberIds } = req.body as { memberIds: string[] };
    const original = await prisma.trainingPlan.findUnique({
      where: { id: req.params.id },
      include: { days: { include: { exercises: true } } },
    });
    if (!original) throw NotFound('Plan not found');

    const assigned: { id: string; memberId: string }[] = [];
    for (const memberId of memberIds) {
      const cloned = await prisma.trainingPlan.create({
        data: {
          memberId,
          authorId: req.user?.sub,
          isTemplate: false,
          isActive: true,
          name: original.name,
          goal: original.goal,
          daysPerWeek: original.daysPerWeek,
          notes: original.notes,
          days: {
            create: original.days.map((d) => ({
              dayNumber: d.dayNumber,
              name: d.name,
              targetMuscles: d.targetMuscles,
              notes: d.notes,
              exercises: {
                create: d.exercises.map((e) => ({
                  libraryId: e.libraryId,
                  name: e.name,
                  muscleGroup: e.muscleGroup,
                  videoUrl: e.videoUrl,
                  imageUrl: e.imageUrl,
                  instructions: e.instructions,
                  sets: e.sets,
                  repsMin: e.repsMin,
                  repsMax: e.repsMax,
                  restSeconds: e.restSeconds,
                  tempo: e.tempo,
                  rpe: e.rpe,
                  notes: e.notes,
                  order: e.order,
                })),
              },
            })),
          },
        },
      });
      await prisma.notification.create({
        data: {
          userId: memberId,
          type: 'PLAN_ASSIGNED',
          title: 'New training plan assigned',
          body: original.name,
          link: '/member/workouts',
        },
      });
      assigned.push({ id: cloned.id, memberId });
    }
    return ok(res, { assigned });
  }),
);

export default router;
