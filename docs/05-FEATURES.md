# 05 — Features (As-Built Behavior)

## 1. Platform Configuration & Branding (`config`)
- **Backend**: Public `GET /api/v1/config` and Admin `PUT/PATCH /api/v1/config`.
- **Frontend**: `useConfigStore` (`client/src/lib/configStore.ts`) and `PlatformSettings.tsx` in the Admin Dashboard.
- **Capabilities**: Runtime customization of site name (`siteNameEn`/`siteNameAr`), slogans, `--brand-primary` color, EGP/USD exchange rate, feature flags (`allowTeacherRegistration`, `requireCourseApproval`), and full landing page copy (`homeContent` JSON).

---

## 2. Academic Structure (`academic`, `subjects`)
- **Hierarchy**: `EducationalStage` → `Grade` → `AcademicYear` → `GradeSubject` → `Subject` → `Course`.
- **Capabilities**: Public read endpoints for stages, grades, academic years, and subjects; Admin CRUD via `AcademicStructureManager.tsx`; per-period subject pricing (`MONTHLY`, `SIX_MONTHS`, `YEARLY`) in EGP with automatic USD derivation.

---

## 3. Courses, Curriculum & Governance (`courses`)
- **Governance Lifecycle**: `DRAFT` → `UNDER_REVIEW` → `APPROVED` → `PUBLISHED` / `REJECTED` / `ARCHIVED`, with soft-delete (`deletedAt`) and admin review audit logging (`AuditLog` recording the reviewing admin's `userId`).
- **Unified Curriculum Structure**: Standardized 100% on **`Course` → `Section` → `Lesson` → `LessonBlock`**, supporting `Section.isFreePreview` and section/lesson reordering.
- **Lesson Blocks (`LessonBlock`)**: Supports `VIDEO`, `TEXT`, `DOCUMENT`, `QUIZ`, `ASSIGNMENT`, `LIVE_SESSION`, and `LINK`.
- **Media & Quiz Security**: `getAllCourses` and `getCourseById` strip nested `videoUrl`/`fileUrl` and `Question.correctAnswer` (`sanitizeCourseContent`).

---

## 4. Video & Material Delivery (`videos`, `materials`)
- **Video Upload & Streaming**: Teachers upload videos up to 500MB (`POST /api/v1/videos/upload`) streamed directly to disk (`multer.diskStorage()`) and stored in Supabase Storage or local `server/uploads/lesson-videos/`. Direct static access to `/uploads/lesson-videos/*` is blocked (`403`); entitled students fetch a signed playback URL (`GET /api/v1/videos/:id/playback-url`) pointing to the range-capable stream endpoint (`GET /api/v1/videos/:id/stream?token=...`).
- **Materials**: Teachers upload PDFs/documents up to 50MB (`POST /api/v1/materials/upload`). Direct static access to `/uploads/lesson-materials/*` is blocked (`403`); entitled students download materials via `GET /api/v1/materials/:id/download`.

---

## 5. Quizzes (`quizzes`)
- **Capabilities**: Lesson-attached deterministic auto-graded quizzes supporting `MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, and case/whitespace-normalized `SHORT_ANSWER` questions with time limits, max attempts, and passing score thresholds.
- **Security**: `GET /api/v1/quizzes/:id` enforces teacher course-ownership (`getQuizOwnerTeacherId`) and student learning entitlement (`assertLearningAccess`), stripping `correctAnswer` and `explanation` for students.

---

## 6. Assignments (`assignments`)
- **Capabilities**: Dedicated workflow for all open-ended, essay, and file-attachment assessments requiring manual teacher grading and feedback. Teachers create lesson assignments (`AssignmentStudio.tsx`) and grade student submissions (`POST /api/v1/assignments/submissions/:submissionId/grade`). Students submit text and file attachments (`AssignmentRunner.tsx`), supporting both local `/uploads/submission-files/...` paths and external `http(s)://` URLs.

---

## 7. Progress Tracking (`progress`)
- **Capabilities**: Tracks per-lesson `watchTimeSec` and `isCompleted` (`LessonProgress`), enforcing entitlement checks on write operations and aggregating student summary metrics on `/student/dashboard`.

---

## 8. Subscriptions, Commerce & Vouchers (`subscriptions`, `commerce`)
- **Manual Subscriptions**: Students submit Vodafone Cash / InstaPay payment references (`POST /api/v1/subscriptions/manual`); admins approve/reject via `OfflinePaymentQueue.tsx`.
- **Orders & Webhooks**: Students create orders (`POST /api/v1/commerce/orders`) with idempotency keys via `CheckoutModal.tsx` (supporting Manual Wallet Transfer, instant Voucher redemption, and optional Paymob/Fawry gateway tabs via `NEXT_PUBLIC_ENABLE_GATEWAY_CHECKOUT`); admins reconcile manual orders (`PendingOrdersManager.tsx`) and manage course/subject pricing via `CoursePricingManager.tsx` in `AdminDashboard.tsx`. Inbound Paymob (`HMAC-SHA512`) and Fawry (`SHA-256`) webhooks verify signatures and grant entitlements idempotently.
- **Vouchers**: Atomic `usedCount` increment prevents race conditions on concurrent redemptions.

---

## 9. Secondary & Engagement Modules

| Module | As-Built Status |
| :--- | :--- |
| **AI Tutor (`ai`)** | ✅ Functional drawer (`AITutorDrawer.tsx`) calling `POST /api/v1/ai/tutor` (`gemini-1.5-flash`). |
| **Discussions (`discussions`)** | ✅ Functional course threads and replies (`DiscussionForum.tsx`). |
| **Live Sessions (`live`)** | ✅ Supports teacher-provided external `joinUrl` (`Zoom`, `Google Meet`, `Microsoft Teams`) in `LiveSessionManager.tsx`. |
| **Notifications (`notifications`)** | ✅ Teachers broadcast announcements (`AnnouncementManager.tsx`); students view unread badge counts and mark notifications read via `NotificationBell.tsx` in `Navbar.tsx`. |
| **Teacher Analytics (`teacher`)** | ✅ Aggregates `QuizAttempt` scores, includes both `SUBJECT` and `COURSE`-level entitlements in student rosters, and computes `revenueEgp`/`revenueUsd` from `PAID` `Order` records. |
