# 08 — Engineering Gap Log (Code-Verified)

This document records all **verified security vulnerabilities (P0)**, **functional bugs and incomplete features (P1)**, and **infrastructure/testing gaps (P2)** identified directly from the `server/` and `client/` source code.

---

## A. P0 — Security & Production Blockers

| # | Status | Vulnerability / Blocker | Exact Code Location | Impact & Resolution |
| :--- | :---: | :--- | :--- | :--- |
| **P0-1** | ✅ Resolved (TASK-01) | **Paid Media URLs Exposed in Public Catalog & Static Mount** | [`course.service.ts`](../server/src/modules/courses/course.service.ts), [`material.service.ts`](../server/src/modules/materials/material.service.ts) & [`app.ts`](../server/src/app.ts) | Stripped `videoUrl`/`fileUrl` for un-entitled users, blocked `/uploads/lesson-videos` and `/uploads/lesson-materials` from direct unauthenticated static serving (`403 Forbidden`), and added gated `GET /api/v1/materials/:id/download`. |
| **P0-2** | ✅ Resolved (TASK-02) | **Quiz `SHORT_ANSWER` Key Leaked + Missing Ownership & Entitlement Checks** | [`course.service.ts`](../server/src/modules/courses/course.service.ts) & [`quiz.service.ts`](../server/src/modules/quizzes/quiz.service.ts) | Stripped `correctAnswer` and `explanation` for non-owners; enforced teacher course ownership (`getQuizOwnerTeacherId`) and student course entitlement (`hasLessonAccess`) in `GET /api/v1/quizzes/:id`. |
| **P0-3** | ✅ Resolved (TASK-04) | **Unsandboxed Host Python Execution** | Removed `playground.controller.ts` & `playground.routes.ts` | Eliminated host OS `spawn('python', ['-I', filePath])` RCE vector by removing `Playground` and `Board` models, routes, controllers, and `CODE_PLAYGROUND`/`BOARD` block types. |
| **P0-4** | ✅ Resolved (TASK-03) | **500MB In-Memory Upload Buffering (OOM Risk)** | [`video.routes.ts`](../server/src/modules/videos/video.routes.ts) & [`storage.ts`](../server/src/utils/storage.ts) | Switched from `multer.memoryStorage()` to `multer.diskStorage()` streaming to `.tmp` with automatic `finally` cleanup. |
| **P0-5** | ✅ Resolved (TASK-03) | **Unverified Cookie Role Decode in Edge Middleware & Unsanitized HTML** | [`middleware.ts`](../client/src/middleware.ts) & [`TiptapEditor.tsx`](../client/src/components/editor/TiptapEditor.tsx) | Enforced JWT `exp` validation, strict role whitelist (`STUDENT \| TEACHER \| ADMIN`), and cookie deletion on invalid/expired tokens in `middleware.ts`; sanitized read-only HTML via `DOMPurify.sanitize` (`isomorphic-dompurify`). |

---

## B. P1 — Functional Bugs, Unmounted UI & Backend Stubs

### 1. Built Frontend Components Never Mounted in App Router Pages
Five complete frontend components exist in `client/src/components/` and are wired to backend endpoints, but are **not imported by any page**:

1. [`MfaSetupModal.tsx`](../client/src/components/settings/MfaSetupModal.tsx) — TOTP QR setup modal (never mounted in `/profile/page.tsx`).
2. [`CoursePricingManager.tsx`](../client/src/components/admin/CoursePricingManager.tsx) — Admin course product pricing UI (never mounted in `AdminDashboard.tsx`).
3. **AssessmentRunner.tsx** — ✅ Resolved in TASK-07 (retired alongside `assessment` module).
4. **PodcastPlayer.tsx & CollectionCard.tsx** — ✅ Resolved in TASK-05 (pruned alongside `podcasts` and `collections`).
5. **Student Notification Inbox**: `GET /api/v1/notifications/me` and `PATCH /api/v1/notifications/:id/read` exist on the server, and teachers can broadcast announcements via `AnnouncementManager.tsx`, but students have no notification bell or inbox UI.

### 2. Verified Functional Bugs in Active Flows

