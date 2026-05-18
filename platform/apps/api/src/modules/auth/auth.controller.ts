import type { Request, Response } from 'express';
import { ok } from '@/utils/response.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { loginSchema } from './auth.schemas.js';
import {
  loginByPhone,
  rotateRefreshToken,
  revokeRefreshToken,
  getMe,
} from './auth.service.js';
import { Unauthorized, NotFound } from '@/lib/errors.js';
import { env } from '@/config/env.js';

const REFRESH_COOKIE = 'fc_rt';

function setRefreshCookie(res: Response, token: string, maxAgeMs: number) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/api/auth',
    maxAge: maxAgeMs,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/api/auth',
  });
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { phone, password } = loginSchema.parse(req.body);
  const result = await loginByPhone(phone, password);
  setRefreshCookie(res, result.refreshToken, result.refreshTtlMs);
  return ok(res, { user: result.user, accessToken: result.accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) throw Unauthorized('Missing refresh token');
  const result = await rotateRefreshToken(raw);
  setRefreshCookie(res, result.refreshToken, result.refreshTtlMs);
  return ok(res, { user: result.user, accessToken: result.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  await revokeRefreshToken(raw);
  clearRefreshCookie(res);
  return ok(res, { success: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw Unauthorized();
  const user = await getMe(req.user.sub);
  if (!user) throw NotFound('User not found');
  return ok(res, { user });
});
