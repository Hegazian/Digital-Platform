import { describe, it, expect, vi } from 'vitest';
import { validateBody } from '../validate';
import { registerSchema, createCourseSchema } from '../schemas';
import { AuthRequest } from '../../modules/auth/auth.middleware';

describe('Zod Validation Middleware', () => {
  it('should pass valid registration body to next()', () => {
    const mReq = {
      body: {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test Student',
        role: 'STUDENT',
      },
    } as AuthRequest;
    const mRes = {} as any;
    const mNext = vi.fn();

    const middleware = validateBody(registerSchema);
    middleware(mReq, mRes, mNext);

    expect(mNext).toHaveBeenCalledWith();
  });

  it('should fail registration with invalid email', () => {
    const mReq = {
      body: {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'Test Student',
      },
    } as AuthRequest;
    const mRes = {} as any;
    const mNext = vi.fn();

    const middleware = validateBody(registerSchema);
    middleware(mReq, mRes, mNext);

    expect(mNext).toHaveBeenCalled();
    const err = mNext.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/Invalid email/i);
  });

  it('should fail registration with short password', () => {
    const mReq = {
      body: {
        email: 'test@example.com',
        password: 'short',
        name: 'Test Student',
      },
    } as AuthRequest;
    const mRes = {} as any;
    const mNext = vi.fn();

    const middleware = validateBody(registerSchema);
    middleware(mReq, mRes, mNext);

    expect(mNext).toHaveBeenCalled();
    const err = mNext.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/at least 8 characters/i);
  });

  it('should fail course creation with missing titleEn', () => {
    const mReq = {
      body: {
        titleAr: 'عنوان المادة',
        description: 'Description here',
        subjectId: 'sub-1',
      },
    } as AuthRequest;
    const mRes = {} as any;
    const mNext = vi.fn();

    const middleware = validateBody(createCourseSchema);
    middleware(mReq, mRes, mNext);

    expect(mNext).toHaveBeenCalled();
    const err = mNext.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/titleEn/i);
  });
});
