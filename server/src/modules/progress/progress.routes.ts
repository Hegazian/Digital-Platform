import { Router, Response, NextFunction } from 'express';
import { ProgressController } from './progress.controller';
import { authenticate, AuthRequest } from '../auth/auth.middleware';
import { validateBody } from '../../utils/validate';
import { updateWatchTimeSchema } from '../../utils/schemas';
import { EntitlementResolver } from '../commerce/entitlement-resolver.service';

const router = Router();

/**
 * NFR-001 / TC-STUDENT-033: progress may only be recorded for lessons inside
 * courses the user is entitled to (or owns / admin).
 */
const assertLessonLearningAccess = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const content = await EntitlementResolver.resolveLessonCourse(req.params.lessonId as string);
    await EntitlementResolver.assertLearningAccess(req.user!.userId, req.user?.role, {
      courseId: content?.courseId ?? null,
      teacherId: content?.teacherId ?? null,
    });
    next();
  } catch (error) {
    next(error);
  }
};

// All progress endpoints require authentication
router.use(authenticate);

router.get('/summary', ProgressController.getSummary);
// Literal path BEFORE '/:lessonId' patterns.
router.get('/course/:courseId', ProgressController.getCourseProgress);
router.post('/:lessonId', assertLessonLearningAccess, validateBody(updateWatchTimeSchema), ProgressController.updateWatchTime);
router.post('/:lessonId/complete', assertLessonLearningAccess, ProgressController.markCompleted);

export default router;
