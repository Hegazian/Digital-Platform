import { prisma } from '../../prisma';

export class SectionService {
  static async createSection(data: any) {
    return await prisma.section.create({
      data: {
        courseId: data.courseId,
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        orderIndex: data.orderIndex || 1,
        isFreePreview: data.isFreePreview || false,
      },
    });
  }

  static async getSectionsByCourse(courseId: string) {
    return await prisma.section.findMany({
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
