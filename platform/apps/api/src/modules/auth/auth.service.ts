import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { v4 as uuid } from 'uuid';
import type { Role } from '@prisma/client';

import { prisma } from '@/lib/prisma.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/lib/jwt.js';
import { Unauthorized } from '@/lib/errors.js';
import { env } from '@/config/env.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function ttlToMs(ttl: string): number {
  // Supports e.g. "30d", "15m", "1h"
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return 30 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2];
  const map: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (map[unit] ?? 86_400_000);
}

export interface AuthenticatedUser {
  id: string;
  phone: string;
  fullName: string;
  role: Role;
  profileImage: string | null;
  isActive: boolean;
}

export async function loginByPhone(phone: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: {
      id: true,
      phone: true,
      passwordHash: true,
      role: true,
      fullName: true,
      profileImage: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) throw Unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw Unauthorized('Invalid credentials');

  return issueTokens({
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    profileImage: user.profileImage,
    isActive: user.isActive,
  });
}

export async function issueTokens(user: AuthenticatedUser) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    name: user.fullName,
  });

  const jti = uuid();
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL));

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return { user, accessToken, refreshToken, refreshTtlMs: ttlToMs(env.JWT_REFRESH_TTL) };
}

export async function rotateRefreshToken(rawToken: string) {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw Unauthorized('Invalid refresh token');
  }

  const tokenHash = hashToken(rawToken);
  const record = await prisma.refreshToken.findUnique({
    where: { id: payload.jti },
  });
  if (!record) throw Unauthorized('Invalid refresh token');
  if (record.tokenHash !== tokenHash) throw Unauthorized('Invalid refresh token');
  if (record.revokedAt) throw Unauthorized('Refresh token revoked');
  if (record.expiresAt < new Date()) throw Unauthorized('Refresh token expired');

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: {
      id: true,
      phone: true,
      role: true,
      fullName: true,
      profileImage: true,
      isActive: true,
    },
  });
  if (!user || !user.isActive) throw Unauthorized('User no longer active');

  return issueTokens(user);
}

export async function revokeRefreshToken(rawToken: string | undefined) {
  if (!rawToken) return;
  try {
    const payload = verifyRefreshToken(rawToken);
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    /* ignore — best-effort */
  }
}

export async function getMe(userId: string): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      fullName: true,
      role: true,
      profileImage: true,
      isActive: true,
    },
  });
  return user;
}
