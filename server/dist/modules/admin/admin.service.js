"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const prisma_1 = require("../../prisma");
const client_1 = require("@prisma/client");
const errors_1 = require("../../utils/errors");
class AdminService {
    /**
     * Get all users with optional filtering by role, teacher status, and search query.
     * Supports pagination via skip/take.
     */
    static async getAllUsers(filters = {}) {
        const { role, teacherStatus, search, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (role)
            where.role = role;
        if (teacherStatus)
            where.teacherStatus = teacherStatus;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            prisma_1.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    teacherStatus: true,
                    isActive: true,
                    avatar: true,
                    createdAt: true,
                    _count: {
                        select: {
                            courses: true,
                            subscriptions: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.user.count({ where }),
        ]);
        return {
            users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get all pending teacher applications awaiting admin review.
     */
    static async getPendingTeachers() {
        return await prisma_1.prisma.user.findMany({
            where: {
                role: client_1.Role.TEACHER,
                teacherStatus: client_1.TeacherStatus.PENDING,
            },
            select: {
                id: true,
                email: true,
                name: true,
                teacherStatus: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    /**
     * Approve or reject a teacher application.
     * Sends notification email to the teacher.
     */
    static async updateTeacherStatus(teacherId, status) {
        const teacher = await prisma_1.prisma.user.findUnique({
            where: { id: teacherId },
        });
        if (!teacher) {
            throw new errors_1.NotFoundError('Teacher not found');
        }
        if (teacher.role !== client_1.Role.TEACHER) {
            throw new errors_1.BadRequestError('User is not a teacher');
        }
        if (teacher.teacherStatus === status) {
            throw new errors_1.BadRequestError(`Teacher is already ${status}`);
        }
        const updated = await prisma_1.prisma.user.update({
            where: { id: teacherId },
            data: { teacherStatus: status },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                teacherStatus: true,
            },
        });
        // Send notification email to teacher (non-blocking)
        try {
            const { sendTeacherStatusEmail } = await Promise.resolve().then(() => __importStar(require('../../utils/email')));
            sendTeacherStatusEmail(updated.email, updated.name, status).catch((err) => console.warn('Teacher status email error:', err));
        }
        catch (e) {
            // Ignore background email errors
        }
        return updated;
    }
    /**
     * Deactivate or reactivate a user account.
     */
    static async setUserActiveStatus(userId, isActive) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Prevent deactivating other admins
        if (user.role === client_1.Role.ADMIN && !isActive) {
            throw new errors_1.ForbiddenError('Cannot deactivate admin accounts');
        }
        return await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isActive },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
            },
        });
    }
    /**
     * Get platform-wide analytics and statistics.
     */
    static async getPlatformStats() {
        const totalUsers = await prisma_1.prisma.user.count();
        const totalStudents = await prisma_1.prisma.user.count({ where: { role: client_1.Role.STUDENT } });
        const totalTeachers = await prisma_1.prisma.user.count({ where: { role: client_1.Role.TEACHER } });
        const pendingTeachers = await prisma_1.prisma.user.count({ where: { role: client_1.Role.TEACHER, teacherStatus: client_1.TeacherStatus.PENDING } });
        const approvedTeachers = await prisma_1.prisma.user.count({ where: { role: client_1.Role.TEACHER, teacherStatus: client_1.TeacherStatus.APPROVED } });
        const totalCourses = await prisma_1.prisma.course.count();
        const publishedCourses = await prisma_1.prisma.course.count({ where: { isPublished: true } });
        const totalSubjects = await prisma_1.prisma.subject.count();
        const activeSubscriptions = await prisma_1.prisma.subscription.count({ where: { status: client_1.SubscriptionStatus.ACTIVE } });
        const totalSubscriptions = await prisma_1.prisma.subscription.count();
        const totalVideos = await prisma_1.prisma.video.count();
        const totalQuizzes = await prisma_1.prisma.quiz.count();
        return {
            users: {
                total: totalUsers,
                students: totalStudents,
                teachers: totalTeachers,
                pendingTeachers,
                approvedTeachers,
            },
            content: {
                totalCourses,
                publishedCourses,
                totalSubjects,
                totalVideos,
                totalQuizzes,
            },
            subscriptions: {
                active: activeSubscriptions,
                total: totalSubscriptions,
            },
        };
    }
}
exports.AdminService = AdminService;
