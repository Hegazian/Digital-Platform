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
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    discussionThread: { deleteMany: vi.fn() },
    collectionCourse: { deleteMany: vi.fn() },
    certificate: { deleteMany: vi.fn() },
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
  });
});
