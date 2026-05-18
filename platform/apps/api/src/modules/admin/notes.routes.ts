import { Router } from 'express';
import { z } from 'zod';
import { NoteKind } from '@prisma/client';

import { asyncHandler } from '@/utils/asyncHandler.js';
import { created, noContent, ok } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';
import { validate } from '@/middleware/validate.js';

const router = Router();

const noteSchema = z.object({
  memberId: z.string(),
  body: z.string().min(1).max(4000),
  isPrivate: z.boolean().default(false),
  kind: z.nativeEnum(NoteKind).default(NoteKind.GENERAL),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { memberId } = req.query as { memberId?: string };
    const where = memberId ? { memberId } : {};
    const items = await prisma.adminNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, fullName: true } } },
    });
    return ok(res, items);
  }),
);

router.post(
  '/',
  validate(noteSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof noteSchema>;
    const note = await prisma.adminNote.create({
      data: { ...body, authorId: req.user?.sub ?? null },
    });
    if (!note.isPrivate) {
      await prisma.notification.create({
        data: {
          userId: note.memberId,
          type: 'NOTE_ADDED',
          title: 'New note from your coach',
          body: note.body.slice(0, 140),
          link: '/member/notes',
        },
      });
    }
    return created(res, note);
  }),
);

router.patch(
  '/:id',
  validate(noteSchema.partial()),
  asyncHandler(async (req, res) => {
    const note = await prisma.adminNote.update({
      where: { id: req.params.id },
      data: req.body as Partial<z.infer<typeof noteSchema>>,
    });
    return ok(res, note);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.adminNote.delete({ where: { id: req.params.id } });
    return noContent(res);
  }),
);

export default router;
