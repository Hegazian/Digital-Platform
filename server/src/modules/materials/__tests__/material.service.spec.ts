import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { MaterialService } from '../material.service';
import { StorageService } from '../../../utils/storage';
import { Role, SubscriptionStatus } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../../utils/errors';

vi.mock('../../../prisma', () => ({
  prisma: {
    lesson: {
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
    material: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../../utils/storage', () => ({
  StorageService: {
    uploadFile: vi.fn().mockResolvedValue('/uploads/materials/test.pdf'),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('MaterialService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadMaterial', () => {
    it('should upload a material for course teacher', async () => {
      const mockLesson = {
        id: 'l1',
        section: { course: { teacherId: 't1', subjectId: 'sub1' } },
      };
      const mockMaterial = { id: 'm1', title: 'Summary PDF', fileUrl: '/uploads/materials/test.pdf' };

      (prisma.lesson.findUnique as any).mockResolvedValue(mockLesson);
      (prisma.material.create as any).mockResolvedValue(mockMaterial);

      const result = await MaterialService.uploadMaterial({
        lessonId: 'l1',
        title: 'Summary PDF',
        fileBuffer: Buffer.from('dummy content'),
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        userId: 't1',
        userRole: Role.TEACHER,
      });

      expect(result.id).toBe('m1');
      expect(StorageService.uploadFile).toHaveBeenCalled();
      expect(prisma.material.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenError if non-owner teacher tries to upload', async () => {
      const mockLesson = {
        id: 'l1',
        section: { course: { teacherId: 't1', subjectId: 'sub1' } },
      };
      (prisma.lesson.findUnique as any).mockResolvedValue(mockLesson);

      await expect(
        MaterialService.uploadMaterial({
          lessonId: 'l1',
          title: 'Summary PDF',
          fileBuffer: Buffer.from('dummy'),
          fileName: 'test.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          userId: 'other_teacher',
          userRole: Role.TEACHER,
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getMaterialsByLesson', () => {
    it('should allow student with active subscription to view materials', async () => {
      const mockLesson = {
        id: 'l1',
        section: { isFreePreview: false, course: { teacherId: 't1', subjectId: 'sub1' } },
      };
      (prisma.lesson.findUnique as any).mockResolvedValue(mockLesson);
      (prisma.subscription.findFirst as any).mockResolvedValue({ status: SubscriptionStatus.ACTIVE });
      (prisma.material.findMany as any).mockResolvedValue([{ id: 'm1', title: 'File' }]);

      const result = await MaterialService.getMaterialsByLesson('l1', 'student1', Role.STUDENT);

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenError if student has no active subscription for non-free lesson', async () => {
      const mockLesson = {
        id: 'l1',
        section: { isFreePreview: false, course: { teacherId: 't1', subjectId: 'sub1' } },
      };
      (prisma.lesson.findUnique as any).mockResolvedValue(mockLesson);
      (prisma.subscription.findFirst as any).mockResolvedValue(null);

      await expect(
        MaterialService.getMaterialsByLesson('l1', 'student1', Role.STUDENT)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteMaterial', () => {
    it('should delete material and call StorageService.deleteFile', async () => {
      const mockMaterial = {
        id: 'm1',
        fileUrl: '/uploads/materials/test.pdf',
        lesson: { section: { course: { teacherId: 't1' } } },
      };
      (prisma.material.findUnique as any).mockResolvedValue(mockMaterial);
      (prisma.material.delete as any).mockResolvedValue(mockMaterial);

      const result = await MaterialService.deleteMaterial('m1', 't1', Role.TEACHER);

      expect(result.message).toBe('Material deleted successfully');
      expect(StorageService.deleteFile).toHaveBeenCalledWith('/uploads/materials/test.pdf');
    });
  });
});
