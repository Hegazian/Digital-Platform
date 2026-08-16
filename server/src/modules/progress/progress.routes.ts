import { Router } from 'express';
import { ProgressController } from './progress.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// All progress endpoints require authentication
router.use(authenticate);

router.get('/summary', ProgressController.getSummary);
router.post('/:lessonId', ProgressController.updateWatchTime);
router.post('/:lessonId/complete', ProgressController.markCompleted);

export default router;
