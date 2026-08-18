import { Router } from 'express';
import { TeacherController } from './teacher.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';

const teacherRouter = Router();

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
  TeacherController.broadcastAnnouncement
);

teacherRouter.get(
  '/revenue',
  authenticate,
  requireApprovedTeacher,
  TeacherController.getRevenueSummary
);

export default teacherRouter;
