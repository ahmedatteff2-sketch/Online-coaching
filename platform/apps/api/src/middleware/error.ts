import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '@/lib/errors.js';
import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';

export const notFoundHandler: ErrorRequestHandler = (_req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: { message: 'Validation failed', details: err.flatten() },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { message: 'Unique constraint violation', details: err.meta },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Resource not found' } });
    }
  }

  logger.error('Unhandled error', err);
  return res.status(500).json({
    error: {
      message: 'Internal server error',
      ...(env.NODE_ENV !== 'production' && err instanceof Error
        ? { stack: err.stack }
        : {}),
    },
  });
};
