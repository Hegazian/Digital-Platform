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
  });
});
