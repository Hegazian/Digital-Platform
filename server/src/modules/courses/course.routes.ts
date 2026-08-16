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
courseRouter.get('/:id', CourseController.getCourseById);
courseRouter.post('/', authenticate, requireApprovedTeacher, validateBody(createCourseSchema), CourseController.createCourse);
courseRouter.patch('/:id/publish', authenticate, requireApprovedTeacher, CourseController.publishCourse);

// Section Routes
courseRouter.get('/:courseId/sections', CourseController.getSectionsByCourse);
courseRouter.post('/:courseId/sections', authenticate, requireApprovedTeacher, validateBody(createSectionSchema), CourseController.createSection);
