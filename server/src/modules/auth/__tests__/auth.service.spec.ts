import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../../../prisma';
import { AuthService } from '../auth.service';

vi.mock('../../../prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn().mockResolvedValue({ id: 'rt-1' }),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Registration Logic', () => {
    it('should hash password and create student user', async () => {
      vi.spyOn(bcrypt, 'hash').mockImplementation(async () => 'hashed_password');
      
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: 'user-1',
        email: 'student@test.com',
        name: 'Student Name',
        role: Role.STUDENT,
        teacherStatus: null,
      });

      const res = await AuthService.register({
        email: 'student@test.com',
        password: 'Password123',
        name: 'Student Name',
        role: Role.STUDENT,
      });

      expect(res.email).toBe('student@test.com');
      expect(res.role).toBe(Role.STUDENT);
    });

    it('should throw ForbiddenError when registering with role=ADMIN', async () => {
      await expect(
        AuthService.register({
          email: 'admin@test.com',
          password: 'Password123!',
          name: 'Admin Name',
          role: Role.ADMIN,
        })
      ).rejects.toThrow('Admin accounts cannot be created through public registration');
    });
  });

  describe('Login Logic', () => {
    it('should throw UnauthorizedError for wrong password', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => false);
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        password: 'hashed_password',
        isActive: true,
        role: Role.STUDENT,
      });

      await expect(
        AuthService.login({ email: 'user@test.com', password: 'wrongpassword' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedError for deactivated account', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        password: 'hashed_password',
        isActive: false,
        role: Role.STUDENT,
      });

      await expect(
        AuthService.login({ email: 'user@test.com', password: 'Password123!' })
      ).rejects.toThrow('Account is deactivated or unverified');
    });

    it('should throw UnauthorizedError for pending teacher account', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'teacher@test.com',
        password: 'hashed_password',
        isActive: true,
        role: Role.TEACHER,
        teacherStatus: 'PENDING',
      });

      await expect(
        AuthService.login({ email: 'teacher@test.com', password: 'Password123!' })
      ).rejects.toThrow('Teacher account is pending approval');
    });
  });

  describe('refreshToken Logic', () => {
    it('should throw BadRequestError if token is missing', async () => {
      await expect(AuthService.refreshToken('')).rejects.toThrow('Refresh token is required');
    });

    it('should return new tokens for a valid refresh token', async () => {
      const { generateRefreshToken } = await import('../../../utils/jwt');
      const sampleRefreshToken = generateRefreshToken({ userId: 'user-1', role: Role.STUDENT });
      const crypto = await import('crypto');

      // Registered, live session matching the presented token:
      (prisma.refreshToken.findUnique as any).mockImplementation(({ where }: any) =>
        Promise.resolve({
          id: 'rt-1',
          userId: 'user-1',
          tokenHash: crypto
            .createHash('sha256')
            .update(sampleRefreshToken)
            .digest('hex'),
          expiresAt: new Date(Date.now() + 86400_000),
          revokedAt: null,
        })
      );
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'student@test.com',
        name: 'Student Name',
        role: Role.STUDENT,
        isActive: true,
      });

      const res = await AuthService.refreshToken(sampleRefreshToken);
      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
      // Rotation must revoke the old row and register the new one:
      expect(prisma.refreshToken.update).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      await expect(AuthService.refreshToken('invalid_token')).rejects.toThrow('Invalid or expired refresh token');
    });
  });
});
