import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  role: z.enum(['STUDENT', 'TEACHER']).optional(),
  gradeId: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  avatar: z.string().optional(),
  gradeId: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Refresh token comes from the httpOnly cookie; body field is legacy-only.
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export const mfaLoginSchema = z.object({
  mfaSessionToken: z.string().min(1, 'MFA session token is required'),
  mfaCode: z.string().length(6, 'MFA code must be 6 digits'),
});

// Course Schemas
export const createCourseSchema = z
  .object({
    titleEn: z.string().min(2, 'English title is required'),
    titleAr: z.string().min(2, 'Arabic title is required'),
    description: z.string().min(5, 'Description must be at least 5 characters'),
    // Dynamic subjects: either an existing subjectId OR a free-form name
    // (created on the fly, owned by the authoring teacher).
    subjectId: z.string().optional(),
    subjectName: z.string().min(2, 'Subject name must be at least 2 characters').optional(),
    gradeId: z.string().optional(),
    academicYearId: z.string().optional(),
    thumbnail: z.string().optional(),
    isFree: z.boolean().optional(),
    priceEgp: z.number().optional(),
    priceUsd: z.number().optional(),
  })
  .refine((d) => Boolean(d.subjectId || d.subjectName), {
    message: 'A subject ID or subject name is required',
    path: ['subjectName'],
  })
  .refine(
    (d) => !(d.isFree && ((d.priceEgp ?? 0) > 0 || (d.priceUsd ?? 0) > 0)),
    { message: 'A free course cannot have a positive price', path: ['isFree'] }
  );

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

// Commerce Order Schema (student checkout)
export const createOrderSchema = z.object({
  productId: z.string().uuid('Valid productId is required'),
  paymentMethod: z.enum(['MANUAL', 'PAYMOB', 'FAWRY']),
  // Client-generated UUID; replaying the same key returns the same order.
  idempotencyKey: z.string().min(8, 'Idempotency key is required'),
  transactionRef: z.string().max(120).optional(),
});

// ── Assessment (exam) engine schemas ────────────────────────────────
export const createQuestionPoolSchema = z.object({
  titleEn: z.string().min(2, 'English title is required'),
  titleAr: z.string().min(2, 'Arabic title is required'),
  description: z.string().optional(),
});

export const addQuestionItemSchema = z
  .object({
    textEn: z.string().min(2, 'English question text is required'),
    textAr: z.string().min(1).optional(),
    questionType: z.enum(['MCQ', 'TRUE_FALSE', 'ESSAY']),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
    // Accepts ["a","b"] or a pre-stringified JSON array - both stored as JSON text.
    optionsJson: z.union([z.array(z.string()), z.string()]).default([]),
    // Accepts raw values ('true', 42) or already-encoded JSON ('"4"', '"true"').
    correctAnswerJson: z.union([z.string(), z.number()]).optional(),
    explanation: z.string().optional(),
    points: z.number().int().min(1).max(100).default(10),
  })
  .superRefine((d, ctx) => {
    let optionCount = 0;
    if (Array.isArray(d.optionsJson)) {
      optionCount = d.optionsJson.length;
    } else {
      try {
        const parsed = JSON.parse(d.optionsJson);
        optionCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['optionsJson'],
          message: 'optionsJson must be a JSON array of option strings',
        });
        return;
      }
    }

    if (d.questionType === 'MCQ' && (optionCount < 2 || !d.correctAnswerJson)) {
      ctx.addIssue({
        code: 'custom',
        path: ['optionsJson'],
        message: 'MCQ questions need at least two options and a correct answer',
      });
    }

    if (d.questionType === 'TRUE_FALSE') {
      let answer: any = d.correctAnswerJson;
      if (typeof answer === 'string') {
        try {
          answer = JSON.parse(answer);
        } catch {}
      }
      if (!answer || !['true', 'false'].includes(String(answer).toLowerCase())) {
        ctx.addIssue({
          code: 'custom',
          path: ['correctAnswerJson'],
          message: 'TRUE_FALSE questions need a correct answer of true or false',
        });
      }
    }
  })
  .transform((d) => ({
    ...d,
    textAr: d.textAr && d.textAr.trim() ? d.textAr : d.textEn,
    optionsJson: Array.isArray(d.optionsJson) ? JSON.stringify(d.optionsJson) : d.optionsJson,
    correctAnswerJson:
      d.correctAnswerJson === undefined
        ? undefined
        : typeof d.correctAnswerJson === 'number'
        ? JSON.stringify(d.correctAnswerJson)
        : isProbablyEncoded(d.correctAnswerJson)
        ? d.correctAnswerJson
        : JSON.stringify(d.correctAnswerJson),
  }));

/** True for values that are already JSON scalars/collections ('"4"', 'true', '[..]', '{..}'). */
function isProbablyEncoded(v: string): boolean {
  const trimmed = v.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'null'
  ) {
    return true;
  }
  return trimmed.startsWith('[') || trimmed.startsWith('{');
}

