import { prisma } from '../../prisma';
import { Role } from '@prisma/client';
import { NotFoundError } from '../../utils/errors';

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

  static async getSectionsByCourse(
    courseId: string,
    user?: { userId: string; role: Role } | null
  ) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true, status: true, isPublished: true },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const canManage =
      !!user && (user.role === Role.ADMIN || course.teacherId === user.userId);

    // Unpublished curricula are only visible to admins and the owner.
    if (!canManage && (course.status !== 'PUBLISHED' || !course.isPublished)) {
      throw new NotFoundError('Course not found');
    }

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
