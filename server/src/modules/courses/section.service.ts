import { prisma } from '../../prisma';
import { Role } from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';

export class SectionService {
  static async createSection(
    data: {
      courseId: string;
      titleEn: string;
      titleAr?: string;
      orderIndex?: number;
      isFreePreview?: boolean;
    },
    actor?: { userId: string; role: Role } | null
  ) {
    // Ownership guard (parity with module/lesson management): only the
    // course's teacher or an admin may restructure its curriculum.
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) {
      throw new NotFoundError('Course not found');
    }
    if (!actor || (actor.role !== Role.ADMIN && course.teacherId !== actor.userId)) {
      throw new ForbiddenError('Only the course teacher can add sections to this course');
    }

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

  /** Loads a section with its owning course teacher for ownership checks. */
  private static async getOwnedSectionOrThrow(
    sectionId: string,
    actor?: { userId: string; role: Role } | null
  ) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true, courseId: true, course: { select: { teacherId: true } } },
    });
    if (!section) {
      throw new NotFoundError('Section not found');
    }
    if (!actor || (actor.role !== Role.ADMIN && section.course.teacherId !== actor.userId)) {
      throw new ForbiddenError('Only the course teacher can modify this section');
    }
    return section;
  }

  static async updateSection(
    sectionId: string,
    data: {
      titleEn?: string;
      titleAr?: string;
      orderIndex?: number;
      isFreePreview?: boolean;
    },
    actor?: { userId: string; role: Role } | null
  ) {
    await this.getOwnedSectionOrThrow(sectionId, actor);

    return await prisma.section.update({
      where: { id: sectionId },
      data: {
        ...(data.titleEn !== undefined && { titleEn: data.titleEn }),
        ...(data.titleAr !== undefined && { titleAr: data.titleAr }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.isFreePreview !== undefined && { isFreePreview: data.isFreePreview }),
      },
    });
  }

  /** Deletes the section; its lessons cascade (schema onDelete: Cascade). */
  static async deleteSection(
    sectionId: string,
    actor?: { userId: string; role: Role } | null
  ) {
    await this.getOwnedSectionOrThrow(sectionId, actor);

    await prisma.section.delete({ where: { id: sectionId } });
    return { deleted: true };
  }

  /** Explicit orderIndex rewrite for a course's sections (ownership-checked). */
  static async reorderSections(
    courseId: string,
    items: Array<{ id: string; orderIndex: number }>,
    actor?: { userId: string; role: Role } | null
  ) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) {
      throw new NotFoundError('Course not found');
    }
    if (!actor || (actor.role !== Role.ADMIN && course.teacherId !== actor.userId)) {
      throw new ForbiddenError("Only the course teacher can reorder this course's sections");
    }

    const rows = await prisma.section.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { id: true, courseId: true },
    });
    const foreign = rows.find((s) => s.courseId !== courseId);
    if (foreign || rows.length !== items.length) {
      throw new BadRequestError('One or more sections do not belong to this course');
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.section.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    );
    return { reordered: items.length };
  }
}
