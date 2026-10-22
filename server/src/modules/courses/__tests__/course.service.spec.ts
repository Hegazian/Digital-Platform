import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { CourseService } from '../course.service';
import { NotFoundError, ForbiddenError } from '../../../utils/errors';
import { Role } from '@prisma/client';

vi.mock('../../../prisma', () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    subject: {
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn(),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'prod-1' }),
      update: vi.fn().mockResolvedValue({ id: 'prod-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    // Currency util reads the exchange rate from AppConfig; null -> fallback 48.
    appConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    module: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lesson: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('CourseService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create a course under a specific subject by an approved teacher and create product pricing', async () => {
      const courseData = {
        titleEn: 'Intro to Python',
        titleAr: 'مقدمة في بايثون',
        description: 'Learn Python programming from scratch',
        teacherId: 'teacher-1',
        subjectId: 'sub-1',
        priceEgp: 180,
        priceUsd: 12,
      };

      const mockCourse = {
        id: 'course-1',
        titleEn: courseData.titleEn,
        titleAr: courseData.titleAr,
        description: courseData.description,
        thumbnail: undefined,
        teacherId: courseData.teacherId,
        subjectId: courseData.subjectId,
        isPublished: false,
      };

      (prisma.subject.findUnique as any).mockResolvedValue({ id: 'sub-1', nameEn: 'Programming' });
      (prisma.course.create as any).mockResolvedValue(mockCourse);
      (prisma.product.create as any).mockResolvedValue({ id: 'prod-1' });

      const result = await CourseService.createCourse(courseData);

      expect(result.id).toBe('course-1');
      expect(result.isPublished).toBe(false);
      expect(prisma.course.create).toHaveBeenCalledWith({
        data: {
          titleEn: courseData.titleEn,
          titleAr: courseData.titleAr,
          description: courseData.description,
          thumbnail: undefined,
          teacherId: courseData.teacherId,
          subjectId: courseData.subjectId,
          gradeId: null,
          academicYearId: null,
          isFree: false,
          status: 'DRAFT',
        },
      });
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          nameEn: mockCourse.titleEn,
          nameAr: mockCourse.titleAr,
          description: mockCourse.description,
          productType: 'COURSE',
          resourceId: mockCourse.id,
          priceEgp: 180,
          // Derived from EGP (180) at the fallback rate of 48.
          priceUsd: 3.75,
          isActive: true,
        },
      });
    });

    it('should throw NotFoundError if subjectId does not exist', async () => {
      (prisma.subject.findUnique as any).mockResolvedValue(null);

      await expect(
        CourseService.createCourse({
          titleEn: 'Intro to Python',
          titleAr: 'مقدمة في بايثون',
          description: 'Desc',
          teacherId: 'teacher-1',
          subjectId: 'invalid-sub-id',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateCourse', () => {
    it('should allow the course owner teacher to update course and pricing', async () => {
      const mockCourse = {
        id: 'course-1',
        teacherId: 'teacher-1',
        titleEn: 'Old Title',
      };

      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.course.update as any).mockResolvedValue({ ...mockCourse, titleEn: 'Updated Title' });
      (prisma.product.findFirst as any).mockResolvedValue({ id: 'prod-1' });
      (prisma.product.update as any).mockResolvedValue({ id: 'prod-1' });

      const res = await CourseService.updateCourse('course-1', 'teacher-1', {
        titleEn: 'Updated Title',
        priceEgp: 200,
      });

      expect(res.titleEn).toBe('Updated Title');
      expect(prisma.course.update).toHaveBeenCalled();
    });

    it('should allow Admin to update any course even if not the owner', async () => {
      const mockCourse = {
        id: 'course-1',
        teacherId: 'teacher-1',
        titleEn: 'Teacher Title',
      };

      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.course.update as any).mockResolvedValue({ ...mockCourse, titleEn: 'Admin Override' });

      const res = await CourseService.updateCourse(
        'course-1',
        'admin-id',
        { titleEn: 'Admin Override' },
        Role.ADMIN
      );

      expect(res.titleEn).toBe('Admin Override');
    });

    it('should throw ForbiddenError if non-owner non-admin tries to update', async () => {
      const mockCourse = {
        id: 'course-1',
        teacherId: 'teacher-owner',
      };

      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);

      await expect(
        CourseService.updateCourse('course-1', 'teacher-intruder', { titleEn: 'Hacked' }, Role.TEACHER)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteCourse', () => {
    it('should allow Admin to delete any course', async () => {
      const mockCourse = {
        id: 'course-1',
        teacherId: 'teacher-1',
      };

      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.course.delete as any).mockResolvedValue(mockCourse);

      const res = await CourseService.deleteCourse('course-1', 'admin-id', Role.ADMIN);
      expect(res.id).toBe('course-1');
      expect(prisma.course.delete).toHaveBeenCalledWith({ where: { id: 'course-1' } });
    });

    it('should throw ForbiddenError if non-owner non-admin tries to delete', async () => {
      const mockCourse = {
        id: 'course-1',
        teacherId: 'teacher-owner',
      };

      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);

      await expect(
        CourseService.deleteCourse('course-1', 'teacher-intruder', Role.TEACHER)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('publishCourse', () => {
    it('should allow an ADMIN to publish and set status to PUBLISHED', async () => {
      const mockCourse = {
        id: 'course-1',
        teacherId: 'teacher-1',
        isPublished: false,
        status: 'UNDER_REVIEW',
        modules: [{ lessons: [{ videoId: 'v1', materials: [], blocks: [] }] }],
        sections: [],
      };

      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.course.update as any).mockResolvedValue({ ...mockCourse, isPublished: true });

      const result = await CourseService.publishCourse('course-1', 'admin-1', Role.ADMIN);

      expect(result.isPublished).toBe(true);
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        data: { isPublished: true, status: 'PUBLISHED', rejectionReason: null },
      });
    });

    it('should block teachers from publishing directly (review workflow enforced)', async () => {
      const mockCourse = {
        id: 'course-1',
        teacherId: 'teacher-owner',
        isPublished: false,
        modules: [],
        sections: [],
      };

      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);

      await expect(
        CourseService.publishCourse('course-1', 'teacher-owner', Role.TEACHER)
      ).rejects.toThrow(/only administrators can publish/i);
    });
  });

  describe('getAllCourses', () => {
    it('should return paginated course list with enriched single course prices', async () => {
      (prisma.course.findMany as any).mockResolvedValue([{ id: 'c1', titleEn: 'C1' }]);
      (prisma.course.count as any).mockResolvedValue(1);
      (prisma.product.findMany as any).mockResolvedValue([
        { resourceId: 'c1', priceEgp: 180, priceUsd: 12, id: 'p1' },
      ]);

      const res = await CourseService.getAllCourses({ page: '1', limit: '10' });
      expect(res.courses).toBeDefined();
      expect(res.courses[0].priceEgp).toBe(180);
      expect(res.courses[0].priceUsd).toBe(12);
      expect(res.pagination.total).toBe(1);
      expect(res.pagination.page).toBe(1);
    });
  });
});
