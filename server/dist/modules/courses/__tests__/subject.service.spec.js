"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const subject_service_1 = require("../subject.service");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        subject: {
            count: vitest_1.vi.fn().mockResolvedValue(1),
            findMany: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
            delete: vitest_1.vi.fn(),
        },
        subjectPricing: {
            createMany: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('SubjectService Unit Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('getAllSubjects', () => {
        (0, vitest_1.it)('should return all subjects with active pricing', async () => {
            const mockSubjects = [
                {
                    id: 'sub-1',
                    nameEn: 'Programming',
                    nameAr: 'برمجة',
                    pricing: [
                        { period: 'MONTHLY', priceEgp: 200, priceUsd: 10 },
                        { period: 'YEARLY', priceEgp: 1800, priceUsd: 90 },
                    ],
                },
            ];
            prisma_1.prisma.subject.findMany.mockResolvedValue(mockSubjects);
            const result = await subject_service_1.SubjectService.getAllSubjects();
            (0, vitest_1.expect)(result).toEqual(mockSubjects);
            (0, vitest_1.expect)(prisma_1.prisma.subject.findMany).toHaveBeenCalledWith({
                include: { pricing: true },
            });
        });
    });
    (0, vitest_1.describe)('createSubject', () => {
        (0, vitest_1.it)('should create a subject with pricing plans', async () => {
            const inputData = {
                nameEn: 'Physics 1st Secondary',
                nameAr: 'فيزياء الصف الأول الثانوي',
                description: 'High school physics',
                pricing: [
                    { period: 'MONTHLY', priceEgp: 250, priceUsd: 15 },
                    { period: 'SIX_MONTHS', priceEgp: 1200, priceUsd: 70 },
                    { period: 'YEARLY', priceEgp: 2000, priceUsd: 120 },
                ],
            };
            const mockCreatedSubject = { id: 'sub-2', ...inputData };
            prisma_1.prisma.subject.create.mockResolvedValue(mockCreatedSubject);
            const result = await subject_service_1.SubjectService.createSubject(inputData);
            (0, vitest_1.expect)(result).toHaveProperty('id', 'sub-2');
            (0, vitest_1.expect)(prisma_1.prisma.subject.create).toHaveBeenCalled();
        });
    });
});
