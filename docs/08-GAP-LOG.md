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

1. **MfaSetupModal.tsx** — ✅ Resolved in TASK-10 (mounted in `/profile/page.tsx` with status badge and re-enrollment support).
2. **CoursePricingManager.tsx** — ✅ Resolved in TASK-09 (mounted in `AdminDashboard.tsx` under dedicated 'Pricing & Products' tab).
3. **AssessmentRunner.tsx** — ✅ Resolved in TASK-07 (retired alongside `assessment` module).
4. **PodcastPlayer.tsx & CollectionCard.tsx** — ✅ Resolved in TASK-05 (pruned alongside `podcasts` and `collections`).
5. **Student Notification Inbox** — ✅ Resolved in TASK-10 (built and mounted `NotificationBell.tsx` in `Navbar.tsx` wired to `GET /notifications/me` and `PATCH /notifications/:id/read`).

### 2. Verified Functional Bugs in Active Flows

| # | Bug | Location | Details |
| :--- | :--- | :--- | :--- |
| **P1-1** | ✅ Resolved (TASK-05) | [`CollectionsManager.tsx`](../client/src/components/admin/CollectionsManager.tsx) | Resolved by pruning the collections module and removing `CollectionsManager.tsx` and its tab in `AdminDashboard.tsx`. |
| **P1-2** | ✅ Resolved (TASK-05) | [`CourseCatalog.tsx`](../client/src/components/CourseCatalog.tsx) | Resolved by removing the `/career-tracks` query and career filters in `CourseCatalog.tsx` alongside pruning `careers`. |
| **P1-3** | ✅ Resolved (TASK-08) | [`schemas.ts`](../server/src/utils/schemas.ts) | Defined `fileUrlSchema` in `submitAssignmentSchema` accepting both local `/uploads/...` paths and valid `http(s)://` URLs. |
| **P1-4** | ✅ Resolved (TASK-08) | [`course.service.ts`](../server/src/modules/courses/course.service.ts) & [`course.controller.ts`](../server/src/modules/courses/course.controller.ts) | Passed `req.user?.userId` to `CourseService.reviewCourseStatus` and logged real admin UUID in `AuditLog.userId`, satisfying the FK constraint. |
| **P1-5** | ✅ Resolved (TASK-07) | [`quiz.service.ts`](../server/src/modules/quizzes/quiz.service.ts) | Resolved by retiring the redundant `assessment` module and restricting `QuizQuestionType` to 4 deterministic auto-grading types (`MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, `SHORT_ANSWER`); open-ended work is directed to `Assignment`. |
| **P1-6** | ✅ Resolved (TASK-08) | [`teacher.service.ts`](../server/src/modules/teacher/teacher.service.ts) | Included `COURSE`-level entitlements in `getEnrolledStudents` and computed `revenueEgp`/`revenueUsd` from real `PAID` `Order` records for teacher courses/subjects in `getRevenueSummary`. |

### 3. Stubbed Integrations & Over-Engineered Modules

| Module | Current State | Recommendation (See `09-ROADMAP.md`) |
| :--- | :--- | :--- |
| **Dual Curriculum (`CourseModule` vs `Section`)** | ✅ Resolved in TASK-06 | Consolidated onto `Section` → `Lesson`; retired `CourseModule` and `Lesson.moduleId`. |
| **Dual Testing Engines (`Quiz` vs `Assessment`)** | ✅ Resolved in TASK-07 | Consolidated onto auto-graded `Quiz` + teacher-graded `Assignment`; retired `assessment` module. |
| **Live Sessions (`live.service.ts`)** | ✅ Resolved in TASK-08 | Added teacher `joinUrl` support (`Zoom`, `Google Meet`, `Teams`) in `LiveService`, `createLiveSessionSchema`, and `LiveSessionManager.tsx`. |
| **Payment Checkout (`commerce.service.ts`)** | ✅ Resolved in TASK-09 | Added instant Voucher redemption in `CheckoutModal.tsx` and manual wallet guidance (Vodafone Cash / InstaPay); mounted `CoursePricingManager` in `AdminDashboard.tsx`. |
| **Developer API Tokens & Outbound Webhooks** | ✅ Resolved in TASK-05 | Pruned 8 tables and modules (`developer`, `podcasts`, `collections`, `careers`) in TASK-05. |
| **Collaborative Board & Host Playground** | ✅ Resolved in TASK-04 | Removed alongside host Python playground in TASK-04. |

---

## C. P2 — Infrastructure, Database & Testing Gaps

1. **Prisma Migrations Baseline** — ✅ Resolved in TASK-11: Generated `0001_init/migration.sql` for the simplified 21-model schema with `migration_lock.toml` and `"db:migrate:deploy"` script.
2. **Unused Redis Container** — ✅ Resolved in TASK-11: Removed `redis` service and `redis_data` volume from `docker-compose.yml`.
3. **Test Setup Secret Override (✅ Resolved in TASK-01)**: [`server/tests/setup.ts`](../server/tests/setup.ts) now uses `||=` fallback assignment, preserving the 32+ char secrets from `.env.test`.
4. **Zero Frontend Unit/Component Tests** — ✅ Resolved in TASK-12: Configured Vitest + React Testing Library + jsdom in `client/` with unit and component test suites (12 tests passing across `api.spec.ts`, `configStore.spec.ts`, `NotificationBell.spec.tsx`, and `CheckoutModal.spec.tsx`), un-skipped Playwright specs (`video.spec.ts`), fixed RTL toggle assertion in `auth.spec.ts`, and wired `npm test` into `.github/workflows/ci.yml`.
