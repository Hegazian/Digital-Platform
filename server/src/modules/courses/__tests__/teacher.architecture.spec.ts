import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CourseService } from '../course.service';
import { prisma } from '../../../prisma';

describe('Teacher Architecture & Course Lifecycle (teacher.md)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Course Lifecycle & Publishing Flow', () => {
    it('should submit a draft course for review', async () => {
      const mockCourse = {
        id: 'course-1',
        titleEn: 'Physics Grade 12',
        titleAr: 'فيزياء',
        teacherId: 'teacher-1',
        status: 'DRAFT',
        modules: [
          {
            id: 'module-1',
            lessons: [{ id: 'lesson-1', blocks: [{ id: 'block-1' }] }],
          },
        ],
      };

      vi.spyOn(prisma.course, 'findUnique').mockResolvedValue(mockCourse as any);
      vi.spyOn(prisma.course, 'update').mockResolvedValue({
        ...mockCourse,
        status: 'UNDER_REVIEW',
      } as any);

      const result = await CourseService.submitCourseForReview('course-1', 'teacher-1');

      expect(result.status).toBe('UNDER_REVIEW');
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        data: { status: 'UNDER_REVIEW' },
      });
    });

    it('should reject review submission if course has no modules or lessons', async () => {
      const emptyCourse = {
        id: 'course-empty',
        teacherId: 'teacher-1',
        status: 'DRAFT',
        modules: [],
      };

      vi.spyOn(prisma.course, 'findUnique').mockResolvedValue(emptyCourse as any);

      await expect(
        CourseService.submitCourseForReview('course-empty', 'teacher-1')
      ).rejects.toThrow('Course must contain at least one module and lesson before submitting for review');
    });

    it('should allow admin/authorized review to approve and publish a course', async () => {
      const reviewedCourse = {
        id: 'course-1',
        status: 'UNDER_REVIEW',
      };

      vi.spyOn(prisma.course, 'findUnique').mockResolvedValue(reviewedCourse as any);
      vi.spyOn(prisma.course, 'update').mockResolvedValue({
        ...reviewedCourse,
        status: 'PUBLISHED',
        isPublished: true,
      } as any);

      const result = await CourseService.reviewCourseStatus('course-1', 'APPROVED');

      expect(result.status).toBe('PUBLISHED');
      expect(result.isPublished).toBe(true);
    });
  });

  describe('Module & Lesson Block Architecture', () => {
    it('should create a CourseModule for a course', async () => {
      const mockModule = {
        id: 'mod-1',
        courseId: 'course-1',
        titleEn: 'Mechanics',
        titleAr: 'الميكانيكا',
        sortOrder: 1,
      };

      vi.spyOn(prisma.courseModule, 'create').mockResolvedValue(mockModule as any);

      const result = await CourseService.createModule('course-1', {
        titleEn: 'Mechanics',
        titleAr: 'الميكانيكا',
        sortOrder: 1,
      });

      expect(result.id).toBe('mod-1');
      expect(prisma.courseModule.create).toHaveBeenCalledWith({
        data: {
          courseId: 'course-1',
          titleEn: 'Mechanics',
          titleAr: 'الميكانيكا',
          sortOrder: 1,
        },
      });
    });

    it('should create a LessonBlock attached to a lesson', async () => {
      const mockBlock = {
        id: 'block-1',
        lessonId: 'lesson-1',
        blockType: 'VIDEO',
        configurationJson: JSON.stringify({ mediaId: 'vid-100' }),
        sortOrder: 1,
      };

      vi.spyOn(prisma.lessonBlock, 'create').mockResolvedValue(mockBlock as any);

      const result = await CourseService.addLessonBlock('lesson-1', {
        blockType: 'VIDEO',
        configuration: { mediaId: 'vid-100' },
        sortOrder: 1,
      });

      expect(result.blockType).toBe('VIDEO');
      expect(JSON.parse(result.configurationJson).mediaId).toBe('vid-100');
    });

    it('should reorder modules transactionally', async () => {
      vi.spyOn(prisma, '$transaction').mockResolvedValue([{}, {}] as any);

      const reordered = await CourseService.reorderModules('course-1', [
        { id: 'mod-2', sortOrder: 1 },
        { id: 'mod-1', sortOrder: 2 },
      ]);

      expect(reordered).toBe(true);
    });
  });

  describe('Assignments & Student Submissions Engine', () => {
    it('should allow teacher to grade an assignment submission and update status', async () => {
      const mockSubmission = {
        id: 'sub-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        status: 'SUBMITTED',
        assignment: { maxScore: 100 },
      };

      vi.spyOn(prisma.assignmentSubmission, 'findUnique').mockResolvedValue(mockSubmission as any);
      vi.spyOn(prisma.assignmentSubmission, 'update').mockResolvedValue({
        ...mockSubmission,
        status: 'GRADED',
        score: 88,
        feedback: 'Great effort',
        gradedById: 'teacher-1',
      } as any);

      const result = await CourseService.gradeAssignmentSubmission('sub-1', 'teacher-1', {
        score: 88,
        feedback: 'Great effort',
      });

      expect(result.status).toBe('GRADED');
      expect(result.score).toBe(88);
    });

    it('should reject score higher than maxScore', async () => {
      const mockSubmission = {
        id: 'sub-1',
        assignment: { maxScore: 100 },
      };

      vi.spyOn(prisma.assignmentSubmission, 'findUnique').mockResolvedValue(mockSubmission as any);

      await expect(
        CourseService.gradeAssignmentSubmission('sub-1', 'teacher-1', {
          score: 120,
          feedback: 'Too high',
        })
      ).rejects.toThrow('Score cannot exceed maximum score of 100');
    });
  });

  describe('Teacher Dashboard & Analytics Aggregation', () => {
    it('should aggregate teacher dashboard metrics', async () => {
      vi.spyOn(prisma.course, 'count').mockResolvedValue(5);
      vi.spyOn(prisma.entitlement, 'count').mockResolvedValue(140);
      vi.spyOn(prisma.assignmentSubmission, 'count').mockResolvedValue(8);

      const stats = await CourseService.getTeacherDashboardStats('teacher-1');

      expect(stats.activeCourses).toBe(5);
      expect(stats.totalStudents).toBe(140);
      expect(stats.pendingAssignments).toBe(8);
    });
  });
});
