import { Router } from 'express';
import { z } from 'zod';
import { Goal } from '@prisma/client';

import { asyncHandler } from '@/utils/asyncHandler.js';
import { created, noContent, ok } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';
import { NotFound } from '@/lib/errors.js';
import { validate } from '@/middleware/validate.js';

const router = Router();

const foodInputSchema = z.object({
  id: z.string().optional(),
  libraryId: z.string().optional().nullable(),
  name: z.string().min(1),
  quantity: z.number().min(0).default(100),
  unit: z.string().default('g'),
  calories: z.number().min(0).default(0),
  proteinG: z.number().min(0).default(0),
  carbsG: z.number().min(0).default(0),
  fatsG: z.number().min(0).default(0),
  alternatives: z.array(z.string()).default([]),
  order: z.number().int().min(0).default(0),
});

const mealInputSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().min(0).default(0),
  name: z.string().min(1),
  time: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  foods: z.array(foodInputSchema).default([]),
});

const planInputSchema = z.object({
  memberId: z.string().optional().nullable(),
  isTemplate: z.boolean().default(false),
  isActive: z.boolean().default(true),
  name: z.string().min(1),
  goal: z.nativeEnum(Goal).optional().nullable(),
  calories: z.number().int().min(800).max(8000).default(2200),
  proteinG: z.number().int().min(0).max(500).default(150),
  carbsG: z.number().int().min(0).max(900).default(220),
  fatsG: z.number().int().min(0).max(300).default(70),
  waterMl: z.number().int().min(0).max(10000).default(3000),
  mealsPerDay: z.number().int().min(1).max(10).default(4),
  notes: z.string().optional().nullable(),
  meals: z.array(mealInputSchema).default([]),
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
    const plans = await prisma.nutritionPlan.findMany({
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
    const plan = await prisma.nutritionPlan.findUnique({
      where: { id: req.params.id },
      include: {
        member: { select: { id: true, fullName: true } },
        meals: {
          orderBy: { order: 'asc' },
          include: { foods: { orderBy: { order: 'asc' } } },
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
    const plan = await prisma.nutritionPlan.create({
      data: {
        memberId: body.memberId ?? null,
        authorId: req.user?.sub,
        isTemplate: body.isTemplate,
        isActive: body.isActive,
        name: body.name,
        goal: body.goal ?? null,
        calories: body.calories,
        proteinG: body.proteinG,
        carbsG: body.carbsG,
        fatsG: body.fatsG,
        waterMl: body.waterMl,
        mealsPerDay: body.mealsPerDay,
        notes: body.notes ?? null,
        meals: {
          create: body.meals.map((m, i) => ({
            order: m.order ?? i,
            name: m.name,
            time: m.time ?? null,
            notes: m.notes ?? null,
            foods: {
              create: m.foods.map((f, j) => ({
                libraryId: f.libraryId ?? null,
                name: f.name,
                quantity: f.quantity,
                unit: f.unit,
                calories: f.calories,
                proteinG: f.proteinG,
                carbsG: f.carbsG,
                fatsG: f.fatsG,
                alternatives: f.alternatives,
                order: f.order ?? j,
              })),
            },
          })),
        },
      },
      include: { meals: { include: { foods: true } } },
    });
    if (plan.memberId) {
      await prisma.notification.create({
        data: {
          userId: plan.memberId,
          type: 'NUTRITION_ASSIGNED',
          title: 'New nutrition plan assigned',
          body: plan.name,
          link: '/member/nutrition',
        },
      });
    }
    return created(res, plan);
  }),
);

router.patch(
  '/:id',
  validate(planUpdateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof planUpdateSchema>;
    const id = req.params.id;
    const existing = await prisma.nutritionPlan.findUnique({ where: { id } });
    if (!existing) throw NotFound('Plan not found');

    const updated = await prisma.$transaction(async (tx) => {
      await tx.nutritionPlan.update({
        where: { id },
        data: {
          memberId: body.memberId ?? existing.memberId,
          isTemplate: body.isTemplate ?? existing.isTemplate,
          isActive: body.isActive ?? existing.isActive,
          name: body.name ?? existing.name,
          goal: body.goal ?? existing.goal,
          calories: body.calories ?? existing.calories,
          proteinG: body.proteinG ?? existing.proteinG,
          carbsG: body.carbsG ?? existing.carbsG,
          fatsG: body.fatsG ?? existing.fatsG,
          waterMl: body.waterMl ?? existing.waterMl,
          mealsPerDay: body.mealsPerDay ?? existing.mealsPerDay,
          notes: body.notes ?? existing.notes,
        },
      });

      if (body.meals) {
        await tx.meal.deleteMany({ where: { planId: id } });
        for (const m of body.meals) {
          await tx.meal.create({
            data: {
              planId: id,
              order: m.order,
              name: m.name,
              time: m.time ?? null,
              notes: m.notes ?? null,
              foods: {
                create: m.foods.map((f, j) => ({
                  libraryId: f.libraryId ?? null,
                  name: f.name,
                  quantity: f.quantity,
                  unit: f.unit,
                  calories: f.calories,
                  proteinG: f.proteinG,
                  carbsG: f.carbsG,
                  fatsG: f.fatsG,
                  alternatives: f.alternatives,
                  order: f.order ?? j,
                })),
              },
            },
          });
        }
      }
      return tx.nutritionPlan.findUniqueOrThrow({
        where: { id },
        include: {
          meals: { orderBy: { order: 'asc' }, include: { foods: { orderBy: { order: 'asc' } } } },
        },
      });
    });

    return ok(res, updated);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.nutritionPlan.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

router.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const original = await prisma.nutritionPlan.findUnique({
      where: { id: req.params.id },
      include: { meals: { include: { foods: true } } },
    });
    if (!original) throw NotFound('Plan not found');
    const dup = await prisma.nutritionPlan.create({
      data: {
        memberId: null,
        authorId: req.user?.sub,
        isTemplate: true,
        isActive: false,
        name: `${original.name} (copy)`,
        goal: original.goal,
        calories: original.calories,
        proteinG: original.proteinG,
        carbsG: original.carbsG,
        fatsG: original.fatsG,
        waterMl: original.waterMl,
        mealsPerDay: original.mealsPerDay,
        notes: original.notes,
        meals: {
          create: original.meals.map((m) => ({
            order: m.order,
            name: m.name,
            time: m.time,
            notes: m.notes,
            foods: {
              create: m.foods.map((f) => ({
                libraryId: f.libraryId,
                name: f.name,
                quantity: f.quantity,
                unit: f.unit,
                calories: f.calories,
                proteinG: f.proteinG,
                carbsG: f.carbsG,
                fatsG: f.fatsG,
                alternatives: f.alternatives ?? [],
                order: f.order,
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
    const original = await prisma.nutritionPlan.findUnique({
      where: { id: req.params.id },
      include: { meals: { include: { foods: true } } },
    });
    if (!original) throw NotFound('Plan not found');
    const result: { id: string; memberId: string }[] = [];
    for (const memberId of memberIds) {
      const cloned = await prisma.nutritionPlan.create({
        data: {
          memberId,
          authorId: req.user?.sub,
          isTemplate: false,
          isActive: true,
          name: original.name,
          goal: original.goal,
          calories: original.calories,
          proteinG: original.proteinG,
          carbsG: original.carbsG,
          fatsG: original.fatsG,
          waterMl: original.waterMl,
          mealsPerDay: original.mealsPerDay,
          notes: original.notes,
          meals: {
            create: original.meals.map((m) => ({
              order: m.order,
              name: m.name,
              time: m.time,
              notes: m.notes,
              foods: {
                create: m.foods.map((f) => ({
                  libraryId: f.libraryId,
                  name: f.name,
                  quantity: f.quantity,
                  unit: f.unit,
                  calories: f.calories,
                  proteinG: f.proteinG,
                  carbsG: f.carbsG,
                  fatsG: f.fatsG,
                  alternatives: f.alternatives ?? [],
                  order: f.order,
                })),
              },
            })),
          },
        },
      });
      await prisma.notification.create({
        data: {
          userId: memberId,
          type: 'NUTRITION_ASSIGNED',
          title: 'New nutrition plan assigned',
          body: original.name,
          link: '/member/nutrition',
        },
      });
      result.push({ id: cloned.id, memberId });
    }
    return ok(res, { assigned: result });
  }),
);

export default router;
