import { Router } from 'express';
import { login, refresh, logout, me } from './auth.controller.js';
import { loginLimiter } from '@/middleware/rateLimit.js';
import { requireAuth } from '@/middleware/auth.js';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
