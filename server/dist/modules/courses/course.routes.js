"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseRouter = exports.subjectRouter = void 0;
const express_1 = require("express");
const course_controller_1 = require("./course.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const validate_1 = require("../../utils/validate");
const schemas_1 = require("../../utils/schemas");
exports.subjectRouter = (0, express_1.Router)();
exports.courseRouter = (0, express_1.Router)();
// Subject Routes
exports.subjectRouter.get('/', course_controller_1.CourseController.getAllSubjects);
exports.subjectRouter.get('/:id', course_controller_1.CourseController.getSubjectById);
exports.subjectRouter.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), course_controller_1.CourseController.createSubject);
exports.subjectRouter.patch('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), course_controller_1.CourseController.updateSubject);
// Course Routes
exports.courseRouter.get('/', course_controller_1.CourseController.getAllCourses);
exports.courseRouter.get('/teacher/dashboard', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.getTeacherDashboard);
exports.courseRouter.get('/:id', course_controller_1.CourseController.getCourseById);
exports.courseRouter.post('/', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, (0, validate_1.validateBody)(schemas_1.createCourseSchema), course_controller_1.CourseController.createCourse);
exports.courseRouter.patch('/:id/publish', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.publishCourse);
exports.courseRouter.post('/:id/submit', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.submitCourseForReview);
exports.courseRouter.post('/:id/review', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), course_controller_1.CourseController.reviewCourseStatus);
// Section & Module Routes
exports.courseRouter.get('/:courseId/sections', course_controller_1.CourseController.getSectionsByCourse);
exports.courseRouter.post('/:courseId/sections', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, (0, validate_1.validateBody)(schemas_1.createSectionSchema), course_controller_1.CourseController.createSection);
exports.courseRouter.post('/:courseId/modules', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.createModule);
exports.courseRouter.delete('/modules/:moduleId', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.deleteModule);
exports.courseRouter.post('/:courseId/modules/reorder', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.reorderModules);
// Module Lessons & Resources Routes
exports.courseRouter.post('/modules/:moduleId/lessons', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.createLesson);
exports.courseRouter.post('/lessons/:lessonId/video', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.attachVideoToLesson);
exports.courseRouter.post('/lessons/:lessonId/material', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.attachMaterialToLesson);
exports.courseRouter.post('/lessons/:lessonId/quiz', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.attachQuizToLesson);
exports.courseRouter.delete('/lessons/:lessonId', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.deleteLesson);
// Lesson Blocks & Grading Routes
exports.courseRouter.post('/lessons/:lessonId/blocks', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.addLessonBlock);
exports.courseRouter.post('/assignment-submissions/:submissionId/grade', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, course_controller_1.CourseController.gradeAssignmentSubmission);
