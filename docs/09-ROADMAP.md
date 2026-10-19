# 09 — Feature Simplification Plan & Engineering Roadmap

Based on a full-stack audit of the 24 backend modules, 35 Prisma models, and Next.js 14 frontend, the codebase currently suffers from **feature sprawl**—maintaining duplicate data models, half-wired external integrations, and unmounted UI components that increase maintenance burden and reduce reliability.

This document defines the pragmatic **Simplification & Consolidation Plan** to make the platform smaller, faster, 100% reliable, and fully Test-Driven (TDD).

---

## 1. Core Simplification Decisions (Reducing Complexity)

### Decision 1: Unify Curriculum Hierarchy onto `Section` → `Lesson` (Drop `CourseModule`)
- **Current Complexity**: `schema.prisma` and `course.service.ts` maintain two parallel parent containers for lessons: `CourseModule` and `Section`. Only `Section` supports `isFreePreview`, and having two nullable foreign keys (`Lesson.sectionId` and `Lesson.moduleId`) complicates queries, reordering, and sanitization.
- **Simplification**: Standardize 100% on **`Course` → `Section` → `Lesson` → `LessonBlock`**. Migrate any module references to `Section` and remove `CourseModule` and `/courses/:courseId/modules` routes.

### Decision 2: Consolidate Testing onto a Single `Quiz` Engine (Retire Duplicate `Assessment` Module & `ESSAY` Auto-Grading)
- **Current Complexity**: The project maintains two separate testing subsystems:
  1. `Quiz` / `Question` / `QuizAttempt` (wired into lessons and `InteractiveQuizRunner.tsx`).
  2. `QuestionPool` / `QuestionItem` / `Assessment` / `AssessmentAttempt` (4 Prisma models, backend module, and an **unmounted** `AssessmentRunner.tsx` with broken essay grading).
  - Furthermore, `QuizQuestionType.ESSAY` puts quiz attempts into `AWAITING_REVIEW` with no teacher grading UI, when the `Assignment` module already handles teacher-graded written/file submissions!
