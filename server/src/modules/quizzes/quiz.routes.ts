import { Router } from 'express';
import { QuizController } from './quiz.controller';
import { authenticate, requireApprovedTeacher, AuthRequest } from '../auth/auth.middleware';
import { validateBody } from '../../utils/validate';
import { createQuizSchema, submitQuizAttemptSchema, updateQuizSchema } from '../../utils/schemas';
import { EntitlementResolver } from '../commerce/entitlement-resolver.service';
import { NextFunction, Response } from 'express';

const quizRouter = Router();

/**
 * NFR-001 / TC-STUDENT-032: attempting a course-attached quiz requires an
 * active entitlement (or ownership/admin). Standalone practice quizzes stay
 * open to any authenticated user.
 */
const assertQuizLearningAccess = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const content = await EntitlementResolver.resolveQuizCourse(req.params.id as string);
    await EntitlementResolver.assertLearningAccess(req.user!.userId, req.user?.role, {
      courseId: content?.courseId ?? null,
      teacherId: content?.teacherId ?? null,
    });
    next();
  } catch (error) {
    next(error);
  }
};

// Teacher routes
quizRouter.post('/', authenticate, requireApprovedTeacher, validateBody(createQuizSchema), QuizController.createQuiz);
quizRouter.patch('/:id', authenticate, requireApprovedTeacher, validateBody(updateQuizSchema), QuizController.updateQuiz);

// Shared / Student routes
quizRouter.get('/:id', authenticate, QuizController.getQuiz);
quizRouter.post('/:id/attempts/start', authenticate, assertQuizLearningAccess, QuizController.startAttempt);
quizRouter.post('/:id/attempts', authenticate, assertQuizLearningAccess, validateBody(submitQuizAttemptSchema), QuizController.submitAttempt);
quizRouter.get('/:id/attempts', authenticate, QuizController.getMyAttempts);

export default quizRouter;
