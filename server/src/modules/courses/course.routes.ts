import { Router } from 'express';
import { CourseController } from './course.controller';
import { authenticate, optionalAuth, requireRole, requireApprovedTeacher } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { validateBody } from '../../utils/validate';
import {
  createCourseSchema,
  createSectionSchema,
  updateCourseSchema,
  createSubjectSchema,
  updateSubjectSchema,
  updateSubjectPricingSchema,
  reorderModulesSchema,
  reorderLessonsSchema,
  updateModuleSchema,
  updateLessonSchema,
} from '../../utils/schemas';

export const subjectRouter = Router();
export const courseRouter = Router();

// Subject Routes
subjectRouter.get('/', CourseController.getAllSubjects);
subjectRouter.get('/:id', CourseController.getSubjectById);
subjectRouter.post('/', authenticate, requireRole([Role.ADMIN]), validateBody(createSubjectSchema), CourseController.createSubject);
subjectRouter.patch('/:id', authenticate, requireRole([Role.ADMIN]), validateBody(updateSubjectSchema), CourseController.updateSubject);
subjectRouter.delete('/:id', authenticate, requireRole([Role.ADMIN]), CourseController.deleteSubject);
subjectRouter.put(
  '/:id/pricing',
  authenticate,
  requireRole([Role.ADMIN]),
  validateBody(updateSubjectPricingSchema),
  CourseController.updateSubjectPricing
);

// Course Routes
// Reads use optionalAuth: anonymous visitors see published courses only;
// authenticated students/teachers/admins get role-scoped visibility.
courseRouter.get('/', optionalAuth, CourseController.getAllCourses);
courseRouter.get('/teacher/dashboard', authenticate, requireApprovedTeacher, CourseController.getTeacherDashboard);
courseRouter.get('/teacher/my-courses', authenticate, requireApprovedTeacher, CourseController.getTeacherCourses);
courseRouter.get('/:id', optionalAuth, CourseController.getCourseById);
courseRouter.post('/', authenticate, requireApprovedTeacher, validateBody(createCourseSchema), CourseController.createCourse);
courseRouter.patch('/:id', authenticate, requireApprovedTeacher, validateBody(updateCourseSchema), CourseController.updateCourse);
courseRouter.delete('/:id', authenticate, requireApprovedTeacher, CourseController.deleteCourse);
courseRouter.patch('/:id/publish', authenticate, requireRole([Role.ADMIN]), CourseController.publishCourse);
courseRouter.patch('/:id/archive', authenticate, requireApprovedTeacher, CourseController.archiveCourse);
courseRouter.post('/:id/enroll', authenticate, CourseController.enrollCourse);
courseRouter.post('/:id/submit', authenticate, requireApprovedTeacher, CourseController.submitCourseForReview);
courseRouter.post('/:id/review', authenticate, requireRole([Role.ADMIN]), CourseController.reviewCourseStatus);

// Section & Module Routes
courseRouter.get('/:courseId/sections', optionalAuth, CourseController.getSectionsByCourse);
courseRouter.post('/:courseId/sections', authenticate, requireApprovedTeacher, validateBody(createSectionSchema), CourseController.createSection);
courseRouter.post('/:courseId/modules', authenticate, requireApprovedTeacher, CourseController.createModule);
courseRouter.patch('/modules/:moduleId', authenticate, requireApprovedTeacher, validateBody(updateModuleSchema), CourseController.updateModule);
courseRouter.delete('/modules/:moduleId', authenticate, requireApprovedTeacher, CourseController.deleteModule);
courseRouter.post(
  '/:courseId/modules/reorder',
  authenticate,
  requireApprovedTeacher,
  validateBody(reorderModulesSchema),
  CourseController.reorderModules
);

// Module Lessons & Resources Routes
courseRouter.post('/modules/:moduleId/lessons', authenticate, requireApprovedTeacher, CourseController.createLesson);
courseRouter.patch('/lessons/:lessonId', authenticate, requireApprovedTeacher, validateBody(updateLessonSchema), CourseController.updateLesson);
courseRouter.post(
  '/lessons/reorder',
  authenticate,
  requireApprovedTeacher,
  validateBody(reorderLessonsSchema),
  CourseController.reorderLessons
);
courseRouter.post('/lessons/:lessonId/video', authenticate, requireApprovedTeacher, CourseController.attachVideoToLesson);
courseRouter.post('/lessons/:lessonId/material', authenticate, requireApprovedTeacher, CourseController.attachMaterialToLesson);
courseRouter.post('/lessons/:lessonId/quiz', authenticate, requireApprovedTeacher, CourseController.attachQuizToLesson);
courseRouter.delete('/lessons/:lessonId', authenticate, requireApprovedTeacher, CourseController.deleteLesson);

// Lesson Blocks Routes
// NOTE: grading lives exclusively in the assignments module
// (POST /assignments/submissions/:id/grade) which enforces assignment
// ownership and score bounds. The former unscoped shadow endpoint here was
// removed (NFR-001).
courseRouter.post('/lessons/:lessonId/blocks', authenticate, requireApprovedTeacher, CourseController.addLessonBlock);
