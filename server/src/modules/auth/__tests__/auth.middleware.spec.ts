import { describe, it, expect, vi } from 'vitest';
import { authenticate, requireRole, requireApprovedTeacher, AuthRequest } from '../auth.middleware';
import { Role, TeacherStatus } from '@prisma/client';
import * as jwtUtils from '../../../utils/jwt';

// authenticate() performs a DB-backed activation (revocation) check.
vi.mock('../../../prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ isActive: true }),
    },
  },
}));

describe('Auth Middleware Suite', () => {
  describe('authenticate', () => {
    it('should extract and verify Bearer token from header', async () => {
      const mReq = {
        headers: { authorization: 'Bearer valid_token' },
      } as AuthRequest;
      const mRes = {} as any;
      const mNext = vi.fn();

      vi.spyOn(jwtUtils, 'verifyAccessToken').mockReturnValue({ userId: 'u1', role: Role.STUDENT } as any);

      await authenticate(mReq, mRes, mNext);

      expect(mReq.user).toEqual({ userId: 'u1', role: Role.STUDENT, teacherStatus: undefined });
      expect(mNext).toHaveBeenCalledWith();
    });

    it('should return error for missing authorization header', async () => {
      const mReq = { headers: {} } as AuthRequest;
      const mRes = {} as any;
      const mNext = vi.fn();

      await authenticate(mReq, mRes, mNext);

      expect(mNext).toHaveBeenCalled();
      const err = mNext.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });
  });

  describe('requireRole', () => {
    it('should allow access if role matches', () => {
      const mReq = { user: { role: Role.TEACHER } } as AuthRequest;
      const mRes = {} as any;
      const mNext = vi.fn();

      const guard = requireRole([Role.TEACHER]);
      guard(mReq, mRes, mNext);

      expect(mNext).toHaveBeenCalledWith();
    });

    it('should reject access if role does not match', () => {
      const mReq = { user: { role: Role.STUDENT } } as AuthRequest;
      const mRes = {} as any;
      const mNext = vi.fn();

      const guard = requireRole([Role.TEACHER]);
      guard(mReq, mRes, mNext);

      const err = mNext.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
    });

    it('should allow ADMIN role when guard requires [Role.ADMIN]', () => {
      const mReq = { user: { role: Role.ADMIN } } as AuthRequest;
      const mRes = {} as any;
      const mNext = vi.fn();

      const guard = requireRole([Role.ADMIN]);
      guard(mReq, mRes, mNext);

      expect(mNext).toHaveBeenCalledWith();
    });

    it('should reject STUDENT role when guard requires [Role.ADMIN]', () => {
      const mReq = { user: { role: Role.STUDENT } } as AuthRequest;
      const mRes = {} as any;
      const mNext = vi.fn();

      const guard = requireRole([Role.ADMIN]);
      guard(mReq, mRes, mNext);

      const err = mNext.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
    });
  });
});
