import { Router } from 'express';
import { TeacherController } from './teacher.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';
import { validateBody } from '../../utils/validate';
import { z } from 'zod';

const teacherRouter = Router();
const announcementSchema = z.object({
  courseId: z.string().min(1).max(100).optional(),
  titleEn: z.string().trim().min(1).max(160),
  titleAr: z.string().trim().min(1).max(160),
  messageEn: z.string().trim().min(1).max(5000),
  messageAr: z.string().trim().min(1).max(5000),
}).strict();

teacherRouter.get(
  '/students',
  authenticate,
  requireApprovedTeacher,
  TeacherController.getEnrolledStudents
);

teacherRouter.get(
  '/students/:studentId/progress',
  authenticate,
  requireApprovedTeacher,
  TeacherController.getStudentProgress
);

teacherRouter.post(
  '/announcements',
  authenticate,
  requireApprovedTeacher,
  validateBody(announcementSchema),
  TeacherController.broadcastAnnouncement
);

teacherRouter.get(
  '/revenue',
  authenticate,
  requireApprovedTeacher,
  TeacherController.getRevenueSummary
);

export default teacherRouter;
