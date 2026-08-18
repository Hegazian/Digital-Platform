"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const parent_service_1 = require("../parent.service");
const errors_1 = require("../../../utils/errors");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        user: {
            findUnique: vitest_1.vi.fn(),
        },
        parentStudent: {
            create: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('ParentService Unit Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('linkStudent', () => {
        (0, vitest_1.it)('should throw NotFoundError if student email is not found', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue(null);
            await (0, vitest_1.expect)(parent_service_1.ParentService.linkStudent('parent-1', 'nonexistent@test.com')).rejects.toThrow(errors_1.NotFoundError);
        });
        (0, vitest_1.it)('should throw BadRequestError if user with that email is not a student', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue({
                id: 'u-1',
                email: 'teacher@test.com',
                role: 'TEACHER',
            });
            await (0, vitest_1.expect)(parent_service_1.ParentService.linkStudent('parent-1', 'teacher@test.com')).rejects.toThrow(errors_1.BadRequestError);
        });
        (0, vitest_1.it)('should create parent-student link successfully for a valid student', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue({
                id: 'student-1',
                email: 'student@test.com',
                role: 'STUDENT',
            });
            prisma_1.prisma.parentStudent.create.mockResolvedValue({
                id: 'link-1',
                parentId: 'parent-1',
                studentId: 'student-1',
            });
            const res = await parent_service_1.ParentService.linkStudent('parent-1', 'student@test.com');
            (0, vitest_1.expect)(res.id).toBe('link-1');
        });
        (0, vitest_1.it)('should throw BadRequestError if link already exists (P2002 error)', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue({
                id: 'student-1',
                email: 'student@test.com',
                role: 'STUDENT',
            });
            prisma_1.prisma.parentStudent.create.mockRejectedValue({ code: 'P2002' });
            await (0, vitest_1.expect)(parent_service_1.ParentService.linkStudent('parent-1', 'student@test.com')).rejects.toThrow('You are already linked to this student.');
        });
    });
});
