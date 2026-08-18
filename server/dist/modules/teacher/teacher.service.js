"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
const notification_service_1 = require("../notifications/notification.service");
class TeacherService {
    static async getEnrolledStudents(teacherId) {
        // 1. Get all courses created by teacher
        const courses = await prisma_1.prisma.course.findMany({
            where: { teacherId },
            select: { id: true, subjectId: true },
        });
        const subjectIds = Array.from(new Set(courses.map((c) => c.subjectId)));
        // 2. Find students with active entitlements for these subjects
        const entitlements = await prisma_1.prisma.entitlement.findMany({
            where: {
                resourceType: 'SUBJECT',
                resourceId: { in: subjectIds },
                status: 'ACTIVE',
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        createdAt: true,
                    },
                },
            },
        });
        const uniqueStudents = Array.from(new Map(entitlements.map((e) => [e.student.id, e.student])).values());
        return uniqueStudents;
    }
    static async getStudentProgress(teacherId, studentId) {
        const student = await prisma_1.prisma.user.findUnique({
            where: { id: studentId },
            select: { id: true, name: true, email: true, role: true },
        });
        if (!student) {
            throw new errors_1.NotFoundError('Student not found');
        }
        const completedLessons = await prisma_1.prisma.lessonProgress.count({
            where: { userId: studentId, isCompleted: true },
        });
        const attempts = await prisma_1.prisma.assessmentAttempt.findMany({
            where: { studentId },
            select: { score: true, isPassed: true },
        });
        return {
            student,
            totalLessonsCompleted: completedLessons,
            totalAssessmentsAttempted: attempts.length,
            averageScore: attempts.length > 0
                ? attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / attempts.length
                : 0,
        };
    }
    static async broadcastAnnouncement(data) {
        const course = await prisma_1.prisma.course.findUnique({
            where: { id: data.courseId },
        });
        if (!course) {
            throw new errors_1.NotFoundError('Course not found');
        }
        if (course.teacherId !== data.teacherId) {
            throw new errors_1.ForbiddenError('You do not own this course');
        }
        // Find all entitled students for course subject
        const entitlements = await prisma_1.prisma.entitlement.findMany({
            where: {
                resourceType: 'SUBJECT',
                resourceId: course.subjectId,
                status: 'ACTIVE',
            },
            select: { studentId: true },
        });
        let notificationsSent = 0;
        for (const ent of entitlements) {
            await notification_service_1.NotificationService.createNotification({
                userId: ent.studentId,
                titleEn: data.titleEn,
                titleAr: data.titleAr,
                messageEn: data.messageEn,
                messageAr: data.messageAr,
            });
            notificationsSent++;
        }
        return { notificationsSent };
    }
    static async getRevenueSummary(teacherId) {
        const students = await this.getEnrolledStudents(teacherId);
        const coursesCount = await prisma_1.prisma.course.count({ where: { teacherId } });
        return {
            totalStudentsEnrolled: students.length,
            totalCoursesCreated: coursesCount,
            revenueEgp: students.length * 1500, // Estimated subject enrollment revenue
        };
    }
}
exports.TeacherService = TeacherService;
