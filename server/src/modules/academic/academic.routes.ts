import { Router } from 'express';
import { AcademicController } from './academic.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const academicRouter = Router();

// Public read routes
academicRouter.get('/stages', AcademicController.getAllEducationalStages);
academicRouter.get('/stages/:stageId/grades', AcademicController.getGradesByStage);
academicRouter.get('/years', AcademicController.getAllAcademicYears);
academicRouter.get('/grades/:gradeId/subjects', AcademicController.getSubjectsByGrade);

// Admin-only creation routes
academicRouter.post(
  '/stages',
  authenticate,
  requireRole([Role.ADMIN]),
  AcademicController.createEducationalStage
);

academicRouter.post(
  '/grades',
  authenticate,
  requireRole([Role.ADMIN]),
  AcademicController.createGrade
);

academicRouter.post(
  '/years',
  authenticate,
  requireRole([Role.ADMIN]),
  AcademicController.createAcademicYear
);

academicRouter.post(
  '/grade-subjects',
  authenticate,
  requireRole([Role.ADMIN]),
  AcademicController.createGradeSubject
);

export default academicRouter;
