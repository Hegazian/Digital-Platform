import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { StorageService } from '../../utils/storage';
import { Role, SubscriptionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { materialDeliveryUrl, materialObjectKey } from './material-reference';

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

    // Verify lesson and section/module ownership
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: { include: { course: true } },
        module: { include: { course: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const teacherId = lesson.section?.course.teacherId || lesson.module?.course.teacherId;

    if (userRole !== Role.ADMIN && teacherId !== userId) {
      throw new ForbiddenError('You do not have permission to add materials to this course');
    }

    // Upload to Supabase/Storage
    const materialId = randomUUID();
    const fileUrl = await StorageService.uploadFile(fileBuffer, fileName, mimeType, 'lesson-materials', materialId);

    // Save to Database
    const material = await prisma.material.create({
      data: {
        id: materialId,
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
        module: { include: { course: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const teacherId = lesson.section?.course.teacherId || lesson.module?.course.teacherId;
    const isFreePreview = lesson.section?.isFreePreview || false;
    const subjectId = lesson.section?.course.subjectId || lesson.module?.course.subjectId;

    // Allow Admin or Course Teacher
    if (userRole === Role.ADMIN || (userRole === Role.TEACHER && teacherId === userId)) {
      return this.withProtectedUrls(await prisma.material.findMany({ where: { lessonId }, orderBy: { createdAt: 'asc' } }));
    }

    const courseId = lesson.module?.courseId || lesson.section?.courseId;

    // Free previews follow the same lifecycle gate; retracted or unpublished
    // courses must not remain reachable through a known lesson/material ID.
    if (isFreePreview && courseId) {
      const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
      if (!(await EntitlementResolver.hasCoursePreviewAccess(courseId, userId))) {
        throw new ForbiddenError('This course preview is not available');
      }
      return this.withProtectedUrls(await prisma.material.findMany({ where: { lessonId }, orderBy: { createdAt: 'asc' } }));
    }

    // Check student entitlement / subscription via EntitlementResolver
    const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
    let hasAccess = false;

    if (courseId && (await EntitlementResolver.hasCourseAccess(userId, courseId))) {
      hasAccess = true;
    } else if (!courseId && subjectId && (await EntitlementResolver.hasSubjectAccess(userId, subjectId))) {
      hasAccess = true;
    }

    if (!hasAccess) {
      throw new ForbiddenError('Active course access or subscription required to access lesson materials');
    }

    return this.withProtectedUrls(await prisma.material.findMany({ where: { lessonId }, orderBy: { createdAt: 'asc' } }));
  }

  private static withProtectedUrls<T extends Array<{ id: string; fileUrl: string }>>(materials: T): T {
    return materials.map((material) => ({ ...material, fileUrl: materialDeliveryUrl(material) })) as unknown as T;
  }

  static async getMaterialForDelivery(materialId: string, userId: string, userRole: Role) {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: { lesson: { include: { section: { include: { course: true } }, module: { include: { course: true } } } } },
    });
    if (!material) throw new NotFoundError('Material not found');
    const course = material.lesson.module?.course || material.lesson.section?.course;
    if (!course) throw new NotFoundError('Course not found');
    const owner = userRole === Role.TEACHER && course.teacherId === userId;
    const preview = !!material.lesson.section?.isFreePreview;
    if (userRole !== Role.ADMIN && !owner) {
      const { EntitlementResolver } = await import('../commerce/entitlement-resolver.service');
      if (preview) {
        if (!(await EntitlementResolver.hasCoursePreviewAccess(course.id, userId))) throw new ForbiddenError('This course preview is not available');
      } else {
        await EntitlementResolver.assertLearningAccess(userId, userRole, { courseId: course.id, teacherId: course.teacherId });
      }
    }
    return material;
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
            module: { include: { course: true } },
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundError('Material not found');
    }

    const teacherId = material.lesson.section?.course.teacherId || material.lesson.module?.course.teacherId;

    if (userRole !== Role.ADMIN && teacherId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this material');
    }

    let boundObject = false;
    try { materialObjectKey(material); boundObject = true; } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
    }
    // Removing an unverified legacy database reference never deletes its bytes.
    if (boundObject) await StorageService.deleteFile(material.fileUrl);
    await prisma.material.delete({ where: { id: materialId } });

    return { message: 'Material deleted successfully' };
  }
}

