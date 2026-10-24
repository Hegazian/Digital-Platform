"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractRegister = exports.DurableEventSchema = exports.ProgressHeartbeatSchema = exports.AcademicReferenceSchema = exports.VoucherRedeemSchema = exports.ImportCommitSchema = exports.AssessmentAttemptSchema = exports.AssessmentQuestionSchema = exports.RevisionActionSchema = exports.AssetDeliverySchema = exports.AssetUploadRequestSchema = exports.AccessDecisionSchema = exports.StructuredApiErrorSchema = exports.CourseCatalogItemSchema = exports.CreateOrderRequestSchema = exports.CourseRetractionSchema = exports.ApiErrorSchema = void 0;
const zod_1 = require("zod");
exports.ApiErrorSchema = zod_1.z.object({
    success: zod_1.z.literal(false).optional(),
    message: zod_1.z.string().min(1),
    code: zod_1.z.string().optional(),
    requestId: zod_1.z.string().optional(),
});
exports.CourseRetractionSchema = zod_1.z.object({ reason: zod_1.z.string().trim().min(10).max(500) }).strict();
exports.CreateOrderRequestSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    paymentMethod: zod_1.z.literal('MANUAL'),
    idempotencyKey: zod_1.z.string().min(8).max(200),
    transactionRef: zod_1.z.string().max(120).optional(),
}).strict();
exports.CourseCatalogItemSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    titleEn: zod_1.z.string(),
    titleAr: zod_1.z.string(),
    description: zod_1.z.string(),
    teacherId: zod_1.z.string().min(1),
    subjectId: zod_1.z.string().min(1),
    academicYearId: zod_1.z.string().min(1).nullable().optional(),
    gradeId: zod_1.z.string().min(1).nullable().optional(),
    status: zod_1.z.string(),
    isPublished: zod_1.z.boolean(),
    isFree: zod_1.z.boolean(),
    priceEgp: zod_1.z.number().nonnegative(),
    priceUsd: zod_1.z.number().nonnegative(),
    productId: zod_1.z.string().min(1).optional(),
    slug: zod_1.z.string().nullable().optional(),
    thumbnail: zod_1.z.string().nullable().optional(),
    createdAt: zod_1.z.coerce.string().pipe(zod_1.z.iso.datetime()).optional(),
    updatedAt: zod_1.z.coerce.string().pipe(zod_1.z.iso.datetime()).optional(),
    teacher: zod_1.z.object({ id: zod_1.z.string(), name: zod_1.z.string(), avatar: zod_1.z.string().nullable().optional() }).optional(),
    subject: zod_1.z.object({ id: zod_1.z.string(), nameEn: zod_1.z.string(), nameAr: zod_1.z.string() }).optional(),
    grade: zod_1.z.object({ id: zod_1.z.string(), nameEn: zod_1.z.string(), nameAr: zod_1.z.string(), code: zod_1.z.string() }).nullable().optional(),
});
// C01/C02: errors and server-owned learning decisions. Legacy success/message
// fields stay supported while domain endpoints adopt the nested error envelope.
exports.StructuredApiErrorSchema = zod_1.z.object({ error: zod_1.z.object({
        code: zod_1.z.string().min(1), messageKey: zod_1.z.string().min(1), requestId: zod_1.z.string().min(1),
        fields: zod_1.z.array(zod_1.z.object({ path: zod_1.z.string(), code: zod_1.z.string() }).strict()).optional(),
    }).strict() }).strict();
