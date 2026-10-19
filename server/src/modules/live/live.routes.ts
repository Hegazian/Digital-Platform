import { Router } from 'express';
import { LiveController } from './live.controller';
import { authenticate, requireApprovedTeacher, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../utils/validate';
import { createLiveSessionSchema } from '../../utils/schemas';
import { Role } from '@prisma/client';

const liveRouter = Router();

liveRouter.post(
  '/sessions',
  authenticate,
  requireApprovedTeacher,
  validateBody(createLiveSessionSchema),
  LiveController.createLiveSession
);

liveRouter.get(
  '/sessions/subject/:subjectId',
  authenticate,
  requireRole([Role.STUDENT]),
  LiveController.getSubjectLiveSessions
);

export default liveRouter;
