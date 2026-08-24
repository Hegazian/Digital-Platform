import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { Prisma } from '@prisma/client';

const COURSE_SELECT = {
  id: true,
  titleEn: true,
  titleAr: true,
  thumbnail: true,
  isPublished: true,
  status: true,
  subject: { select: { nameEn: true, nameAr: true } },
  teacher: { select: { name: true } },
} as const;

export class CollectionsService {
  /** Public: published only. Admin (includeUnpublished): everything. */
  static async listCollections(opts: { includeUnpublished?: boolean }) {
    return prisma.collection.findMany({
      where: opts.includeUnpublished ? {} : { isPublished: true },
      include: {
        courses: {
          orderBy: { sortOrder: 'asc' },
          include: { course: { select: COURSE_SELECT } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getCollectionById(id: string, opts: { includeUnpublished?: boolean }) {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        courses: {
          orderBy: { sortOrder: 'asc' },
          include: { course: { select: COURSE_SELECT } },
        },
      },
    });
    if (!collection || (!collection.isPublished && !opts.includeUnpublished)) {
      throw new NotFoundError('Collection not found');
    }
    return collection;
  }

  static async createCollection(data: {
    titleEn: string;
    titleAr: string;
    slug: string;
    description?: string;
    thumbnail?: string;
    isPublished?: boolean;
  }) {
    return prisma.collection.create({ data });
  }

  static async updateCollection(
    id: string,
    data: {
      titleEn?: string;
      titleAr?: string;
      slug?: string;
      description?: string;
      thumbnail?: string;
      isPublished?: boolean;
    }
  ) {
    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Collection not found');

    return prisma.collection.update({ where: { id }, data });
  }

  static async deleteCollection(id: string) {
    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Collection not found');

    await prisma.collection.delete({ where: { id } });
    return { deleted: true };
  }

  /** Replaces the collection's course list atomically, preserving order. */
  static async setCollectionCourses(id: string, courseIds: string[]) {
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundError('Collection not found');

    const uniqueIds = [...new Set(courseIds)];
    if (uniqueIds.length > 0) {
      const found = await prisma.course.count({ where: { id: { in: uniqueIds } } });
      if (found !== uniqueIds.length) {
        throw new BadRequestError('One or more courseIds do not exist');
      }
    }

    await prisma.$transaction([
      prisma.collectionCourse.deleteMany({ where: { collectionId: id } }),
      prisma.collectionCourse.createMany({
        data: uniqueIds.map((courseId, index) => ({
          collectionId: id,
          courseId,
          sortOrder: index,
        })),
        skipDuplicates: true,
      }),
    ]);

    return prisma.collection.findUniqueOrThrow({
      where: { id },
      include: {
        courses: {
          orderBy: { sortOrder: 'asc' },
          include: { course: { select: COURSE_SELECT } },
        },
      },
    });
  }
}
