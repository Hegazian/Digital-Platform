import { Router } from 'express';
import { z } from 'zod';
import { CareersController } from './careers.controller';
import { authenticate } from '../auth/auth.middleware';
import { validateBody } from '../../utils/validate';

const router = Router();

const setTrackSchema = z.object({
  // null/absent clears the preference; otherwise a known active track slug.
  slug: z.string().min(2).max(40).nullable().optional(),
});

// Public catalog of aspirational tracks (drives the onboarding picker)
router.get('/', CareersController.listTracks);

// Personal selection
router.get('/mine', authenticate, CareersController.getMyTrack);
router.get('/mine/progress', authenticate, CareersController.getMyTrackProgress);
router.put(
  '/mine',
  authenticate,
  validateBody(setTrackSchema),
  CareersController.setMyTrack
);

export default router;
