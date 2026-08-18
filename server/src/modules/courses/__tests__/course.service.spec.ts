import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { CourseService } from '../course.service';
import { NotFoundError, ForbiddenError } from '../../../utils/errors';

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
  },
}));

describe('CourseService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create a course under a specific subject by an approved teacher', async () => {
      const courseData = {
        titleEn: 'Intro to Python',
        titleAr: 'مقدمة في بايثون',
        description: 'Learn Python programming from scratch',
        teacherId: 'teacher-1',
        subjectId: 'sub-1',
      };

      const mockCourse = { id: 'course-1', ...courseData, isPublished: false };
      (prisma.subject.findUnique as any).mockResolvedValue({ id: 'sub-1', nameEn: 'Programming' });
      (prisma.course.create as any).mockResolvedValue(mockCourse);

      const result = await CourseService.createCourse(courseData);

      expect(result.id).toBe('course-1');
      expect(result.isPublished).toBe(false);
      expect(prisma.course.create).toHaveBeenCalledWith({ data: courseData });
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

  describe('publishCourse', () => {
    it('should toggle isPublished status to true', async () => {
      const mockCourse = {
        id: 'course-1',
        teacherId: 'teacher-1',
        isPublished: false,
      };

      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);
      (prisma.course.update as any).mockResolvedValue({ ...mockCourse, isPublished: true });

      const result = await CourseService.publishCourse('course-1', 'teacher-1');

      expect(result.isPublished).toBe(true);
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        data: { isPublished: true, status: 'PUBLISHED' },
      });
    });

    it('should throw ForbiddenError if non-owner teacher tries to publish', async () => {
      const mockCourse = {
        id: 'course-1',
        teacherId: 'teacher-owner',
        isPublished: false,
      };

      (prisma.course.findUnique as any).mockResolvedValue(mockCourse);

      await expect(CourseService.publishCourse('course-1', 'teacher-other')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getAllCourses', () => {
    it('should return paginated course list', async () => {
      (prisma.course.findMany as any).mockResolvedValue([{ id: 'c1', titleEn: 'C1' }]);
      (prisma.course.count as any).mockResolvedValue(1);

      const res = await CourseService.getAllCourses({ page: '1', limit: '10' });
      expect(res.courses).toBeDefined();
      expect(res.pagination.total).toBe(1);
      expect(res.pagination.page).toBe(1);
    });
  });
});
