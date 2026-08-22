import { Router } from 'express';
import { AcademicController } from './academic.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../utils/validate';
import {
  createStageSchema,
  createGradeSchema,
  createAcademicYearSchema,
  createGradeSubjectSchema,
  updateAcademicYearSchema,
} from '../../utils/schemas';
import { z } from 'zod';
import { Role } from '@prisma/client';

const academicRouter = Router();
const adminOnly = [authenticate, requireRole([Role.ADMIN])];

// Public read routes
academicRouter.get('/stages', AcademicController.getAllEducationalStages);
academicRouter.get('/stages/:stageId/grades', AcademicController.getGradesByStage);
academicRouter.get('/years', AcademicController.getAllAcademicYears);
academicRouter.get('/grades/:gradeId/subjects', AcademicController.getSubjectsByGrade);

// Grade-subject associations (authenticated read; used by course authoring UI)
academicRouter.get('/grade-subjects', authenticate, AcademicController.getGradeSubjects);

// Admin-only writes: stages
academicRouter.post('/stages', ...adminOnly, validateBody(createStageSchema), AcademicController.createEducationalStage);
academicRouter.patch(
  '/stages/:stageId',
  ...adminOnly,
  validateBody(createStageSchema.partial()),
  AcademicController.updateEducationalStage
);
academicRouter.delete('/stages/:stageId', ...adminOnly, AcademicController.deleteEducationalStage);

// Admin-only writes: grades
academicRouter.post('/grades', ...adminOnly, validateBody(createGradeSchema), AcademicController.createGrade);
academicRouter.patch(
  '/grades/:gradeId',
  ...adminOnly,
  validateBody(createGradeSchema.omit({ stageId: true }).partial()),
  AcademicController.updateGrade
);
academicRouter.delete('/grades/:gradeId', ...adminOnly, AcademicController.deleteGrade);

// Admin-only writes: academic years
academicRouter.post('/years', ...adminOnly, validateBody(createAcademicYearSchema), AcademicController.createAcademicYear);
academicRouter.patch(
  '/years/:yearId',
  ...adminOnly,
  validateBody(updateAcademicYearSchema),
  AcademicController.updateAcademicYear
);
academicRouter.delete('/years/:yearId', ...adminOnly, AcademicController.deleteAcademicYear);

// Admin-only writes: grade-subject associations
academicRouter.post(
  '/grade-subjects',
  ...adminOnly,
  validateBody(createGradeSubjectSchema),
  AcademicController.createGradeSubject
);
academicRouter.patch(
  '/grade-subjects/:id',
  ...adminOnly,
  validateBody(z.object({ isActive: z.boolean() })),
  AcademicController.updateGradeSubject
);
academicRouter.delete('/grade-subjects/:id', ...adminOnly, AcademicController.deleteGradeSubject);

export default academicRouter;