// Expired sessions legitimately arrive with zero answers.
export const createAssessmentSchema = z.object({
  poolId: z.string().uuid('Valid poolId is required'),
  titleEn: z.string().min(2, 'English title is required'),
  titleAr: z.string().min(2, 'Arabic title is required'),
  durationMinutes: z.number().int().min(1).max(300).default(30),
  passingScore: z.number().int().min(0).max(100).default(60),
  totalQuestions: z.number().int().min(1).max(100).default(10),
});

export const submitAssessmentAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answer: z.union([z.string(), z.number(), z.null()]),
    })
  ),
});

// Quiz Schema
const quizQuestionOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  optionText: z.string().optional(), // legacy field name accepted from clients
  isCorrect: z.boolean(),
});

const baseQuizQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  type: z.enum(['MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'SHORT_ANSWER', 'ESSAY']).optional(),
  options: z.array(quizQuestionOptionSchema).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  points: z.number().int().positive().optional(),
});

export const createQuizSchema = z.object({
  titleEn: z.string().min(2, 'English quiz title is required'),
  titleAr: z.string().min(2, 'Arabic quiz title is required'),
  timeLimit: z.number().int().positive().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  dueDate: z.string().datetime({ message: 'Invalid ISO date' }).optional().nullable(),
  questions: z.array(baseQuizQuestionSchema)
    .min(1, 'Quiz must have at least 1 question')
    .superRefine((questions, ctx) => {
      questions.forEach((q, index) => {
        const label = `Question ${index + 1}`;
        const type = q.type || 'MCQ';
        const options = q.options || [];
        const normalized = options.map((o) => ({ ...o, text: o.text ?? o.optionText ?? '' }));
        const correctCount = normalized.filter((o) => o.isCorrect === true).length;

        if (type === 'MCQ' || type === 'TRUE_FALSE') {
          if (normalized.length < 2) {
            ctx.addIssue({ code: 'custom', path: ['options'], message: `${label} (${type}) must have at least 2 options` });
          } else if (correctCount !== 1) {
            ctx.addIssue({ code: 'custom', path: ['options'], message: `${label} (${type}) must have exactly one correct option` });
          }
        } else if (type === 'MULTIPLE_SELECT') {
          if (normalized.length < 2) {
            ctx.addIssue({ code: 'custom', path: ['options'], message: `${label} (MULTIPLE_SELECT) must have at least 2 options` });
          } else if (correctCount < 1) {
            ctx.addIssue({ code: 'custom', path: ['options'], message: `${label} (MULTIPLE_SELECT) must have at least one correct option` });
          }
        } else if (type === 'SHORT_ANSWER') {
          if (!q.correctAnswer || !q.correctAnswer.trim()) {
            ctx.addIssue({ code: 'custom', path: ['correctAnswer'], message: `${label}: SHORT_ANSWER requires a correctAnswer` });
          }
        }
        // ESSAY requires nothing beyond text
      });
    }),
});

export const updateQuizSchema = z.object({
  titleEn: z.string().min(2).optional(),
  titleAr: z.string().min(2).optional(),
  timeLimit: z.number().int().positive().nullable().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  dueDate: z.string().datetime({ message: 'Invalid ISO date' }).nullable().optional(),
  questions: createQuizSchema.shape.questions.optional(),
});

export const submitQuizAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionId: z.string().min(1).optional(),
      selectedOptionIds: z.array(z.string().min(1)).optional(),
      textAnswer: z.string().max(10_000).optional(),
    }).refine(
      (a) => a.selectedOptionId !== undefined || a.selectedOptionIds !== undefined || a.textAnswer !== undefined,
      { message: 'Each answer must include selectedOptionId, selectedOptionIds, or textAnswer' }
    )
  ).min(1, 'Answers array cannot be empty'),
});

// Assignment Schemas
export const createAssignmentSchema = z.object({
  titleEn: z.string().min(2, 'English assignment title is required'),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  maxScore: z.number().min(1, 'maxScore must be at least 1').optional(),
  dueDate: z.string().datetime().optional().nullable(),
  allowLateSubmission: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).optional(),
});

export const submitAssignmentSchema = z.object({
  submissionText: z.string().optional(),
  files: z.array(
    z.object({
      fileUrl: z.string().url('Invalid file URL'),
      fileName: z.string().min(1, 'File name is required'),
      sizeBytes: z.number().optional(),
    })
  ).optional(),
});

// Progress Schema
export const updateWatchTimeSchema = z.object({
  watchTimeDeltaSec: z.number().min(0, 'watchTimeDeltaSec must be a non-negative number').max(86_400, 'watchTimeDeltaSec exceeds a full day'),
});

// ============================================================
// Phase 1 — Central validation schemas
// ============================================================

// --- Admin: user management ---
export const createAdminUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
  gradeId: z.string().optional().nullable(),
});

export const updateAdminUserSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
    role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).optional(),
    teacherStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    gradeId: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'At least one updatable field must be provided',
  });

export const setUserActiveSchema = z.object({
  isActive: z.boolean({ message: 'isActive must be a boolean' }),
});