| # | Bug | Location | Details |
| :--- | :--- | :--- | :--- |
| **P1-1** | ✅ Resolved (TASK-05) | [`CollectionsManager.tsx`](../client/src/components/admin/CollectionsManager.tsx) | Resolved by pruning the collections module and removing `CollectionsManager.tsx` and its tab in `AdminDashboard.tsx`. |
| **P1-2** | ✅ Resolved (TASK-05) | [`CourseCatalog.tsx`](../client/src/components/CourseCatalog.tsx) | Resolved by removing the `/career-tracks` query and career filters in `CourseCatalog.tsx` alongside pruning `careers`. |
| **P1-3** | **Local Assignment File Uploads Rejected by Zod** | [`schemas.ts`](../server/src/utils/schemas.ts) (L322) & [`storage.ts`](../server/src/utils/storage.ts) (L139) | `POST /api/v1/assignments/uploads` returns a relative path (`/uploads/submission-files/...`) when using local storage, which fails `submitAssignmentSchema`'s `z.string().url()` check on `POST /api/v1/assignments/:id/submit`. |
| **P1-4** | **AuditLog Foreign Key Failure on Course Review** | [`course.service.ts`](../server/src/modules/courses/course.service.ts) (L726–732) | `reviewCourseStatus` passes literal `'ADMIN'` as `userId` to `AuditService.log()`, violating `AuditLog.userId → User.id` foreign key constraint. |
| **P1-5** | ✅ Resolved (TASK-07) | [`quiz.service.ts`](../server/src/modules/quizzes/quiz.service.ts) | Resolved by retiring the redundant `assessment` module and restricting `QuizQuestionType` to 4 deterministic auto-grading types (`MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, `SHORT_ANSWER`); open-ended work is directed to `Assignment`. |
| **P1-6** | **Teacher Students & Revenue Ignore Course Entitlements** | [`teacher.service.ts`](../server/src/modules/teacher/teacher.service.ts) (L16–38, L160–175) | Queries only `resourceType: 'SUBJECT'` entitlements (ignoring `COURSE` purchases) and hardcodes `revenueEgp = students.length * 1500` instead of aggregating `Order` records. |

### 3. Stubbed Integrations & Over-Engineered Modules

| Module | Current State | Recommendation (See `09-ROADMAP.md`) |
| :--- | :--- | :--- |
| **Dual Curriculum (`CourseModule` vs `Section`)** | ✅ Resolved in TASK-06 | Consolidated onto `Section` → `Lesson`; retired `CourseModule` and `Lesson.moduleId`. |
| **Dual Testing Engines (`Quiz` vs `Assessment`)** | ✅ Resolved in TASK-07 | Consolidated onto auto-graded `Quiz` + teacher-graded `Assignment`; retired `assessment` module. |
| **Live Sessions (`live.service.ts`)** | Generates fake `https://zoom.us/j/${random9Digits}` URLs instead of real Zoom meetings. | Replace fake generator with teacher-supplied meeting URLs (Zoom, Google Meet, Teams). |
| **Payment Checkout (`commerce.service.ts`)** | `createOrder` creates a `PENDING` DB row; no outbound Paymob/Fawry API call is made to get a payment redirect URL. | Focus on Manual Wallet (Vodafone Cash / InstaPay) + Voucher redemption as primary reliable flows, or wire Paymob Intention API. |
| **Developer API Tokens & Outbound Webhooks** | ✅ Resolved in TASK-05 | Pruned 8 tables and modules (`developer`, `podcasts`, `collections`, `careers`) in TASK-05. |
| **Collaborative Board & Host Playground** | ✅ Resolved in TASK-04 | Removed alongside host Python playground in TASK-04. |

---

## C. P2 — Infrastructure, Database & Testing Gaps

1. **No Prisma Migrations Directory**: Schema changes rely on `prisma db push`. Before production deployment, initialize `prisma/migrations/` via `npx prisma migrate dev --name init`.
2. **Unused Redis Container**: `docker-compose.yml` runs `redis:7-alpine`, but `server/package.json` has no Redis client (`ioredis`/`redis`). Remove Redis from `docker-compose.yml` to simplify local/prod ops, or wire it only when multi-instance scaling is required.
3. **Test Setup Secret Override (✅ Resolved in TASK-01)**: [`server/tests/setup.ts`](../server/tests/setup.ts) now uses `||=` fallback assignment, preserving the 32+ char secrets from `.env.test`.
4. **Zero Frontend Unit/Component Tests**: `client/` has no Vitest or React Testing Library setup, and Playwright E2E specs (`client/e2e/`) are not executed in `.github/workflows/ci.yml` (`video.spec.ts` is 100% `test.skip`).
