import { Router } from 'express';
import { requireAuth, requireAdmin } from '@/middleware/auth.js';
import members from './members.routes.js';
import training from './training.routes.js';
import nutrition from './nutrition.routes.js';
import libraries from './libraries.routes.js';
import landing from './landing.routes.js';
import notes from './notes.routes.js';
import overview from './overview.routes.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.use('/overview', overview);
router.use('/members', members);
router.use('/training-plans', training);
router.use('/nutrition-plans', nutrition);
router.use('/exercise-library', libraries.exercise);
router.use('/food-library', libraries.food);
router.use('/notes', notes);
// Landing CMS (settings, sections, services, testimonials, faqs, pricing, contact-messages)
router.use('/', landing);

export default router;