- **Simplification**:
  1. **Remove the redundant `assessment` module** (4 Prisma models: `QuestionPool`, `QuestionItem`, `Assessment`, `AssessmentAttempt`, plus `AssessmentBuilder.tsx` and unmounted `AssessmentRunner.tsx`).
  2. **Keep `Quiz` strictly for deterministic auto-graded questions** (`MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, `SHORT_ANSWER`) so students always get instant, reliable scores.
  3. **Use `Assignment` for all open-ended / essay / file-upload work** that requires manual teacher grading and feedback.

### Decision 3: Prune Non-Core Peripheral Modules (`developer`, `podcasts`, `collections`, `careers`)
- **Current Complexity**:
  - `developer` (`ApiToken`, `WebhookEndpoint`): Stores rows in the DB, but tokens are never checked by auth middleware and outbound webhooks are never fired.
  - `podcasts` (`Podcast`, `PodcastEpisode`): `PodcastPlayer.tsx` isn't even mounted for students, and audio lessons can already be uploaded as standard Lesson `Material` (audio MIME types are already whitelisted in `material.routes.ts`!) or `VIDEO` lessons.
  - `collections` (`Collection`, `CollectionCourse`): Duplicates `Subject` and `Grade` catalog filtering, has a broken Admin `+ New Collection` UI button, and `CollectionCard.tsx` is unmounted.
  - `careers` (`CareerTrack`, `CareerTrackSubject`): Adds onboarding modal friction, 404s in `CourseCatalog.tsx`, and is redundant with `EducationalStage` / `Grade` / `Subject` filtering.
- **Simplification**: Remove `developer`, `podcasts`, `collections`, and `careers` (eliminating 8 Prisma models, 4 backend modules, and 8 frontend components), focusing 100% on the core **Stage → Grade → Subject → Course** learning experience.

### Decision 4: Replace Risky/Fake Integrations with Reliable Patterns (`playground`, `board`, `live`, `commerce`)
1. **Code Playground (`playground`)**:
   - *Problem*: Spawning host `python -I` on the Express server (`playground.controller.ts`) is a severe RCE/DoS risk (`P0-3`).
   - *Simplification*: Run Python 100% in the browser via **Pyodide (WebAssembly WebWorker)**—or if the platform is focused on general curriculum courses rather than coding bootcamps, remove the server `/playgrounds/execute` endpoint entirely so zero untrusted code ever runs on the backend.
2. **Collaborative Board (`board`)**:
   - *Problem*: Marketed as a "Multiplayer Collaborative Whiteboard" with `yjsState`, but has no WebSocket server and only saves single-user JSON strokes.
   - *Simplification*: Remove the backend `Board` table and `/api/v1/boards` routes; if a student scratchpad is desired in the player, persist it locally in `localStorage` or drop the `BOARD` block type in favor of `VIDEO`, `TEXT`, `DOCUMENT`, `QUIZ`, `ASSIGNMENT`, and `LIVE_SESSION`.
3. **Live Sessions (`live`)**:
   - *Problem*: `LiveService` fabricates fake `https://zoom.us/j/123456789` URLs.
   - *Simplification*: Allow teachers to paste their real **Meeting Join URL** (Zoom, Google Meet, Microsoft Teams, or YouTube Live) when scheduling a `LiveSession`, validating it with Zod (`z.string().url()`). Zero external Zoom OAuth complexity, 100% functional immediately.
4. **Commerce & Payments (`commerce`, `subscriptions`)**:
   - *Problem*: `CommerceService.createOrder` doesn't call outbound Paymob/Fawry APIs to create payment sessions, leaving `PAYMOB`/`FAWRY` orders stuck in `PENDING`.
   - *Simplification*: Standardize checkout on the two payment flows that work end-to-end today without external gateway fragility:
     1. **Manual Wallet Transfer (Vodafone Cash / InstaPay)** with reference number + Admin 1-click approval queue.
     2. **Pre-paid Voucher Codes** (`VoucherRedeemModal.tsx`) with atomic redemption.
     3. Keep Paymob/Fawry webhook handlers behind a feature flag (`ENABLE_GATEWAY_CHECKOUT=false` by default) until live merchant credentials and outbound session initiation are configured.

### Decision 5: Clean Up Infrastructure (`Redis`, `Prisma Migrations`, `Uploads`)
- Remove the unused `redis` service from `docker-compose.yml` (the app uses `src/utils/cache.ts` in-memory TTL cache).
- Switch `video.routes.ts` from `multer.memoryStorage()` to `multer.diskStorage()` to prevent RAM exhaustion (`P0-4`).
- Initialize versioned Prisma migrations (`prisma/migrations/`) so schema deployments are deterministic.

---

## 2. Impact Summary of Simplification

| Metric | Before Simplification | After Simplification | Benefit |
| :--- | :---: | :---: | :--- |
| **Prisma Models** | 35 models | **21 core models** (-40%) | Eliminates dual curriculum, dual quiz engines, and dead tables |
| **Backend Modules** | 24 modules | **18 focused modules** (-25%) | Every remaining endpoint is 100% wired, secured, and tested |
| **Lesson Block Types** | 9 block types | **6 reliable block types** (`VIDEO`, `TEXT`, `DOCUMENT`, `QUIZ`, `ASSIGNMENT`, `LIVE_SESSION`) | Removes RCE risk (`CODE_PLAYGROUND`) and fake multiplayer (`BOARD`) |
| **Orphaned UI Components** | 5 unmounted components | **0 unmounted components** | Mounts `MfaSetupModal` & `CoursePricingManager`; removes dead `Assessment`/`Podcast`/`Collection` UI |
| **Payment Reliability** | 2 working + 2 half-wired | **100% working checkout flows** (Manual Wallet + Vouchers + Free Enroll) | Students never hit a dead-end checkout spinner |

---

## 3. Phased Execution Plan (Security → Simplification → 100% TDD)

See [`docs/tasks/00-MASTER-IMPLEMENTATION-PLAN.md`](./tasks/00-MASTER-IMPLEMENTATION-PLAN.md) for the 12 detailed task specifications (`TASK-01` through `TASK-12`).

### Phase 1: P0 Security & Data Leak Remediation — ✅ COMPLETED (`TASK-01`..`TASK-03`)
1. ✅ **Lock down Course & Lesson Media (`P0-1`, `TASK-01`)**:
   - Stripped `videoUrl` and `fileUrl` from `CourseService.getAllCourses` and `CourseService.getCourseById` for un-entitled callers.
   - Blocked lesson videos/materials from unauthenticated `express.static('/uploads')` and added entitlement-checked `GET /api/v1/materials/:id/download`.
2. ✅ **Lock down Quiz Access & Answer Keys (`P0-2`, `TASK-02`)**:
   - Stripped `Question.correctAnswer` in `CourseService.sanitizeCourseContent`.
   - Enforced teacher ownership (`getQuizOwnerTeacherId`) and student `assertLearningAccess` in `QuizController.getQuiz`.
3. ✅ **Eliminate Host RCE, Memory DoS & Client XSS (`P0-3`, `P0-4`, `P0-5`, `TASK-03`)**:
   - Switched `video.routes.ts` Multer config from `memoryStorage()` to `diskStorage()`.
   - Sanitized `TiptapEditor.tsx` HTML with `isomorphic-dompurify` and enforced `exp`/role allowlist checks in `client/src/middleware.ts`.

### Phase 2: Codebase Simplification & Consolidation — ✅ COMPLETED (`TASK-04`..`TASK-07`)
1. ✅ **Retire `playground` & `board` (`TASK-04`)**: Removed host `spawn('python')` RCE risk, `Board` model, and `CODE_PLAYGROUND`/`BOARD` block types.
2. ✅ **Prune Dead Modules (`TASK-05`)**: Removed `developer`, `podcasts`, `collections`, and `careers` across Prisma, `server/src/modules/`, and `client/src/components/`.
3. ✅ **Unify Curriculum (`TASK-06`)**: Standardized `Lesson` parenting on `Section` and removed `CourseModule`.
4. ✅ **Consolidate Quizzes & Assignments (`TASK-07`)**: Removed the redundant `assessment` module and `QuizQuestionType.ESSAY` (routing written submissions to `Assignment`).

### Phase 3: Core Feature Repairs, UI Wiring & Infrastructure (`TASK-08`..`TASK-11`) — Pending
1. **Fix Remaining Core Bugs (`TASK-08`)**:
   - Fix `submitAssignmentSchema` in `schemas.ts` to accept local `/uploads/...` paths (`P1-3`).
   - Pass actual `adminUserId` in `CourseService.reviewCourseStatus` (`P1-4`).
   - Update `TeacherService` to include `COURSE` entitlements and calculate real revenue from `Order` records (`P1-6`).
   - Update `LiveService` to accept teacher-provided meeting URLs (`Zoom` / `Google Meet` / `Teams`).
2. **Simplify Checkout & Mount `CoursePricingManager` (`TASK-09`)**:
   - Gate `PAYMOB`/`FAWRY` behind `ENABLE_GATEWAY_CHECKOUT` and mount `CoursePricingManager.tsx` in `AdminDashboard.tsx`.
3. **Mount `MfaSetupModal` & Build `NotificationBell` (`TASK-10`)**:
   - Mount `MfaSetupModal.tsx` in `/profile` and add a Student Notification bell/dropdown in the navbar.
4. **Infrastructure Cleanup (`TASK-11`)**:
   - Remove unused `redis` from `docker-compose.yml` and initialize baseline Prisma migration (`prisma/migrations/`).

### Phase 4: Full Test-Driven Development (TDD) Completion (`TASK-12`) — Pending
1. ✅ **Backend Test Harness (`TASK-01`)**: Fixed `server/tests/setup.ts` so it preserves `.env.test` secrets (`55/55` test suites passing).
2. **Frontend Unit & Component Test Suite (`TASK-12`)**: Install Vitest + React Testing Library in `client/` and add unit/component specs for `api.ts`, Zustand stores, and role dashboards/modals.
3. **Playwright E2E in CI (`TASK-12`)**: Un-skip `client/e2e/video.spec.ts`, fix `auth.spec.ts`, and gate merges on Playwright + coverage in `.github/workflows/ci.yml`.
