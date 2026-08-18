import { Router } from 'express';
import { AssessmentController } from './assessment.controller';
import { authenticate, requireRole, requireApprovedTeacher } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const assessmentRouter = Router();

// Teacher Question Pool & Items Management
assessmentRouter.post(
  '/pools',
  authenticate,
  requireApprovedTeacher,
  AssessmentController.createQuestionPool
);

assessmentRouter.post(
  '/pools/:poolId/questions',
  authenticate,
  requireApprovedTeacher,
  AssessmentController.addQuestionItem
);

// Teacher Assessment Template Creation
assessmentRouter.post(
  '/assessments',
  authenticate,
  requireApprovedTeacher,
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
  AssessmentController.submitAttempt
);

export default assessmentRouter;
