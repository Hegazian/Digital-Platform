import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

export class CourseService {
  static async getAllCourses(query: any = {}) {
    const { subjectId, isPublished } = query;
    return await prisma.course.findMany({
      where: {
        ...(subjectId && { subjectId }),
        ...(isPublished !== undefined && { isPublished: isPublished === 'true' }),
      },
      include: {
        teacher: {
          select: { id: true, name: true, avatar: true },
        },
        subject: {
          select: { id: true, nameEn: true, nameAr: true },
        },
        sections: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  static async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, name: true, avatar: true },
        },
        subject: true,
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return course;
  }

  static async createCourse(data: any) {
    let subject = await prisma.subject.findUnique({
      where: { id: data.subjectId },
    });

    if (!subject) {
      const { SubjectService } = await import('./subject.service');
      await SubjectService.ensureDefaultSubjectsExist();
      subject = await prisma.subject.findUnique({
        where: { id: data.subjectId },
      });
    }

    if (!subject) {
      throw new NotFoundError('Selected subject does not exist. Please select a valid subject.');
    }

    return await prisma.course.create({
      data: {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        description: data.description,
        thumbnail: data.thumbnail,
        teacherId: data.teacherId,
        subjectId: data.subjectId,
      },
    });
  }

  static async publishCourse(id: string, teacherId: string) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenError('You do not have permission to publish this course');
    }

    return await prisma.course.update({
      where: { id },
      data: { isPublished: true },
    });
  }
}
