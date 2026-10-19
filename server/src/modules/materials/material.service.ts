import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { StorageService } from '../../utils/storage';
import { Role, SubscriptionStatus } from '@prisma/client';

export class MaterialService {
  /**
   * Upload a new lesson material attachment.
   */
  static async uploadMaterial(params: {
    lessonId: string;
    title: string;
    fileBuffer: Buffer;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    userId: string;
    userRole: Role;
  }) {
    const { lessonId, title, fileBuffer, fileName, mimeType, sizeBytes, userId, userRole } = params;

    if (!lessonId || !title || !fileBuffer || !fileName) {
      throw new BadRequestError('lessonId, title, and file are required');
    }

    // Verify lesson and section ownership
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: { include: { course: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const teacherId = lesson.section.course.teacherId;

    if (userRole !== Role.ADMIN && teacherId !== userId) {
      throw new ForbiddenError('You do not have permission to add materials to this course');
    }

    // Upload to Supabase/Storage
    const fileUrl = await StorageService.uploadFile(fileBuffer, fileName, mimeType);

    // Save to Database
    const material = await prisma.material.create({
      data: {
        lessonId,
        title,
        fileUrl,
        fileType: mimeType,
        sizeBytes,
      },
    });

    return material;
  }

  /**
   * Retrieve materials for a specific lesson with access control verification.
   */
  static async getMaterialsByLesson(lessonId: string, userId: string, userRole: Role) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: { include: { course: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const teacherId = lesson.section.course.teacherId;
    const isFreePreview = lesson.section.isFreePreview || false;
    const subjectId = lesson.section.course.subjectId;

    // Allow Admin or Course Teacher
    if (userRole === Role.ADMIN || (userRole === Role.TEACHER && teacherId === userId)) {
      return await prisma.material.findMany({ where: { lessonId }, orderBy: { createdAt: 'asc' } });
    }

    // Allow free preview lessons
    if (isFreePreview) {
      return await prisma.material.findMany({ where: { lessonId }, orderBy: { createdAt: 'asc' } });
    }

    const courseId = lesson.section.courseId;

    // Check student entitlement / subscription via EntitlementResolver
    const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
    let hasAccess = false;

    if (courseId && (await EntitlementResolver.hasCourseAccess(userId, courseId))) {
      hasAccess = true;
    } else if (subjectId && (await EntitlementResolver.hasSubjectAccess(userId, subjectId))) {
      hasAccess = true;
    }

    if (!hasAccess) {
      throw new ForbiddenError('Active course access or subscription required to access lesson materials');
    }

    return await prisma.material.findMany({ where: { lessonId }, orderBy: { createdAt: 'asc' } });
  }

  /**
   * Delete a material attachment.
   */
  static async deleteMaterial(materialId: string, userId: string, userRole: Role) {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        lesson: {
          include: {
            section: { include: { course: true } },
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundError('Material not found');
    }

    const teacherId = material.lesson.section.course.teacherId;

    if (userRole !== Role.ADMIN && teacherId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this material');
    }

    await StorageService.deleteFile(material.fileUrl);
    await prisma.material.delete({ where: { id: materialId } });

    return { message: 'Material deleted successfully' };
  }

  /**
   * Retrieve download URL / access info for a specific material with access control verification.
   */
  static async getMaterialDownload(materialId: string, userId: string, userRole: Role) {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        lesson: {
          include: {
            section: { include: { course: true } },
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundError('Material not found');
    }

    const teacherId = material.lesson.section.course.teacherId;
    const isFreePreview = Boolean(material.lesson.section.isFreePreview);
    const isCourseFree = Boolean(material.lesson.section.course.isFree);
    const courseId = material.lesson.section.courseId;
    const subjectId = material.lesson.section.course.subjectId;

    // Allow Admin or Course Teacher
    if (userRole === Role.ADMIN || (userRole === Role.TEACHER && teacherId === userId)) {
      return {
        id: material.id,
        title: material.title,
        downloadUrl: material.fileUrl,
        fileType: material.fileType,
      };
    }

    // Allow free preview sections or free courses
    if (isFreePreview || isCourseFree) {
      return {
        id: material.id,
        title: material.title,
        downloadUrl: material.fileUrl,
        fileType: material.fileType,
      };
    }

    // Check student entitlement / subscription via EntitlementResolver
    const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
    let hasAccess = false;

    if (courseId && (await EntitlementResolver.hasCourseAccess(userId, courseId))) {
      hasAccess = true;
    } else if (subjectId && (await EntitlementResolver.hasSubjectAccess(userId, subjectId))) {
      hasAccess = true;
    }

    if (!hasAccess) {
      throw new ForbiddenError('Active course access or subscription required to download lesson material');
    }

    return {
      id: material.id,
      title: material.title,
      downloadUrl: material.fileUrl,
      fileType: material.fileType,
    };
  }
}

