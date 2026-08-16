import { Router } from 'express';
import { CourseController } from './course.controller';
import { authenticate, requireRole, requireApprovedTeacher } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

export const subjectRouter = Router();
export const courseRouter = Router();

// Subject Routes
subjectRouter.get('/', CourseController.getAllSubjects);
subjectRouter.post('/', authenticate, requireRole([Role.ADMIN]), CourseController.createSubject);

// Course Routes
courseRouter.get('/', CourseController.getAllCourses);
courseRouter.get('/:id', CourseController.getCourseById);
courseRouter.post('/', authenticate, requireApprovedTeacher, CourseController.createCourse);
courseRouter.patch('/:id/publish', authenticate, requireApprovedTeacher, CourseController.publishCourse);

// Section Routes
courseRouter.post('/:courseId/sections', authenticate, requireApprovedTeacher, CourseController.createSection);
