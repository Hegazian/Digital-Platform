# 03 — Data Model (Prisma / PostgreSQL)

**Source of truth:** `server/prisma/schema.prisma` (32 models, 17 enums)  
**Migrations & Sync:** Versioned baseline SQL migration in `server/prisma/migrations/0001_init/migration.sql` (`npm run db:migrate:deploy`) + `prisma db push` (`npm run db:push`)  
**Seed:** `server/prisma/seed.ts` (`npm run db:seed`)  
**Tables:** Prisma models map via `@@map("snake_case")`.

---

## Enums

| Enum | Values |
|------|--------|
| `Role` | `STUDENT`, `TEACHER`, `ADMIN` — **no PARENT** |
| `TeacherStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `SubscriptionPeriod` | `MONTHLY`, `SIX_MONTHS`, `YEARLY` |
| `VideoStatus` | `UPLOADING`, `PROCESSING`, `READY`, `ERROR` |
| `CourseStatus` | `DRAFT`, `UNDER_REVIEW`, `APPROVED`, `PUBLISHED`, `REJECTED`, `ARCHIVED` |
| `CourseVisibility` | `PUBLIC`, `PRIVATE`, `UNLISTED` |
| `LessonBlockType` | `VIDEO`, `TEXT`, `DOCUMENT`, `QUIZ`, `ASSIGNMENT`, `LIVE_SESSION`, `LINK` |
| `AssignmentSubmissionStatus` | `DRAFT`, `SUBMITTED`, `LATE`, `GRADED`, `RETURNED` |
| `SubscriptionStatus` | `PENDING`, `ACTIVE`, `REJECTED`, `CANCELLED`, `EXPIRED` |
| `ProductType` | `COURSE`, `SUBJECT`, `GRADE_BUNDLE`, `VOUCHER` |
| `OrderStatus` | `PENDING`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED` |
| `PaymentMethod` | `MANUAL`, `PAYMOB`, `FAWRY`, `VOUCHER` |
| `EntitlementType` | `COURSE`, `SUBJECT`, `GRADE_BUNDLE` |
| `EntitlementSource` | `PURCHASE`, `SUBSCRIPTION`, `VOUCHER`, `ADMIN_GRANT` |
| `EntitlementStatus` | `ACTIVE`, `EXPIRED`, `REVOKED` |
| `QuizQuestionType` | `MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, `SHORT_ANSWER` |
| `AttemptStatus` | `IN_PROGRESS`, `COMPLETED` |

---

## Entity relationship overview

```
EducationalStage 1─* Grade 1─* User (students)
Grade *─1 GradeSubject *─1 Subject
AcademicYear 1─* GradeSubject
Subject 1─* Course 1─* Section 1─* Lesson
Lesson 1─* LessonBlock
Lesson 1─1 Video | 1─1 Quiz | 1─* Material | 1─* Assignment
Quiz 1─* Question 1─* QuizAttempt (User)
Assignment 1─* AssignmentSubmission (User) 1─* AssignmentSubmissionFile
User 1─* LessonProgress *─1 Lesson
User 1─* Subscription *─1 Subject
User 1─* Order *─1 Product 1─* Entitlement
User 1─* Entitlement
Voucher (standalone redeemable)
User 1─* RefreshToken | AuditLog | Notification
LiveSession *─1 User (teacher) + *─1 Subject
AppConfig (singleton-style platform settings)
DiscussionThread 1─* DiscussionReply
```

---

## Models (complete)

### Identity & sessions

#### `User` — `@@map("users")`
| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(uuid()) | |
| email | String @unique | |
| password | String | bcrypt hash |
| name | String | |
| role | Role @default(STUDENT) | |
| isActive | Boolean @default(true) | |
| teacherStatus | TeacherStatus? | Secondary gate for TEACHER |
| avatar | String? | |
| gradeId | String? | FK Grade |
| studentNumber | String? @unique | Required for STUDENT registration |
| mfaSecret | String? | TOTP secret |
| mfaEnabled | Boolean @default(false) | |
| mfaLastTimeStep | Int? | TOTP replay protection |
| createdAt / updatedAt | DateTime | |

Relations: grade, courses (as teacher, "TeacherCourses"), subscriptions, quizAttempts, lessonProgress, orders, entitlements, notifications, liveSessions, submissions ("StudentSubmissions"), auditLogs, refreshTokens.

#### `RefreshToken` — `@@map("refresh_tokens")`
| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| userId | String | Cascade delete |
| tokenHash | String @unique | SHA-256 of refresh JWT |
| expiresAt | DateTime | |
| revokedAt | DateTime? | Set on rotation/logout; reuse → family kill |
| createdAt | DateTime | |

Index: `[userId]`.

---

### Academic catalog

#### `Subject` — `@@map("subjects")`
nameEn, nameAr, description?, thumbnail?, timestamps.  
Relations: courses, pricing (SubjectPricing[]), subscriptions, gradeSubjects, liveSessions.

#### `SubjectPricing` — `@@map("subject_pricing")`
subjectId, period (SubscriptionPeriod), priceEgp Decimal(10,2), priceUsd Decimal(10,2), isActive.  
Unique `[subjectId, period]`. EGP is the admin-entered source of truth; USD derived via AppConfig rate in application logic.

#### `Subscription` — `@@map("subscriptions")`
userId, subjectId, period, startDate, endDate, status @default(PENDING), paymentMethod? (e.g. VODAFONE_CASH, INSTAPAY), transactionId? (mobile/txn ref).  
Indexes: `[userId, status]`, `[subjectId, status]`.

#### `AcademicYear` — `@@map("academic_years")`
name (e.g. "2026/2027"), startDate, endDate, isActive.

#### `EducationalStage` — `@@map("educational_stages")`
nameEn, nameAr, code @unique, sortOrder. Relation: grades[].

#### `Grade` — `@@map("grades")`
stageId, nameEn, nameAr, code (e.g. SEC_1), sortOrder.  
Relations: stage, gradeSubjects, students (User[]), courses.

#### `GradeSubject` — `@@map("grade_subjects")`
gradeId, subjectId, academicYearId, isActive.  
Unique `[gradeId, subjectId, academicYearId]`.

---

### Courses & curriculum

#### `Course` — `@@map("courses")`
| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| titleEn / titleAr | String | |
| description | String | |
| teacherId | String | |
| subjectId | String | Cascade |
| academicYearId | String? | |
| gradeId | String? | |
| slug | String? | |
| thumbnail | String? | |
| status | CourseStatus @default(DRAFT) | Governance state |
| visibility | CourseVisibility @default(PUBLIC) | |
| isPublished | Boolean @default(false) | Flag in addition to status |
| isFree | Boolean @default(false) | Open enrollment; must not have priced product |
| rejectionReason | String? @db.Text | |
| deletedAt | DateTime? | **Soft delete** |

Indexes: teacherId, subjectId, gradeId, academicYearId, status.

#### `Section` — `@@map("sections")`
courseId, titleEn, titleAr, description? (db.Text), orderIndex @default(0), **isFreePreview** @default(false), timestamps.  
Relations: course (Cascade), lessons[].

#### `Lesson` — `@@map("lessons")`
| Field | Type | Notes |
|-------|------|-------|
| sectionId | String | Required FK — `onDelete: Cascade` |
| titleEn / titleAr | String | |
| content | String? @db.Text | Rich text |
| orderIndex | Int @default(0) | |
| estimatedDuration | Int? | Minutes |
| videoId | String? @unique | Inverse of Video.lesson |
| quizId | String? @unique | Inverse of Quiz.lesson |

Relations: section, video?, quiz?, materials[], blocks[], progress[].

> **Unified Curriculum Model:** Curriculum hierarchy is strictly **Course → Section → Lesson → LessonBlock**. Free preview chapter access is controlled via `Section.isFreePreview`.

#### `LessonBlock` — `@@map("lesson_blocks")`
lessonId, blockType LessonBlockType @default(TEXT), configurationJson (e.g. `{ mediaId, quizId, assignmentId }`), sortOrder, isRequired @default(true).  
Relations: lesson.

#### `Video` — `@@map("videos")`
teacherId, status @default(UPLOADING), durationSec?, videoUrl (Supabase path or local), originalFileName?, sizeBytes?, createdAt.  
Inverse relation: `Lesson.video`.

#### `Material` — `@@map("materials")`
lessonId, title, fileUrl, fileType, sizeBytes, createdAt.

---

### Quizzes & assignments (lesson-attached)

#### `Quiz` — `@@map("quizzes")`
titleEn, titleAr, timeLimit? (minutes), passingScore @default(50), maxAttempts @default(1), dueDate?.  
Relations: lesson?, questions[], attempts[].

#### `Question` — `@@map("questions")`
quizId, questionText @db.Text, type QuizQuestionType @default(MCQ), options Json (`[{ id, text, isCorrect }]` for MCQ/TF/multi), correctAnswer? (SHORT_ANSWER), explanation? @db.Text, orderIndex, points @default(1).

#### `QuizAttempt` — `@@map("quiz_attempts")`
quizId, userId, score @default(0), answers Json (`[{ questionId, selectedOptionId?, selectedOptionIds?, textAnswer? }]`), isPassed, status AttemptStatus @default(COMPLETED), timeSpentSec?, startedAt, completedAt?.  
Index: `[quizId, userId, status]`.

#### `Assignment` — `@@map("assignments")`
lessonId?, createdById, titleEn, titleAr, description?, instructions?, maxScore @default(100), dueDate?, allowLateSubmission @default(true), maxAttempts @default(1).

#### `AssignmentSubmission` — `@@map("assignment_submissions")`
assignmentId, studentId, submissionText? @db.Text, status @default(SUBMITTED), score Float?, feedback? @db.Text, gradedById?, gradedAt?, submittedAt.  
Relations: assignment (Cascade), student ("StudentSubmissions", Cascade), files[].

#### `AssignmentSubmissionFile` — `@@map("assignment_submission_files")`
submissionId, fileUrl, fileName, sizeBytes @default(0).

---

### Progress

#### `LessonProgress` — `@@map("lesson_progress")`
userId, lessonId, watchTimeSec @default(0), isCompleted @default(false), lastWatched.  
Unique `[userId, lessonId]`. Index `[userId, isCompleted]`.

---

### Commerce

#### `Product` — `@@map("products")`
nameEn, nameAr, description?, productType (COURSE|SUBJECT|GRADE_BUNDLE|VOUCHER), resourceId?, priceEgp Decimal(10,2), priceUsd Decimal(10,2), isActive.

#### `Order` — `@@map("orders")`
studentId, productId, status @default(PENDING), totalAmountEgp, totalAmountUsd, paymentMethod @default(MANUAL), transactionRef?, **idempotencyKey @unique**, timestamps.  
Index: `[studentId, status]`.

#### `Entitlement` — `@@map("entitlements")`
studentId, orderId? (SetNull on delete), resourceType, resourceId, sourceType @default(PURCHASE), startsAt, expiresAt?, status @default(ACTIVE).  
Unique `[orderId]`. Indexes: `[studentId, status]`, `[resourceType, resourceId, status]`.

#### `Voucher` — `@@map("vouchers")`
code @unique, resourceType, resourceId, durationDays @default(30), maxUses @default(1), usedCount @default(0), expiresAt?, isActive.

---

### Platform settings

#### `AppConfig` — `@@map("app_configs")`
Singleton-style platform settings:

| Field | Default |
|-------|---------|
| siteNameEn / siteNameAr | EduPlatform / منصة التعليم |
| siteDescriptionEn / siteDescriptionAr | optional |
| sloganEn / sloganAr | "" |
| hostDomain | localhost:3000 |
| supportEmail | support@eduplatform.com |
| currency | EGP |
| **exchangeRateUsdToEgp** | 48 — USD derived from EGP prices |
| requireCourseApproval | true |
| allowTeacherRegistration | true |
| primaryColor | #000000 |
| homeContent | Json? — marketing copy (navbar/hero/how-it-works/footer…) |

#### `Notification` — `@@map("notifications")`
userId, titleEn, titleAr, messageEn, messageAr, isRead @default(false).

#### `LiveSession` — `@@map("live_sessions")`
teacherId, subjectId, titleEn, titleAr, startTime, durationMinutes, zoomMeetingId, zoomJoinUrl (stores teacher-provided Zoom / Google Meet / Teams join URL), zoomStartUrl. Index `[subjectId, startTime]`.

#### `DiscussionThread` / `DiscussionReply`
Thread: courseId, lessonId?, authorId, title, content @db.Text.  
Reply: threadId, authorId, content.

#### `AuditLog` — `@@map("audit_logs")`
userId, action, entityId?, entityType?, details Json?, ipAddress?. Indexes: `[action]`, `[entityId, entityType]`.

---

## Design notes

1. **Unified curriculum tree** — `Course` → `Section` → `Lesson` → `LessonBlock`; free preview chapter access lives on `Section.isFreePreview`.
2. **Course status vs isPublished** — Status enum (`DRAFT`, `UNDER_REVIEW`, `APPROVED`, `PUBLISHED`, `REJECTED`, `ARCHIVED`) is authoritative for governance; `isPublished` boolean is an additional flag used by catalog filters.
3. **Money** — `Order` stores both EGP and USD totals; admin prices are entered in EGP and converted using `AppConfig.exchangeRateUsdToEgp`.
4. **Free courses** — Zod/business rule: `isFree=true` must not have a priced product attached.
5. **Soft delete** — `Course.deletedAt`; commerce entitlement `orderId` is SetNull-safe.
6. **Versioned Migrations** — Baseline migration is tracked in `server/prisma/migrations/0001_init/migration.sql` (`npm run db:migrate:deploy`).
7. **Uploads** — Binary files are not in DB; rows store paths/URLs. Local files reside under `server/uploads/` (gitignored).
