import { Router } from 'express';
import { LiveController } from './live.controller';
import { authenticate, requireApprovedTeacher, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const liveRouter = Router();

liveRouter.post(
  '/sessions',
  authenticate,
  requireApprovedTeacher,
  LiveController.createLiveSession
);

liveRouter.get(
  '/sessions/subject/:subjectId',
  authenticate,
  requireRole([Role.STUDENT]),
  LiveController.getSubjectLiveSessions
);

export default liveRouter;
