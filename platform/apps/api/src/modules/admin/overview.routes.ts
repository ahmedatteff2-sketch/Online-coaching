import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { ok } from '@/utils/response.js';
import { prisma } from '@/lib/prisma.js';
import { Role, MemberStatus } from '@prisma/client';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    const [
      totalMembers,
      activeMembers,
      inactiveMembers,
      expiredMembers,
      recentWeights,
      recentWorkouts,
      recentPhotos,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.MEMBER } }),
      prisma.memberProfile.count({ where: { status: MemberStatus.ACTIVE } }),
      prisma.memberProfile.count({ where: { status: MemberStatus.INACTIVE } }),
      prisma.memberProfile.count({ where: { status: MemberStatus.EXPIRED } }),
      prisma.weightLog.findMany({
        where: { date: { gte: sevenDaysAgo } },
        orderBy: { date: 'desc' },
        take: 8,
        include: { member: { select: { id: true, fullName: true, profileImage: true } } },
      }),
      prisma.workoutLog.findMany({
        where: { date: { gte: sevenDaysAgo } },
        orderBy: { date: 'desc' },
        take: 8,
        include: { member: { select: { id: true, fullName: true } } },
      }),
      prisma.progressPhoto.findMany({
        where: { date: { gte: sevenDaysAgo } },
        orderBy: { date: 'desc' },
        take: 8,
        include: { member: { select: { id: true, fullName: true } } },
      }),
    ]);

    return ok(res, {
      totals: { totalMembers, activeMembers, inactiveMembers, expiredMembers },
      recentWeights,
      recentWorkouts,
      recentPhotos,
    });
  }),
);

export default router;
