# 00 — Project Overview

**EduPlatform** is a bilingual (English LTR / Arabic RTL) educational e-learning platform built as a two-package repository (`server/` + `client/`). Originally scoped for the Egyptian secondary school curriculum (Thanaweya Amma), its academic hierarchy, branding, and landing-page content are configurable at runtime through `AppConfig`.

| Item | Value |
| :--- | :--- |
| **Repository Layout** | Two-package layout: `client/` (Next.js 14) + `server/` (Express 5) |
| **Backend Stack** | Express 5.2.1 + TypeScript 5 + Prisma 5.11 + PostgreSQL 15 |
| **Frontend Stack** | Next.js 14.2.35 (App Router) + React 18 + Tailwind 3.4 + Zustand + TanStack React Query |
| **API Prefix** | `/api/v1` |
| **Default Ports** | Client **3000**, API **5000**, Postgres Dev **5434**, Postgres Test **5433** |

---

## Roles (As Implemented)

The Prisma `Role` enum defines **three** roles (`STUDENT`, `TEACHER`, `ADMIN`):

| Role | Capabilities |
| :--- | :--- |
| **STUDENT** | Browse published catalog, enroll in free courses, request manual subscriptions, create orders, redeem vouchers, watch entitled videos, download entitled materials, take deterministic auto-graded quizzes, submit assignments, track progress, post in course discussions, and use the AI tutor. |
| **TEACHER** | Register (created as `TeacherStatus.PENDING` until admin approval) → author courses, sections, lessons, blocks, videos, materials, quizzes, assignments, live session links, and broadcast announcements. |
| **ADMIN** | Manage users, approve/reject teachers, configure academic structure and subject pricing, review/publish courses, reconcile manual orders and subscriptions, manage vouchers, edit platform branding & home content, and inspect audit logs. |

Registration via `POST /api/v1/auth/register` only accepts `STUDENT` and `TEACHER`. `ADMIN` accounts are created via `npm run create:admin` or `npm run db:seed`.

---

## Feature Matrix (As-Built Code Reality)

All core domains are **Implemented, Wired, and Verified** by automated backend (Vitest + Supertest) and frontend (Vitest + React Testing Library + Playwright) test suites:

| Domain | Status | Code Reality Notes |
| :--- | :---: | :--- |
| **Auth (JWT Access + Rotating Refresh)** | ✅ | Hashed `RefreshToken` table; reuse detection revokes entire user token family; Edge middleware checks `exp` and role allowlist. |
| **TOTP MFA + QR Enrollment** | ✅ | Backend (`/api/v1/mfa/*`), `/login` challenge, and `/profile` `MfaSetupModal.tsx` enrollment/re-enrollment flow. |
| **RBAC (3 Roles + Teacher Approval)** | ✅ | `requireRole` + `requireApprovedTeacher`; student commerce endpoints disable admin bypass. |
| **Academic Structure** | ✅ | `EducationalStage` → `Grade` → `AcademicYear` → `GradeSubject` → `Subject`. |
| **Courses & Governance** | ✅ | Lifecycle (`DRAFT` → `UNDER_REVIEW` → `APPROVED` → `PUBLISHED`), nested media/quiz sanitization for un-entitled callers, and admin `AuditLog` tracking. |
| **Unified Curriculum (`Section` → `Lesson`)** | ✅ | Unified onto `Course` → `Section` → `Lesson` → `LessonBlock` with `Section.isFreePreview` support. |
| **Video Upload & Playback** | ✅ | Disk-streamed uploads up to 500MB (`multer.diskStorage()`) + entitlement-gated signed `/stream` endpoint; `/uploads/lesson-videos` blocked from static serving. |
| **Materials (PDF/Office/etc.)** | ✅ | 50MB limit, MIME whitelist, served exclusively through entitlement-gated `GET /api/v1/materials/:id/download`. |
| **Quizzes (Lesson-Attached)** | ✅ | Deterministic auto-grading for `MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, and normalized `SHORT_ANSWER`; teacher ownership and student entitlement enforced. |
| **Assignments & Grading** | ✅ | Full teacher/student workflow for written/essay and file submissions (supporting both local `/uploads/submission-files/...` paths and external URLs). |
| **Progress Tracking** | ✅ | Watch time + completion tracking gated by `EntitlementResolver`. |
| **Manual Subscriptions (Vodafone Cash / InstaPay)** | ✅ | Student request + Admin approval queue (`OfflinePaymentQueue`). |
| **Commerce (Products, Orders, Vouchers)** | ✅ | Streamlined `CheckoutModal` (Manual Wallet + Vouchers, plus optional gateway flag), atomic vouchers, inbound Paymob/Fawry webhooks, and Admin `CoursePricingManager.tsx`. |
| **Entitlement Resolver** | ✅ | Resolves access across `COURSE`, parent `SUBJECT`, and `GRADE_BUNDLE`. |
| **Platform Config / Branding / `homeContent`** | ✅ | Public `GET /config` and Admin `PUT/PATCH /config` with live landing page editor. |
| **Live Sessions** | ✅ | Supports teacher-provided external meeting URLs (`Zoom`, `Google Meet`, `Microsoft Teams`) in `LiveSessionManager.tsx`. |
| **AI Tutor Drawer** | ✅ | Calls Google Gemini (`gemini-1.5-flash`) via `POST /api/v1/ai/tutor`. |
| **Discussions** | ✅ | Course threads and replies (`DiscussionForum.tsx`). |
| **Notifications & Announcements** | ✅ | Teacher `AnnouncementManager.tsx` broadcasts + Student `NotificationBell.tsx` in `Navbar.tsx` wired to `/api/v1/notifications/me`. |

---

## Repository Map

```text
digital-platform/
├── client/                 # Next.js 14 App Router SPA + Vitest + Playwright E2E
│   ├── e2e/                # 7 Playwright spec files
│   ├── playwright.config.ts
│   ├── vitest.config.ts    # Vitest + jsdom unit/component test configuration
│   └── src/
│       ├── app/            # 9 App Router page routes
│       ├── components/     # Role dashboards, course player, admin, teacher, ui, __tests__/
│       ├── lib/            # api.ts, Zustand stores, i18n helpers, __tests__/
│       ├── test/           # Vitest global setup (setup.ts)
│       └── middleware.ts   # Edge UX route redirect guard
├── server/                 # Express 5 API
│   ├── prisma/             # schema.prisma (32 models, 17 enums), migrations/, + seed.ts
│   ├── scripts/            # db-env.js (test DB helper), run-demo.ts
│   ├── src/
│   │   ├── app.ts          # Middleware pipeline + /api/v1 route mounts
│   │   ├── server.ts       # Server bootstrap
│   │   ├── prisma.ts       # PrismaClient singleton
│   │   ├── modules/        # 19 domain modules (routes → controller → service + __tests__)
│   │   └── utils/          # env, jwt, totp, schemas, storage, webhook-security, cache, logger
│   ├── tests/setup.ts      # Vitest global setup
│   ├── vitest.config.ts    # Vitest configuration + v8 coverage thresholds
│   └── create-admin.js
├── docker-compose.yml      # postgres-dev (:5434), postgres-test (:5433)
├── .github/workflows/ci.yml
├── docs/                   # Canonical engineering documentation (00 through 07)
└── README.md
```
