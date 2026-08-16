import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { AdminService } from '../admin.service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../utils/errors';

vi.mock('../../../prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    course: {
      count: vi.fn(),
    },
    subject: {
      count: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
    },
    video: {
      count: vi.fn(),
    },
    quiz: {
      count: vi.fn(),
    },
  },
}));

describe('AdminService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPendingTeachers', () => {
    it('should return only pending teacher applications', async () => {
      const mockPending = [
        { id: 't1', email: 'teacher@test.com', name: 'Test Teacher', teacherStatus: 'PENDING', createdAt: new Date() },
      ];
      (prisma.user.findMany as any).mockResolvedValue(mockPending);

      const result = await AdminService.getPendingTeachers();

      expect(result).toEqual(mockPending);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'TEACHER', teacherStatus: 'PENDING' },
        })
      );
    });
  });

  describe('updateTeacherStatus', () => {
    it('should approve a pending teacher', async () => {
      const mockTeacher = { id: 't1', email: 'teacher@test.com', name: 'T', role: 'TEACHER', teacherStatus: 'PENDING' };
      const mockUpdated = { ...mockTeacher, teacherStatus: 'APPROVED' };
      (prisma.user.findUnique as any).mockResolvedValue(mockTeacher);
      (prisma.user.update as any).mockResolvedValue(mockUpdated);

      const result = await AdminService.updateTeacherStatus('t1', 'APPROVED');

      expect(result.teacherStatus).toBe('APPROVED');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: { teacherStatus: 'APPROVED' },
        })
      );
    });

    it('should throw NotFoundError for non-existent teacher', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(AdminService.updateTeacherStatus('fake', 'APPROVED')).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if user is not a teacher', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 's1', role: 'STUDENT', teacherStatus: null });

      await expect(AdminService.updateTeacherStatus('s1', 'APPROVED')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if teacher already has that status', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 't1', role: 'TEACHER', teacherStatus: 'APPROVED' });

      await expect(AdminService.updateTeacherStatus('t1', 'APPROVED')).rejects.toThrow(BadRequestError);
    });
  });

  describe('setUserActiveStatus', () => {
    it('should deactivate a student account', async () => {
      const mockUser = { id: 's1', role: 'STUDENT' };
      const mockUpdated = { id: 's1', email: 's@t.com', name: 'S', role: 'STUDENT', isActive: false };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue(mockUpdated);

      const result = await AdminService.setUserActiveStatus('s1', false);

      expect(result.isActive).toBe(false);
    });

    it('should throw ForbiddenError when trying to deactivate admin', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'a1', role: 'ADMIN' });

      await expect(AdminService.setUserActiveStatus('a1', false)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getPlatformStats', () => {
    it('should return aggregate platform statistics', async () => {
      (prisma.user.count as any)
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(70)   // students
        .mockResolvedValueOnce(20)   // teachers
        .mockResolvedValueOnce(10)   // parents
        .mockResolvedValueOnce(5)    // pending teachers
        .mockResolvedValueOnce(15);  // approved teachers
      (prisma.course.count as any)
        .mockResolvedValueOnce(25)   // total courses
        .mockResolvedValueOnce(18);  // published courses
      (prisma.subject.count as any).mockResolvedValue(3);
      (prisma.subscription.count as any)
        .mockResolvedValueOnce(50)   // active
        .mockResolvedValueOnce(80);  // total
      (prisma.video.count as any).mockResolvedValue(120);
      (prisma.quiz.count as any).mockResolvedValue(30);

      const stats = await AdminService.getPlatformStats();

      expect(stats.users.total).toBe(100);
      expect(stats.users.students).toBe(70);
      expect(stats.users.pendingTeachers).toBe(5);
      expect(stats.content.totalCourses).toBe(25);
      expect(stats.content.publishedCourses).toBe(18);
      expect(stats.subscriptions.active).toBe(50);
    });
  });
});
