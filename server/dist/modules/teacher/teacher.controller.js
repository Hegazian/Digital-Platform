"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherController = void 0;
const teacher_service_1 = require("./teacher.service");
class TeacherController {
    static async getEnrolledStudents(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const students = await teacher_service_1.TeacherService.getEnrolledStudents(teacherId);
            res.status(200).json({ success: true, data: students });
        }
        catch (err) {
            next(err);
        }
    }
    static async getStudentProgress(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const { studentId } = req.params;
            const progress = await teacher_service_1.TeacherService.getStudentProgress(teacherId, studentId);
            res.status(200).json({ success: true, data: progress });
        }
        catch (err) {
            next(err);
        }
    }
    static async broadcastAnnouncement(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const result = await teacher_service_1.TeacherService.broadcastAnnouncement({
                teacherId,
                ...req.body,
            });
            res.status(201).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    static async getRevenueSummary(req, res, next) {
        try {
            const teacherId = req.user.userId;
            const summary = await teacher_service_1.TeacherService.getRevenueSummary(teacherId);
            res.status(200).json({ success: true, data: summary });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.TeacherController = TeacherController;
