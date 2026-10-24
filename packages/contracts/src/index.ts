import { z } from 'zod';

export const ApiErrorSchema = z.object({
  success: z.literal(false).optional(),
  message: z.string().min(1),
  code: z.string().optional(),
  requestId: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const CourseRetractionSchema = z.object({ reason: z.string().trim().min(10).max(500) }).strict();
export type CourseRetractionInput = z.infer<typeof CourseRetractionSchema>;

export const CreateOrderRequestSchema = z.object({
  productId: z.string().uuid(),
  paymentMethod: z.literal('MANUAL'),
  idempotencyKey: z.string().min(8).max(200),
  transactionRef: z.string().max(120).optional(),
}).strict();
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const CourseCatalogItemSchema = z.object({
  id: z.string().min(1),
  titleEn: z.string(),
  titleAr: z.string(),
  description: z.string(),
  teacherId: z.string().min(1),
  subjectId: z.string().min(1),
  academicYearId: z.string().min(1).nullable().optional(),
  gradeId: z.string().min(1).nullable().optional(),
  status: z.string(),
  isPublished: z.boolean(),
  isFree: z.boolean(),
  priceEgp: z.number().nonnegative(),
  priceUsd: z.number().nonnegative(),
  productId: z.string().min(1).optional(),
  slug: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  createdAt: z.coerce.string().pipe(z.iso.datetime()).optional(),
  updatedAt: z.coerce.string().pipe(z.iso.datetime()).optional(),
  teacher: z.object({ id: z.string(), name: z.string(), avatar: z.string().nullable().optional() }).optional(),
  subject: z.object({ id: z.string(), nameEn: z.string(), nameAr: z.string() }).optional(),
  grade: z.object({ id: z.string(), nameEn: z.string(), nameAr: z.string(), code: z.string() }).nullable().optional(),
});
export type CourseCatalogItem = z.infer<typeof CourseCatalogItemSchema>;

// C01/C02: errors and server-owned learning decisions. Legacy success/message
// fields stay supported while domain endpoints adopt the nested error envelope.
export const StructuredApiErrorSchema = z.object({ error: z.object({
  code: z.string().min(1), messageKey: z.string().min(1), requestId: z.string().min(1),
  fields: z.array(z.object({ path: z.string(), code: z.string() }).strict()).optional(),
}).strict() }).strict();
export const AccessDecisionSchema = z.object({
  allowed: z.boolean(), source: z.enum(['OPEN_PRACTICE', 'COURSE_PREVIEW', 'DIRECT_COURSE', 'FREE_ENROLLMENT', 'SUBJECT_ENTITLEMENT', 'SUBJECT_SUBSCRIPTION', 'GRADE_BUNDLE', 'OWNER', 'ADMIN', 'DENIED']),
  expiresAt: z.iso.datetime().nullable(), capabilities: z.array(z.enum(['VIEW', 'ASSESS', 'DOWNLOAD', 'DISCUSS'])),
}).strict();
export type AccessDecisionDto = z.infer<typeof AccessDecisionSchema>;

// C03: technical uploads reference managed IDs; arbitrary storage URLs are not commands.
export const AssetUploadRequestSchema = z.object({
  purpose: z.enum(['LESSON_VIDEO', 'LESSON_MATERIAL', 'SUBMISSION', 'RECEIPT', 'CAPTION']),
  fileName: z.string().min(1).max(255), contentType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(500 * 1024 * 1024), sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const AssetDeliverySchema = z.object({ assetId: z.string().uuid(), url: z.string().min(1), expiresAt: z.iso.datetime() }).strict();

// C04: every editorial command targets the exact editable revision.
export const RevisionActionSchema = z.object({
  revisionId: z.string().uuid(), expectedVersion: z.number().int().nonnegative(),
  action: z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'PUBLISH']), reason: z.string().trim().min(1).max(500).optional(),
}).strict();

// C05: delivery snapshots contain no answer key or grading metadata.
export const AssessmentQuestionSchema = z.object({
  id: z.string().min(1), textEn: z.string(), textAr: z.string(), points: z.number().nonnegative(),
  options: z.array(z.object({ id: z.string().min(1), text: z.string() })),
});
export const AssessmentAttemptSchema = z.object({
  id: z.string().uuid(), assessmentVersion: z.number().int().positive(), expiresAt: z.iso.datetime(),
  questions: z.array(AssessmentQuestionSchema).max(1000),
});

// C06: imports are draft-only and committing requires the preview identity.
export const ImportCommitSchema = z.object({
  previewId: z.string().uuid(), sha256: z.string().regex(/^[a-f0-9]{64}$/), expectedVersion: z.number().int().nonnegative(),
  confirm: z.literal(true),
}).strict();

// C07: the v1 manual checkout schema above is the implemented charge boundary.
export const VoucherRedeemSchema = z.object({ code: z.string().trim().min(1).max(100), expectedCourseId: z.string().uuid().optional() }).strict();
export type VoucherRedeemInput = z.infer<typeof VoucherRedeemSchema>;

// C08/C09/C10: owning tasks activate these contracts only alongside their APIs.
export const AcademicReferenceSchema = z.object({
  id: z.string().uuid(), code: z.string().min(1).max(100), nameEn: z.string().min(1).max(255),
  nameAr: z.string().min(1).max(255), archivedAt: z.iso.datetime().nullable(),
}).strict();
export const ProgressHeartbeatSchema = z.object({
  lessonId: z.string().uuid(), blockId: z.string().uuid(), sessionId: z.string().uuid(),
  seq: z.number().int().nonnegative(), positionMs: z.number().int().nonnegative(), playedDeltaMs: z.number().int().min(0).max(60_000),
}).strict();
export const DurableEventSchema = z.object({
  id: z.string().uuid(), type: z.string().min(1).max(120), schemaVersion: z.literal(1),
  aggregateId: z.string().min(1), aggregateVersion: z.number().int().nonnegative(), occurredAt: z.iso.datetime(),
  actorId: z.string().uuid().nullable(), data: z.record(z.string(), z.string().max(500)),
}).strict();

export const ContractRegister = {
  C01: 'StructuredApiError', C02: 'AccessDecision', C03: 'AssetUploadRequest', C04: 'RevisionAction',
  C05: 'AssessmentAttempt', C06: 'ImportCommit', C07: 'CreateOrderRequest', C08: 'AcademicReference',
  C09: 'ProgressHeartbeat', C10: 'DurableEvent',
} as const;
