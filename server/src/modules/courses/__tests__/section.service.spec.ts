import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { SectionService } from '../section.service';
import { ForbiddenError, NotFoundError } from '../../../utils/errors';

vi.mock('../../../prisma', () => ({
  prisma: {
    course: {
      findUnique: vi.fn(),
    },
    section: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('SectionService Unit Tests', () => {
  const owner = { userId: 'teacher-1', role: 'TEACHER' as any };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSection', () => {
    const sectionData = {
      courseId: 'course-1',
      titleEn: 'Chapter 1: Basics',
      titleAr: 'الفصل الأول: الأساسيات',
      orderIndex: 1,
      isFreePreview: true,
    };

    it('should create section with free preview flag if intro section', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({ id: 'course-1', teacherId: 'teacher-1' });
      const mockSection = { id: 'sec-1', ...sectionData };
      (prisma.section.create as any).mockResolvedValue(mockSection);

      const result = await SectionService.createSection(sectionData, owner);

      expect(result.isFreePreview).toBe(true);
      expect(result.orderIndex).toBe(1);
      expect(prisma.section.create).toHaveBeenCalledWith({ data: sectionData });
    });

    it('should allow admins to add sections to any course', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({ id: 'course-1', teacherId: 'someone-else' });
      (prisma.section.create as any).mockResolvedValue({ id: 'sec-2' });

      await expect(
        SectionService.createSection(sectionData, { userId: 'admin-1', role: 'ADMIN' as any })
      ).resolves.toBeDefined();
    });

    it('should reject a teacher who does not own the course', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({ id: 'course-1', teacherId: 'other-teacher' });

      await expect(
        SectionService.createSection(sectionData, { userId: 'teacher-2', role: 'TEACHER' as any })
      ).rejects.toThrow(ForbiddenError);
      expect(prisma.section.create).not.toHaveBeenCalled();
    });

    it('should reject when no authenticated actor is provided', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({ id: 'course-1', teacherId: 'teacher-1' });

      await expect(SectionService.createSection(sectionData, null)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when the course does not exist', async () => {
      (prisma.course.findUnique as any).mockResolvedValue(null);

      await expect(
        SectionService.createSection(sectionData, owner)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
