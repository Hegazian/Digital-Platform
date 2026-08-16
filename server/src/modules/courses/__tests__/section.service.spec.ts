import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { SectionService } from '../section.service';

vi.mock('../../../prisma', () => ({
  prisma: {
    section: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('SectionService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSection', () => {
    it('should create section with free preview flag if intro section', async () => {
      const sectionData = {
        courseId: 'course-1',
        titleEn: 'Chapter 1: Basics',
        titleAr: 'الفصل الأول: الأساسيات',
        orderIndex: 1,
        isFreePreview: true,
      };

      const mockSection = { id: 'sec-1', ...sectionData };
      (prisma.section.create as any).mockResolvedValue(mockSection);

      const result = await SectionService.createSection(sectionData);

      expect(result.isFreePreview).toBe(true);
      expect(result.orderIndex).toBe(1);
      expect(prisma.section.create).toHaveBeenCalledWith({ data: sectionData });
    });
  });
});
