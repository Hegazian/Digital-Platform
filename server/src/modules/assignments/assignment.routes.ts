import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AssignmentController } from './assignment.controller';
import { authenticate, requireApprovedTeacher, requireRole, AuthRequest } from '../auth/auth.middleware';
import { validateBody } from '../../utils/validate';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} from '../../utils/schemas';
import { EntitlementResolver } from '../commerce/entitlement-resolver.service';
import { Role } from '@prisma/client';

const ALLOWED_SUBMISSION_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_SUBMISSION_MIME.has(file.mimetype)) return cb(null, true);
    cb(new (require('../../utils/errors').BadRequestError)(
      `Unsupported file type "${file.mimetype}". Allowed: pdf, docx, txt, jpg, png, webp`
    ));
  },
});

const router = Router();

/**
 * NFR-001 / TC-STUDENT-032: submitting to a course-attached assignment
 * requires an active entitlement (or ownership/admin).
 */
const assertAssignmentLearningAccess = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const content = await EntitlementResolver.resolveAssignmentCourse(req.params.id as string);
    await EntitlementResolver.assertLearningAccess(req.user!.userId, req.user?.role, {
      courseId: content?.courseId ?? null,
      teacherId: content?.teacherId ?? null,
    });
    next();
  } catch (error) {
    next(error);
  }
};

// Student endpoints
router.get('/my-submissions', authenticate, AssignmentController.getStudentSubmissions);
// Submission file upload (students) — returns a hosted fileUrl.
router.post(
  '/uploads',
  authenticate,
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => AssignmentController.uploadSubmissionFile(req as AuthRequest, res, next)
);
// NOTE: literal-path routes MUST be declared before parameterized '/:id'
// routes, otherwise 'lesson' is consumed as an :id and the endpoint is dead.
router.get('/lesson/:lessonId', authenticate, AssignmentController.getAssignmentsByLesson);
router.post(
  '/:id/submit',
  authenticate,
  assertAssignmentLearningAccess,
  validateBody(submitAssignmentSchema),
  AssignmentController.submitAssignment
);
router.get('/:id', authenticate, AssignmentController.getAssignmentById);

// Teacher / Admin endpoints
router.post(
  '/lesson/:lessonId',
  authenticate,
  requireApprovedTeacher,
  requireRole([Role.TEACHER]),
  validateBody(createAssignmentSchema),
  AssignmentController.createAssignment
);
router.patch('/:id', authenticate, requireApprovedTeacher, validateBody(updateAssignmentSchema), AssignmentController.updateAssignment);
router.delete('/:id', authenticate, requireApprovedTeacher, AssignmentController.deleteAssignment);
router.get('/:id/submissions', authenticate, requireApprovedTeacher, AssignmentController.getSubmissionsByAssignment);
router.post(
  '/submissions/:submissionId/grade',
  authenticate,
  requireApprovedTeacher,
  requireRole([Role.TEACHER]),
  validateBody(gradeSubmissionSchema),
  AssignmentController.gradeSubmission
);

export default router;
