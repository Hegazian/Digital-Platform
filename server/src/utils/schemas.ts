import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  role: z.enum(['STUDENT', 'TEACHER', 'PARENT']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Course Schemas
export const createCourseSchema = z.object({
  titleEn: z.string().min(2, 'English title is required'),
  titleAr: z.string().min(2, 'Arabic title is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  thumbnail: z.string().optional(),
});

export const createSectionSchema = z.object({
  titleEn: z.string().min(2, 'English section title is required'),
  titleAr: z.string().min(2, 'Arabic section title is required'),
  orderIndex: z.number().int().optional(),
  isFreePreview: z.boolean().optional(),
});

// Subscription Schema
export const createManualSubscriptionSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  period: z.enum(['MONTHLY', 'SIX_MONTHS', 'YEARLY']),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  transactionId: z.string().min(1, 'Transaction reference/ID is required'),
});

// Quiz Schema
export const createQuizSchema = z.object({
  titleEn: z.string().min(2, 'English quiz title is required'),
  titleAr: z.string().min(2, 'Arabic quiz title is required'),
  timeLimit: z.number().int().positive().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  questions: z.array(
    z.object({
      questionText: z.string().min(1, 'Question text is required'),
      options: z.array(
        z.object({
          id: z.string(),
          text: z.string(),
          isCorrect: z.boolean(),
        })
      ).min(2, 'Each question must have at least 2 options'),
      explanation: z.string().optional(),
      points: z.number().int().positive().optional(),
    })
  ).min(1, 'Quiz must have at least 1 question'),
});

export const submitQuizAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionId: z.string().min(1),
    })
  ).min(1, 'Answers array cannot be empty'),
});

// Progress Schema
export const updateWatchTimeSchema = z.object({
  watchTimeDeltaSec: z.number().min(0, 'watchTimeDeltaSec must be a non-negative number'),
});
