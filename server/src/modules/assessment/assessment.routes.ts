import { Router } from 'express';
import { AssessmentController } from './assessment.controller';
import { authenticate, requireApprovedTeacher, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { validateBody } from '../../utils/validate';
import {
  createQuestionPoolSchema,
  addQuestionItemSchema,
  createAssessmentSchema,
  submitAssessmentAttemptSchema,
} from '../../utils/schemas';

const assessmentRouter = Router();

// Catalog reads (teachers author from pools; students browse exams)
assessmentRouter.get('/pools', authenticate, requireApprovedTeacher, AssessmentController.listQuestionPools);
assessmentRouter.get('/assessments', authenticate, AssessmentController.listAssessments);

// Teacher Question Pool & Items Management
assessmentRouter.post(
  '/pools',
  authenticate,
  requireApprovedTeacher,
  validateBody(createQuestionPoolSchema),
  AssessmentController.createQuestionPool
);

assessmentRouter.post(
  '/pools/:poolId/questions',
  authenticate,
  requireApprovedTeacher,
  validateBody(addQuestionItemSchema),
  AssessmentController.addQuestionItem
);

// Teacher Assessment Template Creation
assessmentRouter.post(
  '/assessments',
  authenticate,
  requireApprovedTeacher,
  validateBody(createAssessmentSchema),
  AssessmentController.createAssessment
);

// Student Exam Assembly & Attempts
assessmentRouter.post(
  '/assessments/:assessmentId/start',
  authenticate,
  requireRole([Role.STUDENT]),
  AssessmentController.startAssessmentAttempt
);

assessmentRouter.get(
  '/attempts/:attemptId',
  authenticate,
  requireRole([Role.STUDENT]),
  AssessmentController.getAttempt
);

assessmentRouter.post(
  '/attempts/:attemptId/submit',
  authenticate,
  requireRole([Role.STUDENT]),
  validateBody(submitAssessmentAttemptSchema),
  AssessmentController.submitAttempt
);

export default assessmentRouter;
