# 05 — Features (As-Built Behavior & Current State)

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
- **Governance Lifecycle**: `DRAFT` → `UNDER_REVIEW` → `APPROVED` → `PUBLISHED` / `REJECTED` / `ARCHIVED`, with soft-delete (`deletedAt`).
- **Unified Curriculum Structure (`TASK-06`)**: Standardized 100% on **`Course` → `Section` → `Lesson` → `LessonBlock`**, supporting `Section.isFreePreview` and section/lesson reordering.
- **Lesson Blocks (`LessonBlock`)**: Supports `VIDEO`, `TEXT`, `DOCUMENT`, `QUIZ`, `ASSIGNMENT`, `LIVE_SESSION`, and `LINK`.
- **Media & Quiz Security (`TASK-01`, `TASK-02`)**: `getAllCourses` and `getCourseById` strip nested `videoUrl`/`fileUrl` and `Question.correctAnswer` (`sanitizeCourseContent`).
- **Remaining Phase 3 Fix (`TASK-08`)**: `CourseService.reviewCourseStatus` currently passes literal `'ADMIN'` as `userId` to `AuditLog` (`P1-4`).

---

## 4. Video & Material Delivery (`videos`, `materials`)
- **Video Upload & Streaming (`TASK-01`, `TASK-03`)**: Teachers upload videos up to 500MB (`POST /api/v1/videos/upload`) streamed directly to disk (`multer.diskStorage()`) and stored in Supabase Storage or local `server/uploads/lesson-videos/`. Direct static access to `/uploads/lesson-videos/*` is blocked (`403`); entitled students fetch a signed playback URL (`GET /api/v1/videos/:id/playback-url`) pointing to the range-capable stream endpoint (`GET /api/v1/videos/:id/stream?token=...`).
- **Materials (`TASK-01`)**: Teachers upload PDFs/documents up to 50MB (`POST /api/v1/materials/upload`). Direct static access to `/uploads/lesson-materials/*` is blocked (`403`); entitled students download materials via `GET /api/v1/materials/:id/download`.

---

## 5. Quizzes (`quizzes`)
- **Capabilities (`TASK-02`, `TASK-07`)**: Lesson-attached deterministic auto-graded quizzes supporting `MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, and case/whitespace-normalized `SHORT_ANSWER` questions with time limits, max attempts, and passing score thresholds.
- **Security**: `GET /api/v1/quizzes/:id` enforces teacher course-ownership (`getQuizOwnerTeacherId`) and student learning entitlement (`assertLearningAccess`), stripping `correctAnswer` and `explanation` for students.

---

## 6. Assignments (`assignments`)
- **Capabilities**: Dedicated workflow for all open-ended, essay, and file-attachment assessments requiring manual teacher grading and feedback. Teachers create lesson assignments (`AssignmentStudio.tsx`) and grade student submissions (`POST /api/v1/assignments/submissions/:submissionId/grade`). Students submit text and file attachments (`AssignmentRunner.tsx`).
- **Remaining Phase 3 Fix (`TASK-08`)**: `submitAssignmentSchema` validates `fileUrl` with `z.string().url()`, which rejects relative `/uploads/submission-files/...` paths (`P1-3`).

---

## 7. Progress Tracking (`progress`)
- **Capabilities**: Tracks per-lesson `watchTimeSec` and `isCompleted` (`LessonProgress`), enforcing entitlement checks on write operations and aggregating student summary metrics on `/student/dashboard`.

---

## 8. Subscriptions, Commerce & Vouchers (`subscriptions`, `commerce`)
- **Manual Subscriptions**: Students submit Vodafone Cash / InstaPay payment references (`POST /api/v1/subscriptions/manual`); admins approve/reject via `OfflinePaymentQueue.tsx`.
- **Orders & Webhooks**: Students create orders (`POST /api/v1/commerce/orders`) with idempotency keys; admins reconcile manual orders (`PendingOrdersManager.tsx`); inbound Paymob (`HMAC-SHA512`) and Fawry (`SHA-256`) webhooks verify signatures and grant entitlements idempotently.
- **Vouchers**: Atomic `usedCount` increment prevents race conditions on concurrent redemptions.
- **Remaining Phase 3 Items (`TASK-09`)**:
  - Gate `PAYMOB`/`FAWRY` behind `ENABLE_GATEWAY_CHECKOUT` while keeping manual wallet transfer and voucher redemption active by default.
  - Mount [`CoursePricingManager.tsx`](../client/src/components/admin/CoursePricingManager.tsx) in `AdminDashboard.tsx`.

---

## 9. Secondary & Engagement Modules

| Module | As-Built Status |
| :--- | :--- |
| **AI Tutor (`ai`)** | ✅ Functional drawer (`AITutorDrawer.tsx`) calling `POST /api/v1/ai/tutor` (`gemini-1.5-flash`). |
| **Discussions (`discussions`)** | ✅ Functional course threads and replies (`DiscussionForum.tsx`). |
| **Live Sessions (`live`)** | 🟡 Scheduled in `TASK-08` to accept teacher-provided `meetingUrl` (`Zoom` / `Google Meet` / `Teams`). |
| **Notifications (`notifications`)** | 🟡 Teachers can broadcast announcements (`AnnouncementManager.tsx`); student `NotificationBell.tsx` UI scheduled in `TASK-10`. |
| **Teacher Analytics (`teacher`)** | 🟡 Updated in `TASK-07` to aggregate `QuizAttempt` scores; `COURSE` entitlement inclusion & real `Order` revenue calculation scheduled in `TASK-08`. |
