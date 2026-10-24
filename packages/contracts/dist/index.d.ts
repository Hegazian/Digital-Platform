import { z } from 'zod';
export declare const ApiErrorSchema: z.ZodObject<{
    success: z.ZodOptional<z.ZodLiteral<false>>;
    message: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export declare const CourseRetractionSchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strict>;
export type CourseRetractionInput = z.infer<typeof CourseRetractionSchema>;
export declare const CreateOrderRequestSchema: z.ZodObject<{
    productId: z.ZodString;
    paymentMethod: z.ZodLiteral<"MANUAL">;
    idempotencyKey: z.ZodString;
    transactionRef: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export declare const CourseCatalogItemSchema: z.ZodObject<{
    id: z.ZodString;
    titleEn: z.ZodString;
    titleAr: z.ZodString;
    description: z.ZodString;
    teacherId: z.ZodString;
    subjectId: z.ZodString;
    academicYearId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    gradeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodString;
    isPublished: z.ZodBoolean;
    isFree: z.ZodBoolean;
    priceEgp: z.ZodNumber;
    priceUsd: z.ZodNumber;
    productId: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    thumbnail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodPipe<z.ZodCoercedString<unknown>, z.ZodISODateTime>>;
    updatedAt: z.ZodOptional<z.ZodPipe<z.ZodCoercedString<unknown>, z.ZodISODateTime>>;
    teacher: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    subject: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        nameEn: z.ZodString;
        nameAr: z.ZodString;
    }, z.core.$strip>>;
    grade: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        nameEn: z.ZodString;
        nameAr: z.ZodString;
        code: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type CourseCatalogItem = z.infer<typeof CourseCatalogItemSchema>;
export declare const StructuredApiErrorSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        messageKey: z.ZodString;
        requestId: z.ZodString;
        fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            code: z.ZodString;
        }, z.core.$strict>>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const AccessDecisionSchema: z.ZodObject<{
    allowed: z.ZodBoolean;
    source: z.ZodEnum<{
        OPEN_PRACTICE: "OPEN_PRACTICE";
        COURSE_PREVIEW: "COURSE_PREVIEW";
        DIRECT_COURSE: "DIRECT_COURSE";
        FREE_ENROLLMENT: "FREE_ENROLLMENT";
        SUBJECT_ENTITLEMENT: "SUBJECT_ENTITLEMENT";
        SUBJECT_SUBSCRIPTION: "SUBJECT_SUBSCRIPTION";
        GRADE_BUNDLE: "GRADE_BUNDLE";
        OWNER: "OWNER";
        ADMIN: "ADMIN";
        DENIED: "DENIED";
    }>;
    expiresAt: z.ZodNullable<z.ZodISODateTime>;
    capabilities: z.ZodArray<z.ZodEnum<{
        VIEW: "VIEW";
        ASSESS: "ASSESS";
        DOWNLOAD: "DOWNLOAD";
        DISCUSS: "DISCUSS";
    }>>;
}, z.core.$strict>;
export type AccessDecisionDto = z.infer<typeof AccessDecisionSchema>;
export declare const AssetUploadRequestSchema: z.ZodObject<{
    purpose: z.ZodEnum<{
        LESSON_VIDEO: "LESSON_VIDEO";
        LESSON_MATERIAL: "LESSON_MATERIAL";
        SUBMISSION: "SUBMISSION";
        RECEIPT: "RECEIPT";
        CAPTION: "CAPTION";
    }>;
    fileName: z.ZodString;
    contentType: z.ZodString;
    sizeBytes: z.ZodNumber;
    sha256: z.ZodString;
}, z.core.$strict>;
export declare const AssetDeliverySchema: z.ZodObject<{
    assetId: z.ZodString;
    url: z.ZodString;
    expiresAt: z.ZodISODateTime;
}, z.core.$strict>;
export declare const RevisionActionSchema: z.ZodObject<{
    revisionId: z.ZodString;
    expectedVersion: z.ZodNumber;
    action: z.ZodEnum<{
        SUBMIT: "SUBMIT";
        APPROVE: "APPROVE";
        REJECT: "REJECT";
        PUBLISH: "PUBLISH";
    }>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const AssessmentQuestionSchema: z.ZodObject<{
    id: z.ZodString;
    textEn: z.ZodString;
    textAr: z.ZodString;
    points: z.ZodNumber;
    options: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const AssessmentAttemptSchema: z.ZodObject<{
    id: z.ZodString;
    assessmentVersion: z.ZodNumber;
    expiresAt: z.ZodISODateTime;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        textEn: z.ZodString;
        textAr: z.ZodString;
        points: z.ZodNumber;
        options: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ImportCommitSchema: z.ZodObject<{
    previewId: z.ZodString;
    sha256: z.ZodString;
    expectedVersion: z.ZodNumber;
    confirm: z.ZodLiteral<true>;
}, z.core.$strict>;
export declare const VoucherRedeemSchema: z.ZodObject<{
    code: z.ZodString;
    expectedCourseId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type VoucherRedeemInput = z.infer<typeof VoucherRedeemSchema>;
export declare const AcademicReferenceSchema: z.ZodObject<{
    id: z.ZodString;
    code: z.ZodString;
    nameEn: z.ZodString;
    nameAr: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodISODateTime>;
}, z.core.$strict>;
export declare const ProgressHeartbeatSchema: z.ZodObject<{
    lessonId: z.ZodString;
    blockId: z.ZodString;
    sessionId: z.ZodString;
    seq: z.ZodNumber;
    positionMs: z.ZodNumber;
    playedDeltaMs: z.ZodNumber;
}, z.core.$strict>;
export declare const DurableEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    schemaVersion: z.ZodLiteral<1>;
    aggregateId: z.ZodString;
    aggregateVersion: z.ZodNumber;
    occurredAt: z.ZodISODateTime;
    actorId: z.ZodNullable<z.ZodString>;
    data: z.ZodRecord<z.ZodString, z.ZodString>;
}, z.core.$strict>;
export declare const ContractRegister: {
    readonly C01: "StructuredApiError";
    readonly C02: "AccessDecision";
    readonly C03: "AssetUploadRequest";
    readonly C04: "RevisionAction";
    readonly C05: "AssessmentAttempt";
    readonly C06: "ImportCommit";
    readonly C07: "CreateOrderRequest";
    readonly C08: "AcademicReference";
    readonly C09: "ProgressHeartbeat";
    readonly C10: "DurableEvent";
};
