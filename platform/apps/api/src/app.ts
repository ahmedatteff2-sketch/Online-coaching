import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'node:path';

import { env } from '@/config/env.js';
import { errorHandler, notFoundHandler } from '@/middleware/error.js';
import healthRoutes from '@/modules/health/health.routes.js';
import authRoutes from '@/modules/auth/auth.routes.js';
import landingRoutes from '@/modules/landing/landing.routes.js';
import contactRoutes from '@/modules/landing/contact.routes.js';
import uploadRoutes from '@/modules/uploads/uploads.routes.js';
import adminRoutes from '@/modules/admin/admin.routes.js';
import memberRoutes from '@/modules/member/member.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // Static uploads
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadDir, { fallthrough: true, maxAge: '1d' }));

  // Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/landing', landingRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/member', memberRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
