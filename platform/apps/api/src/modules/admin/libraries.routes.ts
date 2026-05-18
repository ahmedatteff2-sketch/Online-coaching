import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '@/utils/asyncHandler.js';
import { created, noContent, ok } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';
import { validate } from '@/middleware/validate.js';

const exerciseLibrarySchema = z.object({
  name: z.string().min(1),
  muscleGroup: z.string().min(1),
  videoUrl: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  imageUrl: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  instructions: z.string().optional().nullable(),
  defaultSets: z.number().int().min(1).max(20).default(3),
  defaultRepsMin: z.number().int().min(1).max(100).default(8),
  defaultRepsMax: z.number().int().min(1).max(200).default(12),
  defaultRestSeconds: z.number().int().min(0).max(900).default(90),
});

const exerciseLibrary = Router();
exerciseLibrary.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, muscleGroup } = req.query as { search?: string; muscleGroup?: string };
    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (muscleGroup) where.muscleGroup = muscleGroup;
    const items = await prisma.exerciseLibrary.findMany({ where, orderBy: { name: 'asc' } });
    return ok(res, items);
  }),
);
exerciseLibrary.post(
  '/',
  validate(exerciseLibrarySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof exerciseLibrarySchema>;
    const item = await prisma.exerciseLibrary.create({
      data: { ...body, createdById: req.user?.sub ?? null },
    });
    return created(res, item);
  }),
);
exerciseLibrary.patch(
  '/:id',
  validate(exerciseLibrarySchema.partial()),
  asyncHandler(async (req, res) => {
    const item = await prisma.exerciseLibrary.update({
      where: { id: req.params.id },
      data: req.body as Partial<z.infer<typeof exerciseLibrarySchema>>,
    });
    return ok(res, item);
  }),
);
exerciseLibrary.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.exerciseLibrary.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

const foodLibrarySchema = z.object({
  name: z.string().min(1),
  servingSize: z.number().min(0).default(100),
  unit: z.string().default('g'),
  calories: z.number().min(0).default(0),
  proteinG: z.number().min(0).default(0),
  carbsG: z.number().min(0).default(0),
  fatsG: z.number().min(0).default(0),
});

const foodLibrary = Router();
foodLibrary.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search } = req.query as { search?: string };
    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const items = await prisma.foodLibrary.findMany({ where, orderBy: { name: 'asc' } });
    return ok(res, items);
  }),
);
foodLibrary.post(
  '/',
  validate(foodLibrarySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof foodLibrarySchema>;
    const item = await prisma.foodLibrary.create({
      data: { ...body, createdById: req.user?.sub ?? null },
    });
    return created(res, item);
  }),
);
foodLibrary.patch(
  '/:id',
  validate(foodLibrarySchema.partial()),
  asyncHandler(async (req, res) => {
    const item = await prisma.foodLibrary.update({
      where: { id: req.params.id },
      data: req.body as Partial<z.infer<typeof foodLibrarySchema>>,
    });
    return ok(res, item);
  }),
);
foodLibrary.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.foodLibrary.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

export default { exercise: exerciseLibrary, food: foodLibrary };
