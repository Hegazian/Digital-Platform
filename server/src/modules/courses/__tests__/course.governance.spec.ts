import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { CourseService } from '../course.service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../utils/errors';
import { Role } from '@prisma/client';

vi.mock('../../../prisma', () => ({
  prisma: {
    course: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subject: {
      findUnique: vi.fn(),
    },
    grade: {
      findUnique: vi.fn(),
    },
    entitlement: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    // Currency util reads the exchange rate from AppConfig; null -> fallback.
    appConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'p1' }),
      deleteMany: vi.fn(),
    },
    discussionThread: { deleteMany: vi.fn() },
    collectionCourse: { deleteMany: vi.fn() },
  },
}));

describe('Course Governance & Lifecycle Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reviewCourseStatus', () => {
    it('should save rejection reason when rejecting a course', async () => {
      const mockCourse = { id: 'c1', titleEn: 'Biology 1', status: 'UNDER_REVIEW' };
      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.course.update as any).mockResolvedValue({
        ...mockCourse,
        status: 'REJECTED',
        isPublished: false,
        rejectionReason: 'Missing essential lab materials',
      });

      const result = await CourseService.reviewCourseStatus(
        'c1',
        'REJECTED',
        'Missing essential lab materials'
      );

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('Missing essential lab materials');
      expect(prisma.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            rejectionReason: 'Missing essential lab materials',
          }),
        })
      );
    });
  });

  describe('deleteCourse vs archiveCourse', () => {
    it('should allow teacher to delete a DRAFT course', async () => {
      const mockCourse = { id: 'c1', teacherId: 't1', status: 'DRAFT' };
      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.course.delete as any).mockResolvedValue(mockCourse);

      const result = await CourseService.deleteCourse('c1', 't1', Role.TEACHER);
      expect(result.success).toBe(true);
      expect(prisma.course.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('should prevent teacher from deleting a PUBLISHED course', async () => {
      const mockCourse = { id: 'c1', teacherId: 't1', status: 'PUBLISHED' };
      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);

      await expect(
        CourseService.deleteCourse('c1', 't1', Role.TEACHER)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow archiving a PUBLISHED course', async () => {
      const mockCourse = { id: 'c1', teacherId: 't1', status: 'PUBLISHED' };
      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.course.update as any).mockResolvedValue({
        ...mockCourse,
        status: 'ARCHIVED',
        isPublished: false,
      });

      const result = await CourseService.archiveCourse('c1', 't1', Role.TEACHER);
      expect(result.status).toBe('ARCHIVED');
      expect(result.isPublished).toBe(false);
    });
  });

  describe('enrollStudentFree', () => {
    it('should enroll student into published course', async () => {
      const mockCourse = { id: 'c1', isPublished: true, status: 'PUBLISHED' };
      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.entitlement.findFirst as any).mockResolvedValue(null);
      (prisma.entitlement.create as any).mockResolvedValue({
        id: 'ent-1',
        studentId: 's1',
        resourceId: 'c1',
        status: 'ACTIVE',
      });

      const result = await CourseService.enrollStudentFree('c1', 's1');
      expect(result.success).toBe(true);
      expect(prisma.entitlement.create).toHaveBeenCalled();
    });

    it('should return already enrolled if student has active entitlement', async () => {
      const mockCourse = { id: 'c1', isPublished: true, status: 'PUBLISHED' };
      const mockEntitlement = { id: 'ent-1', studentId: 's1', resourceId: 'c1', status: 'ACTIVE' };
      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.entitlement.findFirst as any).mockResolvedValue(mockEntitlement);

      const result = await CourseService.enrollStudentFree('c1', 's1');
      expect(result.message).toContain('Already enrolled');
      expect(prisma.entitlement.create).not.toHaveBeenCalled();
    });

    it('should block enrollment when an active priced product exists (no checkout bypass)', async () => {
      const mockCourse = { id: 'c1', isPublished: true, status: 'PUBLISHED', isFree: false };
      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.product.findFirst as any).mockResolvedValue({ id: 'p1', priceEgp: 150, isActive: true });

      await expect(CourseService.enrollStudentFree('c1', 's1')).rejects.toThrow(ForbiddenError);
      expect(prisma.entitlement.create).not.toHaveBeenCalled();
    });

    it('should enroll into an isFree course without consulting products at all', async () => {
      const mockCourse = { id: 'c1', isPublished: true, status: 'PUBLISHED', isFree: true };
      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      // Even a stale priced product must NOT block an isFree course:
      (prisma.product.findFirst as any).mockResolvedValue({ id: 'p1', priceEgp: 150, isActive: true });
      (prisma.entitlement.findFirst as any).mockResolvedValue(null);
      (prisma.entitlement.create as any).mockResolvedValue({ id: 'ent-2', status: 'ACTIVE' });

      const result = await CourseService.enrollStudentFree('c1', 's1');
      expect(result.success).toBe(true);
      expect(prisma.product.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('isFree pricing transitions (updateCourse)', () => {
    it('should force product prices to 0 when marking a course free', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({
        id: 'c1',
        teacherId: 't1',
        isFree: false,
        titleEn: 'Old',
        titleAr: 'قديم',
      });
      (prisma.course.update as any).mockImplementation((args: any) => Promise.resolve({ ...args.data, id: 'c1' }));
      (prisma.product.findFirst as any).mockResolvedValue({ id: 'p1', priceEgp: 150, priceUsd: 10 });
      (prisma.product.update as any).mockResolvedValue({ id: 'p1' });

      await CourseService.updateCourse('c1', 't1', { isFree: true });

      expect(prisma.course.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isFree: true }) })
      );
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ priceEgp: 0, priceUsd: 0 }) })
      );
    });

    it('should apply platform default price when un-freeing without explicit prices', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({
        id: 'c1',
        teacherId: 't1',
        isFree: true,
        titleEn: 'Old',
        titleAr: 'قديم',
      });
      (prisma.course.update as any).mockImplementation((args: any) => Promise.resolve({ ...args.data, id: 'c1' }));
      // The course was free -> its product is zero-priced:
      (prisma.product.findFirst as any).mockResolvedValue({ id: 'p1', priceEgp: 0, priceUsd: 0 });
      (prisma.product.update as any).mockResolvedValue({ id: 'p1' });

      await CourseService.updateCourse('c1', 't1', { isFree: false });

      // Must not stay accidentally purchasable at 0:
      // USD is derived from EGP (150) at the fallback rate of 48.
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ priceEgp: 150, priceUsd: 3.13 }) })
      );
    });

    it('should keep explicit prices when un-freeing with prices provided', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({
        id: 'c1',
        teacherId: 't1',
        isFree: true,
        titleEn: 'Old',
        titleAr: 'قديم',
      });
      (prisma.course.update as any).mockImplementation((args: any) => Promise.resolve({ ...args.data, id: 'c1' }));
      (prisma.product.findFirst as any).mockResolvedValue({ id: 'p1', priceEgp: 0, priceUsd: 0 });
      (prisma.product.update as any).mockResolvedValue({ id: 'p1' });

      await CourseService.updateCourse('c1', 't1', { isFree: false, priceEgp: 250, priceUsd: 15 });

      // EGP (250) wins; USD is derived at the fallback rate of 48 — the
      // incoming priceUsd: 15 is intentionally ignored.
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ priceEgp: 250, priceUsd: 5.21 }) })
      );
    });
  });
});
