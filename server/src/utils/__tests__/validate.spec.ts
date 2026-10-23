import { describe, it, expect, vi } from 'vitest';
import { validateBody } from '../validate';
import { registerSchema, createCourseSchema, subjectPricingEntrySchema } from '../schemas';
import { AuthRequest } from '../../modules/auth/auth.middleware';

describe('Zod Validation Middleware', () => {
  it('should pass valid registration body to next()', () => {
    const mReq = {
      body: {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test Student',
        role: 'STUDENT',
        studentNumber: 'STU-2026-001',
        gradeId: 'grade-id-1',
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

  it('rejects USD course pricing inputs because EGP is the only writable charge amount', () => {
    const result = createCourseSchema.safeParse({
      titleEn: 'Algebra',
      titleAr: 'الجبر',
      description: 'A course description',
      subjectId: 'subject-1',
      priceUsd: 25,
    });

    expect(result.success).toBe(false);
  });

  it('rejects USD subject pricing inputs and accepts EGP-only pricing', () => {
    expect(subjectPricingEntrySchema.safeParse({ period: 'MONTHLY', priceEgp: 200 }).success).toBe(true);
    expect(subjectPricingEntrySchema.safeParse({ period: 'MONTHLY', priceEgp: 200, priceUsd: 10 }).success).toBe(false);
  });
});
