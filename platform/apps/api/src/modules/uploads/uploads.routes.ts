import { Router } from 'express';
import { uploadImage } from '@/middleware/upload.js';
import { requireAuth } from '@/middleware/auth.js';
import { ok } from '@/utils/response.js';
import { env } from '@/config/env.js';
import { BadRequest } from '@/lib/errors.js';

const router = Router();

router.post(
  '/image',
  requireAuth,
  uploadImage.single('file'),
  (req, res, next) => {
    if (!req.file) return next(BadRequest('No file provided (field: "file")'));
    const url = `${env.PUBLIC_BASE_URL}/uploads/${req.file.filename}`;
    return ok(res, { url, filename: req.file.filename, size: req.file.size, mime: req.file.mimetype });
  },
);

export default router;
