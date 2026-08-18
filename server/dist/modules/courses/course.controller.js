"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseController = void 0;
const subject_service_1 = require("./subject.service");
const course_service_1 = require("./course.service");
const section_service_1 = require("./section.service");
class CourseController {
    // Subject Handlers
    static async getAllSubjects(req, res, next) {
        try {
            const subjects = await subject_service_1.SubjectService.getAllSubjects();
            res.status(200).json({ success: true, data: subjects });
        }
        catch (error) {
            next(error);
        }
    }
    static async createSubject(req, res, next) {
        try {
            const subject = await subject_service_1.SubjectService.createSubject(req.body);
            res.status(201).json({ success: true, data: subject });
        }
        catch (error) {
            next(error);
        }
    }
    // Course Handlers
    static async getAllCourses(req, res, next) {
        try {
            const courses = await course_service_1.CourseService.getAllCourses(req.query);
            res.status(200).json({ success: true, data: courses });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCourseById(req, res, next) {
        try {
            const course = await course_service_1.CourseService.getCourseById(req.params.id);
            res.status(200).json({ success: true, data: course });
        }
        catch (error) {
            next(error);
        }
    }
    static async createCourse(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const course = await course_service_1.CourseService.createCourse({ ...req.body, teacherId });
            res.status(201).json({ success: true, data: course });
        }
        catch (error) {
            next(error);
        }
    }
    static async publishCourse(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const course = await course_service_1.CourseService.publishCourse(req.params.id, teacherId);
            res.status(200).json({ success: true, data: course });
        }
        catch (error) {
            next(error);
        }
    }
    // Section Handlers
    static async createSection(req, res, next) {
        try {
            const courseId = req.params.courseId;
            const section = await section_service_1.SectionService.createSection({ ...req.body, courseId });
            res.status(201).json({ success: true, data: section });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSectionsByCourse(req, res, next) {
        try {
            const sections = await section_service_1.SectionService.getSectionsByCourse(req.params.courseId);
            res.status(200).json({ success: true, data: sections });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSubjectById(req, res, next) {
        try {
            const subject = await subject_service_1.SubjectService.getSubjectById(req.params.id);
            res.status(200).json({ success: true, data: subject });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateSubject(req, res, next) {
        try {
            const subject = await subject_service_1.SubjectService.updateSubject(req.params.id, req.body);
            res.status(200).json({ success: true, data: subject });
        }
        catch (error) {
            next(error);
        }
    }
    // Teacher Studio & Lifecycle Handlers
    static async submitCourseForReview(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const course = await course_service_1.CourseService.submitCourseForReview(req.params.id, teacherId);
            res.status(200).json({ success: true, data: course });
        }
        catch (error) {
            next(error);
        }
    }
    static async reviewCourseStatus(req, res, next) {
        try {
            const { decision } = req.body;
            const course = await course_service_1.CourseService.reviewCourseStatus(req.params.id, decision);
            res.status(200).json({ success: true, data: course });
        }
        catch (error) {
            next(error);
        }
    }
    static async createModule(req, res, next) {
        try {
            const courseId = req.params.courseId;
            const module = await course_service_1.CourseService.createModule(courseId, req.body);
            res.status(201).json({ success: true, data: module });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteModule(req, res, next) {
        try {
            const moduleId = req.params.moduleId;
            await course_service_1.CourseService.deleteModule(moduleId);
            res.status(200).json({ success: true, message: 'Module deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async createLesson(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const moduleId = req.params.moduleId;
            const lesson = await course_service_1.CourseService.createLesson(moduleId, req.body, teacherId);
            res.status(201).json({ success: true, data: lesson });
        }
        catch (error) {
            next(error);
        }
    }
    static async attachVideoToLesson(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const lessonId = req.params.lessonId;
            const video = await course_service_1.CourseService.attachVideoToLesson(lessonId, req.body, teacherId);
            res.status(201).json({ success: true, data: video });
        }
        catch (error) {
            next(error);
        }
    }
    static async attachMaterialToLesson(req, res, next) {
        try {
            const lessonId = req.params.lessonId;
            const material = await course_service_1.CourseService.attachMaterialToLesson(lessonId, req.body);
            res.status(201).json({ success: true, data: material });
        }
        catch (error) {
            next(error);
        }
    }
    static async attachQuizToLesson(req, res, next) {
        try {
            const lessonId = req.params.lessonId;
            const quiz = await course_service_1.CourseService.attachQuizToLesson(lessonId, req.body);
            res.status(201).json({ success: true, data: quiz });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteLesson(req, res, next) {
        try {
            const lessonId = req.params.lessonId;
            await course_service_1.CourseService.deleteLesson(lessonId);
            res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async addLessonBlock(req, res, next) {
        try {
            const lessonId = req.params.lessonId;
            const block = await course_service_1.CourseService.addLessonBlock(lessonId, req.body);
            res.status(201).json({ success: true, data: block });
        }
        catch (error) {
            next(error);
        }
    }
    static async reorderModules(req, res, next) {
        try {
            const courseId = req.params.courseId;
            const { modules } = req.body;
            await course_service_1.CourseService.reorderModules(courseId, modules);
            res.status(200).json({ success: true, message: 'Modules reordered successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async gradeAssignmentSubmission(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const submissionId = req.params.submissionId;
            const graded = await course_service_1.CourseService.gradeAssignmentSubmission(submissionId, teacherId, req.body);
            res.status(200).json({ success: true, data: graded });
        }
        catch (error) {
            next(error);
        }
    }
    static async getTeacherDashboard(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const stats = await course_service_1.CourseService.getTeacherDashboardStats(teacherId);
            res.status(200).json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CourseController = CourseController;
