import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { SubjectService } from '../subject.service';

vi.mock('../../../prisma', () => ({
  prisma: {
    subject: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subjectPricing: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('SubjectService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSubjects', () => {
    it('should return all subjects with active pricing', async () => {
      const mockSubjects = [
        {
          id: 'sub-1',
          nameEn: 'Programming',
          nameAr: 'برمجة',
          pricing: [
            { period: 'MONTHLY', priceEgp: 200, priceUsd: 10 },
            { period: 'YEARLY', priceEgp: 1800, priceUsd: 90 },
          ],
        },
      ];
      (prisma.subject.findMany as any).mockResolvedValue(mockSubjects);

      const result = await SubjectService.getAllSubjects();

      expect(result).toEqual(mockSubjects);
      expect(prisma.subject.findMany).toHaveBeenCalledWith({
        include: { pricing: true },
      });
    });
  });

  describe('createSubject', () => {
    it('should create a subject with pricing plans', async () => {
      const inputData = {
        nameEn: 'Physics 1st Secondary',
        nameAr: 'فيزياء الصف الأول الثانوي',
        description: 'High school physics',
        pricing: [
          { period: 'MONTHLY', priceEgp: 250, priceUsd: 15 },
          { period: 'SIX_MONTHS', priceEgp: 1200, priceUsd: 70 },
          { period: 'YEARLY', priceEgp: 2000, priceUsd: 120 },
        ],
      };

      const mockCreatedSubject = { id: 'sub-2', ...inputData };
      (prisma.subject.create as any).mockResolvedValue(mockCreatedSubject);

      const result = await SubjectService.createSubject(inputData);

      expect(result).toHaveProperty('id', 'sub-2');
      expect(prisma.subject.create).toHaveBeenCalled();
    });
  });
});
