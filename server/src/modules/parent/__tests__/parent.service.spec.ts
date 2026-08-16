import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { ParentService } from '../parent.service';
import { NotFoundError, BadRequestError } from '../../../utils/errors';

vi.mock('../../../prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    parentStudent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('ParentService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('linkStudent', () => {
    it('should throw NotFoundError if student email is not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        ParentService.linkStudent('parent-1', 'nonexistent@test.com')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if user with that email is not a student', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'u-1',
        email: 'teacher@test.com',
        role: 'TEACHER',
      });

      await expect(
        ParentService.linkStudent('parent-1', 'teacher@test.com')
      ).rejects.toThrow(BadRequestError);
    });

    it('should create parent-student link successfully for a valid student', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'student-1',
        email: 'student@test.com',
        role: 'STUDENT',
      });
      (prisma.parentStudent.create as any).mockResolvedValue({
        id: 'link-1',
        parentId: 'parent-1',
        studentId: 'student-1',
      });

      const res = await ParentService.linkStudent('parent-1', 'student@test.com');
      expect(res.id).toBe('link-1');
    });

    it('should throw BadRequestError if link already exists (P2002 error)', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'student-1',
        email: 'student@test.com',
        role: 'STUDENT',
      });
      (prisma.parentStudent.create as any).mockRejectedValue({ code: 'P2002' });

      await expect(
        ParentService.linkStudent('parent-1', 'student@test.com')
      ).rejects.toThrow('You are already linked to this student.');
    });
  });
});
