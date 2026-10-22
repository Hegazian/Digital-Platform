import { Router } from 'express';
import { LiveController } from './live.controller';
import { authenticate, requireApprovedTeacher, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { validateBody } from '../../utils/validate';
import { z } from 'zod';

const liveRouter = Router();
const liveSessionSchema = z.object({
  subjectId: z.string().min(1).max(100),
  titleEn: z.string().trim().min(1).max(160),
  titleAr: z.string().trim().min(1).max(160),
  startTime: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(1).max(600),
  joinUrl: z.url().startsWith('https://').optional(),
  zoomStartUrl: z.url().startsWith('https://').optional(),
}).strict();

liveRouter.post(
  '/sessions',
  authenticate,
  requireApprovedTeacher,
  validateBody(liveSessionSchema),
  LiveController.createLiveSession
);

liveRouter.get(
  '/sessions/subject/:subjectId',
  authenticate,
  requireRole([Role.STUDENT]),
  LiveController.getSubjectLiveSessions
);

export default liveRouter;
