"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const material_service_1 = require("../material.service");
const storage_1 = require("../../../utils/storage");
const client_1 = require("@prisma/client");
const errors_1 = require("../../../utils/errors");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        lesson: {
            findUnique: vitest_1.vi.fn(),
        },
        subscription: {
            findFirst: vitest_1.vi.fn(),
        },
        material: {
            create: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
            delete: vitest_1.vi.fn(),
        },
    },
}));
vitest_1.vi.mock('../../../utils/storage', () => ({
    StorageService: {
        uploadFile: vitest_1.vi.fn().mockResolvedValue('/uploads/materials/test.pdf'),
        deleteFile: vitest_1.vi.fn().mockResolvedValue(undefined),
    },
}));
(0, vitest_1.describe)('MaterialService Unit Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('uploadMaterial', () => {
        (0, vitest_1.it)('should upload a material for course teacher', async () => {
            const mockLesson = {
                id: 'l1',
                section: { course: { teacherId: 't1', subjectId: 'sub1' } },
            };
            const mockMaterial = { id: 'm1', title: 'Summary PDF', fileUrl: '/uploads/materials/test.pdf' };
            prisma_1.prisma.lesson.findUnique.mockResolvedValue(mockLesson);
            prisma_1.prisma.material.create.mockResolvedValue(mockMaterial);
            const result = await material_service_1.MaterialService.uploadMaterial({
                lessonId: 'l1',
                title: 'Summary PDF',
                fileBuffer: Buffer.from('dummy content'),
                fileName: 'test.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                userId: 't1',
                userRole: client_1.Role.TEACHER,
            });
            (0, vitest_1.expect)(result.id).toBe('m1');
            (0, vitest_1.expect)(storage_1.StorageService.uploadFile).toHaveBeenCalled();
            (0, vitest_1.expect)(prisma_1.prisma.material.create).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should throw ForbiddenError if non-owner teacher tries to upload', async () => {
            const mockLesson = {
                id: 'l1',
                section: { course: { teacherId: 't1', subjectId: 'sub1' } },
            };
            prisma_1.prisma.lesson.findUnique.mockResolvedValue(mockLesson);
            await (0, vitest_1.expect)(material_service_1.MaterialService.uploadMaterial({
                lessonId: 'l1',
                title: 'Summary PDF',
                fileBuffer: Buffer.from('dummy'),
                fileName: 'test.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                userId: 'other_teacher',
                userRole: client_1.Role.TEACHER,
            })).rejects.toThrow(errors_1.ForbiddenError);
        });
    });
    (0, vitest_1.describe)('getMaterialsByLesson', () => {
        (0, vitest_1.it)('should allow student with active subscription to view materials', async () => {
            const mockLesson = {
                id: 'l1',
                section: { isFreePreview: false, course: { teacherId: 't1', subjectId: 'sub1' } },
            };
            prisma_1.prisma.lesson.findUnique.mockResolvedValue(mockLesson);
            prisma_1.prisma.subscription.findFirst.mockResolvedValue({ status: client_1.SubscriptionStatus.ACTIVE });
            prisma_1.prisma.material.findMany.mockResolvedValue([{ id: 'm1', title: 'File' }]);
            const result = await material_service_1.MaterialService.getMaterialsByLesson('l1', 'student1', client_1.Role.STUDENT);
            (0, vitest_1.expect)(result).toHaveLength(1);
        });
        (0, vitest_1.it)('should throw ForbiddenError if student has no active subscription for non-free lesson', async () => {
            const mockLesson = {
                id: 'l1',
                section: { isFreePreview: false, course: { teacherId: 't1', subjectId: 'sub1' } },
            };
            prisma_1.prisma.lesson.findUnique.mockResolvedValue(mockLesson);
            prisma_1.prisma.subscription.findFirst.mockResolvedValue(null);
            await (0, vitest_1.expect)(material_service_1.MaterialService.getMaterialsByLesson('l1', 'student1', client_1.Role.STUDENT)).rejects.toThrow(errors_1.ForbiddenError);
        });
    });
    (0, vitest_1.describe)('deleteMaterial', () => {
        (0, vitest_1.it)('should delete material and call StorageService.deleteFile', async () => {
            const mockMaterial = {
                id: 'm1',
                fileUrl: '/uploads/materials/test.pdf',
                lesson: { section: { course: { teacherId: 't1' } } },
            };
            prisma_1.prisma.material.findUnique.mockResolvedValue(mockMaterial);
            prisma_1.prisma.material.delete.mockResolvedValue(mockMaterial);
            const result = await material_service_1.MaterialService.deleteMaterial('m1', 't1', client_1.Role.TEACHER);
            (0, vitest_1.expect)(result.message).toBe('Material deleted successfully');
            (0, vitest_1.expect)(storage_1.StorageService.deleteFile).toHaveBeenCalledWith('/uploads/materials/test.pdf');
        });
    });
});
