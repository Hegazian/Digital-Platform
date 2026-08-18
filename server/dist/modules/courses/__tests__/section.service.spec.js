"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../prisma");
const section_service_1 = require("../section.service");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        section: {
            create: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('SectionService Unit Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('createSection', () => {
        (0, vitest_1.it)('should create section with free preview flag if intro section', async () => {
            const sectionData = {
                courseId: 'course-1',
                titleEn: 'Chapter 1: Basics',
                titleAr: 'الفصل الأول: الأساسيات',
                orderIndex: 1,
                isFreePreview: true,
            };
            const mockSection = { id: 'sec-1', ...sectionData };
            prisma_1.prisma.section.create.mockResolvedValue(mockSection);
            const result = await section_service_1.SectionService.createSection(sectionData);
            (0, vitest_1.expect)(result.isFreePreview).toBe(true);
            (0, vitest_1.expect)(result.orderIndex).toBe(1);
            (0, vitest_1.expect)(prisma_1.prisma.section.create).toHaveBeenCalledWith({ data: sectionData });
        });
    });
});
