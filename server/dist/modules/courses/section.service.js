"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionService = void 0;
const prisma_1 = require("../../prisma");
class SectionService {
    static async createSection(data) {
        return await prisma_1.prisma.section.create({
            data: {
                courseId: data.courseId,
                titleEn: data.titleEn,
                titleAr: data.titleAr,
                orderIndex: data.orderIndex || 1,
                isFreePreview: data.isFreePreview || false,
            },
        });
    }
    static async getSectionsByCourse(courseId) {
        return await prisma_1.prisma.section.findMany({
            where: { courseId },
            orderBy: { orderIndex: 'asc' },
            include: {
                lessons: {
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });
    }
}
exports.SectionService = SectionService;
