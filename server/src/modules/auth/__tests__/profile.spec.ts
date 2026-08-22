import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../prisma';
import { AuthService } from '../auth.service';
import { NotFoundError, BadRequestError } from '../../../utils/errors';

vi.mock('../../../prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    grade: {
      findUnique: vi.fn(),
    },
  },
}));

describe('AuthService Profile Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile with grade details', async () => {
      const mockProfile = {
        id: 'u1',
        email: 'student@test.com',
        name: 'Student One',
        role: 'STUDENT',
        grade: { id: 'g1', nameEn: '1st Secondary', nameAr: 'الصف الأول الثانوي' },
      };
      (prisma.user.findUnique as any).mockResolvedValue(mockProfile);

      const result = await AuthService.getProfile('u1');
      expect(result).toEqual(mockProfile);
    });

    it('should throw NotFoundError if user does not exist', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      await expect(AuthService.getProfile('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update student name and gradeId', async () => {
      const mockUser = { id: 'u1', name: 'Old Name' };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.grade.findUnique as any).mockResolvedValue({ id: 'g1' });
      (prisma.user.update as any).mockResolvedValue({
        id: 'u1',
        name: 'Updated Name',
        gradeId: 'g1',
        grade: { id: 'g1', nameEn: '1st Secondary' },
      });

      const result = await AuthService.updateProfile('u1', {
        name: 'Updated Name',
        gradeId: 'g1',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.gradeId).toBe('g1');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestError if gradeId is invalid', async () => {
      const mockUser = { id: 'u1', name: 'Old Name' };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.grade.findUnique as any).mockResolvedValue(null);

      await expect(
        AuthService.updateProfile('u1', { gradeId: 'bad-grade-id' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if name is shorter than 2 characters', async () => {
      const mockUser = { id: 'u1', name: 'Old Name' };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(
        AuthService.updateProfile('u1', { name: 'A' })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
