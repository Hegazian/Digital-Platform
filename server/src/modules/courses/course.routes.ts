import { Router } from 'express';
import { CourseController } from './course.controller';
import { authenticate, requireRole, requireApprovedTeacher } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { validateBody } from '../../utils/validate';
import { createCourseSchema, createSectionSchema } from '../../utils/schemas';

export const subjectRouter = Router();
export const courseRouter = Router();

// Subject Routes
subjectRouter.get('/', CourseController.getAllSubjects);
subjectRouter.get('/:id', CourseController.getSubjectById);
subjectRouter.post('/', authenticate, requireRole([Role.ADMIN]), CourseController.createSubject);
subjectRouter.patch('/:id', authenticate, requireRole([Role.ADMIN]), CourseController.updateSubject);

// Course Routes
courseRouter.get('/', CourseController.getAllCourses);
courseRouter.get('/teacher/dashboard', authenticate, requireApprovedTeacher, CourseController.getTeacherDashboard);
courseRouter.get('/:id', CourseController.getCourseById);
courseRouter.post('/', authenticate, requireApprovedTeacher, validateBody(createCourseSchema), CourseController.createCourse);
courseRouter.patch('/:id/publish', authenticate, requireApprovedTeacher, CourseController.publishCourse);
courseRouter.post('/:id/submit', authenticate, requireApprovedTeacher, CourseController.submitCourseForReview);
courseRouter.post('/:id/review', authenticate, requireRole([Role.ADMIN]), CourseController.reviewCourseStatus);

// Section & Module Routes
courseRouter.get('/:courseId/sections', CourseController.getSectionsByCourse);
courseRouter.post('/:courseId/sections', authenticate, requireApprovedTeacher, validateBody(createSectionSchema), CourseController.createSection);
courseRouter.post('/:courseId/modules', authenticate, requireApprovedTeacher, CourseController.createModule);
courseRouter.delete('/modules/:moduleId', authenticate, requireApprovedTeacher, CourseController.deleteModule);
courseRouter.post('/:courseId/modules/reorder', authenticate, requireApprovedTeacher, CourseController.reorderModules);

// Module Lessons & Resources Routes
courseRouter.post('/modules/:moduleId/lessons', authenticate, requireApprovedTeacher, CourseController.createLesson);
courseRouter.post('/lessons/:lessonId/video', authenticate, requireApprovedTeacher, CourseController.attachVideoToLesson);
courseRouter.post('/lessons/:lessonId/material', authenticate, requireApprovedTeacher, CourseController.attachMaterialToLesson);
courseRouter.post('/lessons/:lessonId/quiz', authenticate, requireApprovedTeacher, CourseController.attachQuizToLesson);
courseRouter.delete('/lessons/:lessonId', authenticate, requireApprovedTeacher, CourseController.deleteLesson);

// Lesson Blocks & Grading Routes
courseRouter.post('/lessons/:lessonId/blocks', authenticate, requireApprovedTeacher, CourseController.addLessonBlock);
courseRouter.post('/assignment-submissions/:submissionId/grade', authenticate, requireApprovedTeacher, CourseController.gradeAssignmentSubmission);