export const teacherStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { message: 'status must be APPROVED or REJECTED' }),
});

export const getUsersQuerySchema = z.object({
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).optional(),
  teacherStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Admin / Academic structure ---
const isoDate = z.union([z.string().datetime({ message: 'Invalid ISO date' }), z.string().date({ message: 'Invalid date (YYYY-MM-DD)' })]);

export const updateAcademicYearSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'At least one updatable field must be provided',
  })
  .refine((d) => !d.startDate || !d.endDate || new Date(d.startDate) < new Date(d.endDate), {
    message: 'startDate must be before endDate',
  });

export const createStageSchema = z.object({
  nameEn: z.string().min(2, 'English name is required'),
  nameAr: z.string().min(1, 'Arabic name is required'),
  code: z.string().min(1, 'Stage code is required').max(50),
  sortOrder: z.number().int().optional(),
});

export const createGradeSchema = z.object({
  stageId: z.string().min(1, 'stageId is required'),
  nameEn: z.string().min(2, 'English name is required'),
  nameAr: z.string().min(1, 'Arabic name is required'),
  code: z.string().min(1, 'Grade code is required').max(50),
  sortOrder: z.number().int().optional(),
});

export const createAcademicYearSchema = z
  .object({
    name: z.string().min(2, 'Academic year name is required'),
    startDate: isoDate,
    endDate: isoDate,
    isActive: z.boolean().optional(),
  })
  .refine((d) => new Date(d.startDate) < new Date(d.endDate), {
    message: 'startDate must be before endDate',
  });

export const createGradeSubjectSchema = z.object({
  gradeId: z.string().min(1, 'gradeId is required'),
  subjectId: z.string().min(1, 'subjectId is required'),
  academicYearId: z.string().min(1, 'academicYearId is required'),
});

// --- Subjects ---
export const subjectPricingEntrySchema = z.object({
  period: z.enum(['MONTHLY', 'SIX_MONTHS', 'YEARLY']),
  priceEgp: z.number().min(0, 'priceEgp must be non-negative'),
  priceUsd: z.number().min(0, 'priceUsd must be non-negative'),
});

export const createSubjectSchema = z.object({
  nameEn: z.string().min(2, 'English subject name is required'),
  nameAr: z.string().min(1, 'Arabic subject name is required'),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  pricing: z.array(subjectPricingEntrySchema).optional(),
});

export const updateSubjectSchema = z.object({
  nameEn: z.string().min(2).optional(),
  nameAr: z.string().min(1).optional(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
});

export const updateSubjectPricingSchema = z.object({
  pricing: z.array(subjectPricingEntrySchema).min(1, 'pricing array cannot be empty'),
});

// --- Course update (lifecycle fields are NOT accepted here; status/isPublished are admin-only via review endpoints) ---
export const updateCourseSchema = z
  .object({
    titleEn: z.string().min(2).optional(),
    titleAr: z.string().min(2).optional(),
    description: z.string().min(5, 'Description must be at least 5 characters').optional(),
    thumbnail: z.string().optional(),
    subjectId: z.string().optional(),
    subjectName: z.string().min(2).optional(),
    gradeId: z.string().nullable().optional(),
    academicYearId: z.string().nullable().optional(),
    isFree: z.boolean().optional(),
    priceEgp: z.number().min(0).optional(),
    priceUsd: z.number().min(0).optional(),
  })
  .refine(
    (d) => !(d.isFree && ((d.priceEgp ?? 0) > 0 || (d.priceUsd ?? 0) > 0)),
    { message: 'A free course cannot have a positive price', path: ['isFree'] }
  );

// --- Assignments ---
export const updateAssignmentSchema = z.object({
  titleEn: z.string().min(2).optional(),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  maxScore: z.number().min(1, 'maxScore must be at least 1').optional(),
  dueDate: isoDate.nullable().optional(),
  allowLateSubmission: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).optional(),
});

export const gradeSubmissionSchema = z.object({
  score: z.number({ message: 'score must be a number' }).min(0, 'score cannot be negative'),
  feedback: z.string().max(5000, 'Feedback is too long').optional(),
});

// --- Module reordering ---
export const reorderModulesSchema = z.object({
  modules: z
    .array(z.object({ id: z.string().min(1), sortOrder: z.number().int().min(0) }))
    .min(1, 'modules array cannot be empty'),
});

// --- Lesson reordering ---
export const reorderLessonsSchema = z.object({
  lessons: z
    .array(z.object({ id: z.string().min(1), orderIndex: z.number().int().min(0) }))
    .min(1, 'lessons array cannot be empty'),
});

// --- Module / lesson updates (partial) ---
export const updateModuleSchema = z.object({
  titleEn: z.string().min(2).optional(),
  titleAr: z.string().min(1).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateLessonSchema = z.object({
  titleEn: z.string().min(2).optional(),
  titleAr: z.string().min(1).optional(),
  content: z.string().optional(),
  estimatedDuration: z.number().int().min(0).optional(),
});
