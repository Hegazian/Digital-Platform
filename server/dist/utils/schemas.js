"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWatchTimeSchema = exports.submitQuizAttemptSchema = exports.createQuizSchema = exports.createManualSubscriptionSchema = exports.createSectionSchema = exports.createCourseSchema = exports.mfaLoginSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// Auth Schemas
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters long'),
    role: zod_1.z.enum(['STUDENT', 'TEACHER']).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.mfaLoginSchema = zod_1.z.object({
    mfaSessionToken: zod_1.z.string().min(1, 'MFA session token is required'),
    mfaCode: zod_1.z.string().length(6, 'MFA code must be 6 digits'),
});
// Course Schemas
exports.createCourseSchema = zod_1.z.object({
    titleEn: zod_1.z.string().min(2, 'English title is required'),
    titleAr: zod_1.z.string().min(2, 'Arabic title is required'),
    description: zod_1.z.string().min(5, 'Description must be at least 5 characters'),
    subjectId: zod_1.z.string().min(1, 'Subject ID is required'),
    thumbnail: zod_1.z.string().optional(),
});
exports.createSectionSchema = zod_1.z.object({
    titleEn: zod_1.z.string().min(2, 'English section title is required'),
    titleAr: zod_1.z.string().min(2, 'Arabic section title is required'),
    orderIndex: zod_1.z.number().int().optional(),
    isFreePreview: zod_1.z.boolean().optional(),
});
// Subscription Schema
exports.createManualSubscriptionSchema = zod_1.z.object({
    subjectId: zod_1.z.string().min(1, 'Subject ID is required'),
    period: zod_1.z.enum(['MONTHLY', 'SIX_MONTHS', 'YEARLY']),
    paymentMethod: zod_1.z.string().min(1, 'Payment method is required'),
    transactionId: zod_1.z.string().min(1, 'Transaction reference/ID is required'),
});
// Quiz Schema
exports.createQuizSchema = zod_1.z.object({
    titleEn: zod_1.z.string().min(2, 'English quiz title is required'),
    titleAr: zod_1.z.string().min(2, 'Arabic quiz title is required'),
    timeLimit: zod_1.z.number().int().positive().optional(),
    passingScore: zod_1.z.number().int().min(0).max(100).optional(),
    questions: zod_1.z.array(zod_1.z.object({
        questionText: zod_1.z.string().min(1, 'Question text is required'),
        options: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            text: zod_1.z.string(),
            isCorrect: zod_1.z.boolean(),
        })).min(2, 'Each question must have at least 2 options'),
        explanation: zod_1.z.string().optional(),
        points: zod_1.z.number().int().positive().optional(),
    })).min(1, 'Quiz must have at least 1 question'),
});
exports.submitQuizAttemptSchema = zod_1.z.object({
    answers: zod_1.z.array(zod_1.z.object({
        questionId: zod_1.z.string().min(1),
        selectedOptionId: zod_1.z.string().min(1),
    })).min(1, 'Answers array cannot be empty'),
});
// Progress Schema
exports.updateWatchTimeSchema = zod_1.z.object({
    watchTimeDeltaSec: zod_1.z.number().min(0, 'watchTimeDeltaSec must be a non-negative number'),
});
