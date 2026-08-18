"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
const progress_service_1 = require("../progress/progress.service");
class ParentService {
    /**
     * Generates a 6-digit OTP code for parent-student linking approval.
     */
    static async requestParentLinkOtp(parentId, studentEmail) {
        const student = await prisma_1.prisma.user.findUnique({
            where: { email: studentEmail },
        });
        if (!student || student.role !== 'STUDENT') {
            throw new errors_1.NotFoundError('Student not found with that email.');
        }
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL
        await prisma_1.prisma.parentLinkOtp.create({
            data: {
                parentUserId: parentId,
                studentEmail,
                otpCode,
                expiresAt,
            },
        });
        return {
            messageEn: 'OTP code generated successfully. Please verify to establish link.',
            expiresAt,
        };
    }
    /**
     * Verifies the 6-digit OTP and establishes active ParentStudent link.
     */
    static async verifyParentLinkOtp(parentId, studentEmail, otpCode) {
        const otpRecord = await prisma_1.prisma.parentLinkOtp.findFirst({
            where: {
                parentUserId: parentId,
                studentEmail,
                otpCode,
                isVerified: false,
                expiresAt: { gte: new Date() },
            },
        });
        if (!otpRecord) {
            throw new errors_1.BadRequestError('Invalid or expired OTP code.');
        }
        await prisma_1.prisma.parentLinkOtp.update({
            where: { id: otpRecord.id },
            data: { isVerified: true },
        });
        const link = await this.linkStudent(parentId, studentEmail);
        return {
            isLinked: true,
            link,
        };
    }
    /**
     * Links a parent account to a student account using the student's email.
     */
    static async linkStudent(parentId, studentEmail) {
        const student = await prisma_1.prisma.user.findUnique({
            where: { email: studentEmail },
        });
        if (!student) {
            throw new errors_1.NotFoundError('No student found with that email address.');
        }
        if (student.role !== 'STUDENT') {
            throw new errors_1.BadRequestError('The provided email does not belong to a student account.');
        }
        try {
            const link = await prisma_1.prisma.parentStudent.create({
                data: {
                    parentId,
                    studentId: student.id,
                },
            });
            return link;
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new errors_1.BadRequestError('You are already linked to this student.');
            }
            throw error;
        }
    }
    /**
     * Fetches all students linked to the parent, along with their progress analytics.
     */
    static async getChildrenAnalytics(parentId) {
        const links = await prisma_1.prisma.parentStudent.findMany({
            where: { parentId },
            include: {
                student: true,
            },
        });
        const childrenAnalytics = await Promise.all(links.map(async (link) => {
            const student = link.student;
            const progressSummary = await progress_service_1.ProgressService.getStudentProgressSummary(student.id);
            return {
                studentId: student.id,
                name: student.name,
                email: student.email,
                avatar: student.avatar,
                totalWatchTimeSec: progressSummary.totalWatchTimeSec,
                avgQuizScore: progressSummary.avgQuizScore,
                activeCourses: progressSummary.courses,
            };
        }));
        return childrenAnalytics;
    }
}
exports.ParentService = ParentService;
