"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
const storage_1 = require("../../utils/storage");
const client_1 = require("@prisma/client");
class MaterialService {
    /**
     * Upload a new lesson material attachment.
     */
    static async uploadMaterial(params) {
        const { lessonId, title, fileBuffer, fileName, mimeType, sizeBytes, userId, userRole } = params;
        if (!lessonId || !title || !fileBuffer || !fileName) {
            throw new errors_1.BadRequestError('lessonId, title, and file are required');
        }
        // Verify lesson and section/module ownership
        const lesson = await prisma_1.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                section: { include: { course: true } },
                module: { include: { course: true } },
            },
        });
        if (!lesson) {
            throw new errors_1.NotFoundError('Lesson not found');
        }
        const teacherId = lesson.section?.course.teacherId || lesson.module?.course.teacherId;
        if (userRole !== client_1.Role.ADMIN && teacherId !== userId) {
            throw new errors_1.ForbiddenError('You do not have permission to add materials to this course');
        }
        // Upload to Supabase/Storage
        const fileUrl = await storage_1.StorageService.uploadFile(fileBuffer, fileName, mimeType);
        // Save to Database
        const material = await prisma_1.prisma.material.create({
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
    static async getMaterialsByLesson(lessonId, userId, userRole) {
        const lesson = await prisma_1.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                section: { include: { course: true } },
                module: { include: { course: true } },
            },
        });
        if (!lesson) {
            throw new errors_1.NotFoundError('Lesson not found');
        }
        const teacherId = lesson.section?.course.teacherId || lesson.module?.course.teacherId;
        const isFreePreview = lesson.section?.isFreePreview || false;
        const subjectId = lesson.section?.course.subjectId || lesson.module?.course.subjectId;
        // Allow Admin or Course Teacher
        if (userRole === client_1.Role.ADMIN || (userRole === client_1.Role.TEACHER && teacherId === userId)) {
            return await prisma_1.prisma.material.findMany({ where: { lessonId }, orderBy: { createdAt: 'asc' } });
        }
        // Allow free preview lessons
        if (isFreePreview) {
            return await prisma_1.prisma.material.findMany({ where: { lessonId }, orderBy: { createdAt: 'asc' } });
        }
        // Check student active subscription
        const activeSub = await prisma_1.prisma.subscription.findFirst({
            where: {
                userId,
                subjectId,
                status: client_1.SubscriptionStatus.ACTIVE,
                endDate: { gte: new Date() },
            },
        });
        if (!activeSub) {
            throw new errors_1.ForbiddenError('Active subscription required to access lesson materials');
        }
        return await prisma_1.prisma.material.findMany({ where: { lessonId }, orderBy: { createdAt: 'asc' } });
    }
    /**
     * Delete a material attachment.
     */
    static async deleteMaterial(materialId, userId, userRole) {
        const material = await prisma_1.prisma.material.findUnique({
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
            throw new errors_1.NotFoundError('Material not found');
        }
        const teacherId = material.lesson.section?.course.teacherId || material.lesson.module?.course.teacherId;
        if (userRole !== client_1.Role.ADMIN && teacherId !== userId) {
            throw new errors_1.ForbiddenError('You do not have permission to delete this material');
        }
        await storage_1.StorageService.deleteFile(material.fileUrl);
        await prisma_1.prisma.material.delete({ where: { id: materialId } });
        return { message: 'Material deleted successfully' };
    }
}
exports.MaterialService = MaterialService;
