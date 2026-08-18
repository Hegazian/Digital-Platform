"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const admin_service_1 = require("../admin.service");
const errors_1 = require("../../../utils/errors");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        user: {
            findMany: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
            count: vitest_1.vi.fn(),
        },
        course: {
            count: vitest_1.vi.fn(),
        },
        subject: {
            count: vitest_1.vi.fn(),
        },
        subscription: {
            count: vitest_1.vi.fn(),
        },
        video: {
            count: vitest_1.vi.fn(),
        },
        quiz: {
            count: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('AdminService Unit Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('getPendingTeachers', () => {
        (0, vitest_1.it)('should return only pending teacher applications', async () => {
            const mockPending = [
                { id: 't1', email: 'teacher@test.com', name: 'Test Teacher', teacherStatus: 'PENDING', createdAt: new Date() },
            ];
            prisma_1.prisma.user.findMany.mockResolvedValue(mockPending);
            const result = await admin_service_1.AdminService.getPendingTeachers();
            (0, vitest_1.expect)(result).toEqual(mockPending);
            (0, vitest_1.expect)(prisma_1.prisma.user.findMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { role: 'TEACHER', teacherStatus: 'PENDING' },
            }));
        });
    });
    (0, vitest_1.describe)('updateTeacherStatus', () => {
        (0, vitest_1.it)('should approve a pending teacher', async () => {
            const mockTeacher = { id: 't1', email: 'teacher@test.com', name: 'T', role: 'TEACHER', teacherStatus: 'PENDING' };
            const mockUpdated = { ...mockTeacher, teacherStatus: 'APPROVED' };
            prisma_1.prisma.user.findUnique.mockResolvedValue(mockTeacher);
            prisma_1.prisma.user.update.mockResolvedValue(mockUpdated);
            const result = await admin_service_1.AdminService.updateTeacherStatus('t1', 'APPROVED');
            (0, vitest_1.expect)(result.teacherStatus).toBe('APPROVED');
            (0, vitest_1.expect)(prisma_1.prisma.user.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: 't1' },
                data: { teacherStatus: 'APPROVED' },
            }));
        });
        (0, vitest_1.it)('should throw NotFoundError for non-existent teacher', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue(null);
            await (0, vitest_1.expect)(admin_service_1.AdminService.updateTeacherStatus('fake', 'APPROVED')).rejects.toThrow(errors_1.NotFoundError);
        });
        (0, vitest_1.it)('should throw BadRequestError if user is not a teacher', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue({ id: 's1', role: 'STUDENT', teacherStatus: null });
            await (0, vitest_1.expect)(admin_service_1.AdminService.updateTeacherStatus('s1', 'APPROVED')).rejects.toThrow(errors_1.BadRequestError);
        });
        (0, vitest_1.it)('should throw BadRequestError if teacher already has that status', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue({ id: 't1', role: 'TEACHER', teacherStatus: 'APPROVED' });
            await (0, vitest_1.expect)(admin_service_1.AdminService.updateTeacherStatus('t1', 'APPROVED')).rejects.toThrow(errors_1.BadRequestError);
        });
    });
    (0, vitest_1.describe)('setUserActiveStatus', () => {
        (0, vitest_1.it)('should deactivate a student account', async () => {
            const mockUser = { id: 's1', role: 'STUDENT' };
            const mockUpdated = { id: 's1', email: 's@t.com', name: 'S', role: 'STUDENT', isActive: false };
            prisma_1.prisma.user.findUnique.mockResolvedValue(mockUser);
            prisma_1.prisma.user.update.mockResolvedValue(mockUpdated);
            const result = await admin_service_1.AdminService.setUserActiveStatus('s1', false);
            (0, vitest_1.expect)(result.isActive).toBe(false);
        });
        (0, vitest_1.it)('should throw ForbiddenError when trying to deactivate admin', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue({ id: 'a1', role: 'ADMIN' });
            await (0, vitest_1.expect)(admin_service_1.AdminService.setUserActiveStatus('a1', false)).rejects.toThrow(errors_1.ForbiddenError);
        });
    });
    (0, vitest_1.describe)('getPlatformStats', () => {
        (0, vitest_1.it)('should return aggregate platform statistics', async () => {
            prisma_1.prisma.user.count
                .mockResolvedValueOnce(100) // total
                .mockResolvedValueOnce(70) // students
                .mockResolvedValueOnce(20) // teachers
                .mockResolvedValueOnce(5) // pending teachers
                .mockResolvedValueOnce(15); // approved teachers
            prisma_1.prisma.course.count
                .mockResolvedValueOnce(25) // total courses
                .mockResolvedValueOnce(18); // published courses
            prisma_1.prisma.subject.count.mockResolvedValue(3);
            prisma_1.prisma.subscription.count
                .mockResolvedValueOnce(50) // active
                .mockResolvedValueOnce(80); // total
            prisma_1.prisma.video.count.mockResolvedValue(120);
            prisma_1.prisma.quiz.count.mockResolvedValue(30);
            const stats = await admin_service_1.AdminService.getPlatformStats();
            (0, vitest_1.expect)(stats.users.total).toBe(100);
            (0, vitest_1.expect)(stats.users.students).toBe(70);
            (0, vitest_1.expect)(stats.users.pendingTeachers).toBe(5);
            (0, vitest_1.expect)(stats.content.totalCourses).toBe(25);
            (0, vitest_1.expect)(stats.content.publishedCourses).toBe(18);
            (0, vitest_1.expect)(stats.subscriptions.active).toBe(50);
        });
    });
});