exports.AccessDecisionSchema = zod_1.z.object({
    allowed: zod_1.z.boolean(), source: zod_1.z.enum(['OPEN_PRACTICE', 'COURSE_PREVIEW', 'DIRECT_COURSE', 'FREE_ENROLLMENT', 'SUBJECT_ENTITLEMENT', 'SUBJECT_SUBSCRIPTION', 'GRADE_BUNDLE', 'OWNER', 'ADMIN', 'DENIED']),
    expiresAt: zod_1.z.iso.datetime().nullable(), capabilities: zod_1.z.array(zod_1.z.enum(['VIEW', 'ASSESS', 'DOWNLOAD', 'DISCUSS'])),
}).strict();
// C03: technical uploads reference managed IDs; arbitrary storage URLs are not commands.
exports.AssetUploadRequestSchema = zod_1.z.object({
    purpose: zod_1.z.enum(['LESSON_VIDEO', 'LESSON_MATERIAL', 'SUBMISSION', 'RECEIPT', 'CAPTION']),
    fileName: zod_1.z.string().min(1).max(255), contentType: zod_1.z.string().min(1).max(120),
    sizeBytes: zod_1.z.number().int().positive().max(500 * 1024 * 1024), sha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
exports.AssetDeliverySchema = zod_1.z.object({ assetId: zod_1.z.string().uuid(), url: zod_1.z.string().min(1), expiresAt: zod_1.z.iso.datetime() }).strict();
// C04: every editorial command targets the exact editable revision.
exports.RevisionActionSchema = zod_1.z.object({
    revisionId: zod_1.z.string().uuid(), expectedVersion: zod_1.z.number().int().nonnegative(),
    action: zod_1.z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'PUBLISH']), reason: zod_1.z.string().trim().min(1).max(500).optional(),
}).strict();
// C05: delivery snapshots contain no answer key or grading metadata.
exports.AssessmentQuestionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1), textEn: zod_1.z.string(), textAr: zod_1.z.string(), points: zod_1.z.number().nonnegative(),
    options: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string().min(1), text: zod_1.z.string() })),
});
exports.AssessmentAttemptSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(), assessmentVersion: zod_1.z.number().int().positive(), expiresAt: zod_1.z.iso.datetime(),
    questions: zod_1.z.array(exports.AssessmentQuestionSchema).max(1000),
});
// C06: imports are draft-only and committing requires the preview identity.
exports.ImportCommitSchema = zod_1.z.object({
    previewId: zod_1.z.string().uuid(), sha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/), expectedVersion: zod_1.z.number().int().nonnegative(),
    confirm: zod_1.z.literal(true),
}).strict();
// C07: the v1 manual checkout schema above is the implemented charge boundary.
exports.VoucherRedeemSchema = zod_1.z.object({ code: zod_1.z.string().trim().min(1).max(100), expectedCourseId: zod_1.z.string().uuid().optional() }).strict();
// C08/C09/C10: owning tasks activate these contracts only alongside their APIs.
exports.AcademicReferenceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(), code: zod_1.z.string().min(1).max(100), nameEn: zod_1.z.string().min(1).max(255),
    nameAr: zod_1.z.string().min(1).max(255), archivedAt: zod_1.z.iso.datetime().nullable(),
}).strict();
exports.ProgressHeartbeatSchema = zod_1.z.object({
    lessonId: zod_1.z.string().uuid(), blockId: zod_1.z.string().uuid(), sessionId: zod_1.z.string().uuid(),
    seq: zod_1.z.number().int().nonnegative(), positionMs: zod_1.z.number().int().nonnegative(), playedDeltaMs: zod_1.z.number().int().min(0).max(60_000),
}).strict();
exports.DurableEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(), type: zod_1.z.string().min(1).max(120), schemaVersion: zod_1.z.literal(1),
    aggregateId: zod_1.z.string().min(1), aggregateVersion: zod_1.z.number().int().nonnegative(), occurredAt: zod_1.z.iso.datetime(),
    actorId: zod_1.z.string().uuid().nullable(), data: zod_1.z.record(zod_1.z.string(), zod_1.z.string().max(500)),
}).strict();
exports.ContractRegister = {
    C01: 'StructuredApiError', C02: 'AccessDecision', C03: 'AssetUploadRequest', C04: 'RevisionAction',
    C05: 'AssessmentAttempt', C06: 'ImportCommit', C07: 'CreateOrderRequest', C08: 'AcademicReference',
    C09: 'ProgressHeartbeat', C10: 'DurableEvent',
};
