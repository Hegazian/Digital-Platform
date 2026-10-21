import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticate, optionalAuth, requireApprovedTeacher, requireRole } from '../auth.middleware';
import { prisma } from '../../../prisma';
import * as jwt from '../../../utils/jwt';

vi.mock('../../../prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('../../../utils/jwt', () => ({ verifyAccessToken: vi.fn() }));
const account = { id: 'student-a', isActive: true, role: 'STUDENT', teacherStatus: null, authVersion: 1 };
const req = () => ({ headers: { authorization: 'Bearer fixture' } } as any);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...account } as any); vi.mocked(jwt.verifyAccessToken).mockReturnValue({ userId: 'student-a', role: 'ADMIN', authVersion: 1 }); });

describe('current account authorization', () => {
  it('uses current DB privileges regardless of token role', async () => {
    const request = req(), next = vi.fn();
    await authenticate(request, {} as any, next);
    expect(request.user).toMatchObject({ userId: 'student-a', role: 'STUDENT' });
    expect(next).toHaveBeenCalledWith();
  });
  it.each([
    ['legacy session', { userId: 'student-a' }, account, 401],
    ['revoked version', { userId: 'student-a', authVersion: 1 }, { ...account, authVersion: 2 }, 401],
    ['deactivated', { userId: 'student-a', authVersion: 1 }, { ...account, isActive: false }, 401],
    ['pending teacher', { userId: 'student-a', authVersion: 1 }, { ...account, role: 'TEACHER', teacherStatus: 'PENDING' }, 403],
    ['rejected teacher', { userId: 'student-a', authVersion: 1 }, { ...account, role: 'TEACHER', teacherStatus: 'REJECTED' }, 403],
    ['MFA challenge', { userId: 'student-a', purpose: 'mfa_challenge' }, account, 401],
  ])('denies %s without attaching an actor', async (_label, token, user, status) => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);
    vi.mocked(jwt.verifyAccessToken).mockReturnValue(token as any);
    const request = req(), next = vi.fn();
    await authenticate(request, {} as any, next);
    expect(next.mock.calls[0][0].statusCode).toBe(status);
    expect(request.user).toBeUndefined();
  });
  it('rejects invalid signatures', async () => {
    vi.mocked(jwt.verifyAccessToken).mockImplementation(() => { throw new Error('Invalid signature'); });
    const next = vi.fn();
    await authenticate(req(), {} as any, next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it('optional authentication falls back to public metadata on invalid credentials', async () => {
    for (const token of [{ userId: 'student-a' }, { purpose: 'mfa_challenge' }]) {
      vi.mocked(jwt.verifyAccessToken).mockReturnValue(token as any);
      const request = req(), next = vi.fn();
      await optionalAuth(request, {} as any, next);
      expect(request.user).toBeUndefined(); expect(next).toHaveBeenCalledWith();
    }
    vi.mocked(jwt.verifyAccessToken).mockImplementation(() => { throw new Error('Expired'); });
    const next = vi.fn(); await optionalAuth(req(), {} as any, next); expect(next).toHaveBeenCalledWith();
    await optionalAuth({ headers: {} } as any, {} as any, next);
  });
  it('optional auth attaches the freshly authorized actor', async () => {
    const request = req(), next = vi.fn();
    await optionalAuth(request, {} as any, next);
    expect(request.user.role).toBe('STUDENT');
  });
  it('requires authentication for role and teacher guards', () => {
    for (const guard of [requireRole(['ADMIN']), requireApprovedTeacher]) {
      const next = vi.fn(); guard({} as any, {} as any, next); expect(next.mock.calls[0][0].statusCode).toBe(401);
    }
    for (const user of [{ role: 'STUDENT' }, { role: 'TEACHER', teacherStatus: 'PENDING' }]) {
      const next = vi.fn(); requireApprovedTeacher({ user } as any, {} as any, next); expect(next.mock.calls[0][0].statusCode).toBe(403);
    }
    for (const user of [{ role: 'ADMIN' }, { role: 'TEACHER', teacherStatus: 'APPROVED' }]) {
      const next = vi.fn(); requireApprovedTeacher({ user } as any, {} as any, next); expect(next).toHaveBeenCalledWith();
    }
    const next = vi.fn(); requireRole(['TEACHER'])({ user: { role: 'ADMIN' } } as any, {} as any, next); expect(next).toHaveBeenCalledWith();
  });
});
