"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validate_1 = require("../validate");
const schemas_1 = require("../schemas");
(0, vitest_1.describe)('Zod Validation Middleware', () => {
    (0, vitest_1.it)('should pass valid registration body to next()', () => {
        const mReq = {
            body: {
                email: 'test@example.com',
                password: 'Password123!',
                name: 'Test Student',
                role: 'STUDENT',
            },
        };
        const mRes = {};
        const mNext = vitest_1.vi.fn();
        const middleware = (0, validate_1.validateBody)(schemas_1.registerSchema);
        middleware(mReq, mRes, mNext);
        (0, vitest_1.expect)(mNext).toHaveBeenCalledWith();
    });
    (0, vitest_1.it)('should fail registration with invalid email', () => {
        const mReq = {
            body: {
                email: 'invalid-email',
                password: 'Password123!',
                name: 'Test Student',
            },
        };
        const mRes = {};
        const mNext = vitest_1.vi.fn();
        const middleware = (0, validate_1.validateBody)(schemas_1.registerSchema);
        middleware(mReq, mRes, mNext);
        (0, vitest_1.expect)(mNext).toHaveBeenCalled();
        const err = mNext.mock.calls[0][0];
        (0, vitest_1.expect)(err.statusCode).toBe(400);
        (0, vitest_1.expect)(err.message).toMatch(/Invalid email/i);
    });
    (0, vitest_1.it)('should fail registration with short password', () => {
        const mReq = {
            body: {
                email: 'test@example.com',
                password: 'short',
                name: 'Test Student',
            },
        };
        const mRes = {};
        const mNext = vitest_1.vi.fn();
        const middleware = (0, validate_1.validateBody)(schemas_1.registerSchema);
        middleware(mReq, mRes, mNext);
        (0, vitest_1.expect)(mNext).toHaveBeenCalled();
        const err = mNext.mock.calls[0][0];
        (0, vitest_1.expect)(err.statusCode).toBe(400);
        (0, vitest_1.expect)(err.message).toMatch(/at least 8 characters/i);
    });
    (0, vitest_1.it)('should fail course creation with missing titleEn', () => {
        const mReq = {
            body: {
                titleAr: 'عنوان المادة',
                description: 'Description here',
                subjectId: 'sub-1',
            },
        };
        const mRes = {};
        const mNext = vitest_1.vi.fn();
        const middleware = (0, validate_1.validateBody)(schemas_1.createCourseSchema);
        middleware(mReq, mRes, mNext);
        (0, vitest_1.expect)(mNext).toHaveBeenCalled();
        const err = mNext.mock.calls[0][0];
        (0, vitest_1.expect)(err.statusCode).toBe(400);
        (0, vitest_1.expect)(err.message).toMatch(/titleEn/i);
    });
});
