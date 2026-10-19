# 06 — API Catalog

Base URL (local): `http://localhost:5000`  
Version prefix: **`/api/v1`**  
Auth: `Authorization: Bearer <accessToken>` unless marked Public.  
Response envelope (client expectation): `{ success: boolean, message?: string, data?: T }`.

Legend for Auth column:
- **Public** — no token
- **Optional** — anonymous allowed; role-scoped data
- **Bearer** — any authenticated user
- **Student** — STUDENT (no admin bypass)
- **Teacher** — TEACHER with `teacherStatus=APPROVED` (ADMIN passes)
- **Admin** — ADMIN only

---

## Root & health

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/` | API welcome JSON | Public |
| GET | `/health` | DB ping, uptime, memory | Public |
| GET | `/api/v1/health` | Same as `/health` | Public |

---

## Auth (`/api/v1/auth`, `/api/v1/mfa`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/v1/auth/register` | Register student/teacher (ADMIN blocked) | Public |
| POST | `/api/v1/auth/login` | Login; may return `mfaRequired` + `mfaSessionToken` | Public |
| POST | `/api/v1/auth/mfa-login` | Complete MFA login | Public |
| POST | `/api/v1/auth/refresh` | Rotate refresh token | Public (cookie/body) |
| POST | `/api/v1/auth/logout` | Revoke presented refresh token | Public (acts on cookie) |
| GET | `/api/v1/auth/me` | Current user from JWT | Bearer |
| GET | `/api/v1/auth/profile` | Full profile | Bearer |
| PATCH | `/api/v1/auth/profile` | Update name/avatar/grade/studentNumber | Bearer |
| POST | `/api/v1/mfa/setup` | TOTP secret + QR (re-enroll needs password + current token) | Bearer |
| POST | `/api/v1/mfa/verify` | Verify code, enable MFA | Bearer |

---

## Academic (`/api/v1/academic`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/academic/stages` | List educational stages | Public |
| GET | `/academic/stages/:stageId/grades` | Grades for a stage | Public |
| GET | `/academic/years` | List academic years | Public |
| GET | `/academic/grades/:gradeId/subjects` | Subjects for a grade | Public |
| GET | `/academic/grade-subjects` | Grade-subject associations | Bearer |
| POST/PATCH/DELETE | `/academic/stages[/:stageId]` | Stage CRUD | Admin |
| POST/PATCH/DELETE | `/academic/grades[/:gradeId]` | Grade CRUD | Admin |
| POST/PATCH/DELETE | `/academic/years[/:yearId]` | Year CRUD | Admin |
| POST/PATCH/DELETE | `/academic/grade-subjects[/:id]` | Associations CRUD / toggle | Admin |

---

## Subjects (`/api/v1/subjects`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/subjects` | List subjects | Public |
| GET | `/subjects/:id` | Subject detail | Public |
| POST | `/subjects` | Create subject (dynamic; approved teachers) | Teacher |
| PATCH | `/subjects/:id` | Update subject | Admin |
| DELETE | `/subjects/:id` | Delete subject | Admin |
| PUT | `/subjects/:id/pricing` | Update EGP/USD pricing per period | Admin |

---

## Courses (`/api/v1/courses`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/courses` | List courses (role-scoped visibility) | Optional |
| GET | `/courses/teacher/dashboard` | Teacher dashboard stats | Teacher |
| GET | `/courses/teacher/my-courses` | Teacher's courses | Teacher |
| GET | `/courses/:id` | Course detail | Optional |
| POST | `/courses` | Create course | Teacher |
| PATCH | `/courses/:id` | Update course | Teacher |
| DELETE | `/courses/:id` | Delete course | Teacher |
| PATCH | `/courses/:id/publish` | Publish course | Admin |
| PATCH | `/courses/:id/archive` | Archive course | Teacher |
| POST | `/courses/:id/enroll` | Free-course enrollment | Bearer |
| POST | `/courses/:id/submit` | Submit for review | Teacher |
| POST | `/courses/:id/review` | Approve/reject review | Admin |
| GET | `/courses/:courseId/sections` | List sections | Optional |
| POST | `/courses/:courseId/sections` | Create section | Teacher |
| PATCH | `/courses/sections/:sectionId` | Update section | Teacher |
| DELETE | `/courses/sections/:sectionId` | Delete section | Teacher |
| POST | `/courses/sections/:sectionId/lessons` | Create section lesson | Teacher |
| POST | `/courses/:courseId/sections/reorder` | Reorder sections | Teacher |
| PATCH | `/courses/lessons/:lessonId` | Update lesson | Teacher |
| POST | `/courses/lessons/reorder` | Reorder lessons | Teacher |
| POST | `/courses/lessons/:lessonId/video` | Attach video | Teacher |
| DELETE | `/courses/lessons/:lessonId/video` | Detach video | Teacher |
| POST | `/courses/lessons/:lessonId/material` | Attach material | Teacher |
| POST | `/courses/lessons/:lessonId/quiz` | Attach quiz | Teacher |
| DELETE | `/courses/lessons/:lessonId/quiz` | Detach quiz | Teacher |
| POST | `/courses/lessons/:lessonId/blocks` | Add lesson block | Teacher |
| PATCH | `/courses/blocks/:blockId` | Update block | Teacher |
| DELETE | `/courses/blocks/:blockId` | Delete block | Teacher |
| DELETE | `/courses/lessons/:lessonId` | Delete lesson | Teacher |

---

## Videos (`/api/v1/videos`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/videos/upload` | Upload video (500MB, streamed via diskStorage) | Teacher |
| GET | `/videos/:videoId/playback-url` | Secure playback URL | Bearer (entitlement) |
| GET | `/videos/:videoId/stream` | Stream local video | Token query param |

---

## Materials (`/api/v1/materials`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/materials/upload` | Upload material (50MB) | Teacher |
| DELETE | `/materials/:id` | Delete material | Teacher |
| GET | `/materials/lesson/:lessonId` | Materials for lesson | Bearer |
| GET | `/materials/:id/download` | Secure download URL for material | Bearer + Entitlement / Preview / Owner |

---

## Quizzes (`/api/v1/quizzes`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/quizzes` | Create quiz | Teacher |
| PATCH | `/quizzes/:id` | Update quiz | Teacher |
| GET | `/quizzes/:id` | Get quiz (sanitized for students, owner-only for teachers) | Bearer + Entitlement / Owner |
| POST | `/quizzes/:id/attempts/start` | Start attempt | Bearer + Entitlement |
| POST | `/quizzes/:id/attempts` | Submit attempt | Bearer + Entitlement |
| GET | `/quizzes/:id/attempts` | My attempts | Bearer |

---

## Assignments (`/api/v1/assignments`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/assignments/my-submissions` | My submission history | Bearer |
| POST | `/assignments/uploads` | Upload submission file (20MB) | Bearer |
| GET | `/assignments/lesson/:lessonId` | Assignments by lesson | Bearer |
| POST | `/assignments/:id/submit` | Submit assignment | Bearer + Entitlement |
| GET | `/assignments/:id` | Assignment detail | Bearer |
| POST | `/assignments/lesson/:lessonId` | Create assignment for lesson | Teacher |
| PATCH | `/assignments/:id` | Update assignment | Teacher |
| DELETE | `/assignments/:id` | Delete assignment | Teacher |
| GET | `/assignments/:id/submissions` | Submissions for grading | Teacher |
| POST | `/assignments/submissions/:submissionId/grade` | Grade submission | Teacher |

---

## Progress (`/api/v1/progress`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/progress/summary` | Overall progress | Bearer |
| GET | `/progress/course/:courseId` | Course progress | Bearer |
| POST | `/progress/:lessonId` | Update watch time | Bearer + Entitlement |
| POST | `/progress/:lessonId/complete` | Mark lesson complete | Bearer + Entitlement |

---

## Subscriptions (`/api/v1/subscriptions`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/subscriptions/manual` | Create manual subscription request | **Student** (no admin bypass) |
| GET | `/subscriptions/me` | My subscriptions | Bearer |
| GET | `/subscriptions/pending` | Pending requests | Admin |
| PATCH | `/subscriptions/:id/approve` | Approve subscription | Admin |
| PATCH | `/subscriptions/:id/reject` | Reject subscription | Admin |
| DELETE | `/subscriptions/:id` | Cancel subscription | Bearer |

---

## Commerce (`/api/v1/commerce`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/commerce/products` | Public product catalog | Public |
| POST | `/commerce/products` | Create product | Admin |
| GET | `/commerce/vouchers` | List vouchers | Admin |
| POST | `/commerce/vouchers` | Create voucher | Admin |
| DELETE | `/commerce/vouchers/:id` | Delete voucher | Admin |
| POST | `/commerce/orders` | Student checkout (idempotencyKey required) | **Student** |
| GET | `/commerce/orders/me` | My purchase history / polling | Bearer |
| POST | `/commerce/vouchers/redeem` | Redeem voucher | **Student** |
| GET | `/commerce/admin/orders` | Admin order list | Admin |
| PATCH | `/commerce/admin/orders/:id/approve` | Approve manual order | Admin |
| PATCH | `/commerce/admin/orders/:id/reject` | Reject manual order | Admin |
| GET | `/commerce/entitlements/check` | Check entitlement access | Bearer |
| GET | `/commerce/entitlements/check-course/:courseId` | Check course access | Bearer |
| POST | `/commerce/webhooks/paymob` | Paymob callback (HMAC-SHA512) | Public webhook |
| POST | `/commerce/webhooks/fawry` | Fawry callback (SHA-256) | Public webhook |

---

## Admin (`/api/v1/admin`)

Router-level: `authenticate + requireRole([ADMIN])`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/users` | List users (filters: page/limit/role/search) |
| POST | `/admin/users` | Create user (admin flows) |
| PATCH | `/admin/users/:id` | Update user |
| PATCH | `/admin/users/:id/active` | Activate/deactivate |
| PATCH | `/admin/academic-years/:id` | Update academic year |
| GET | `/admin/teachers/pending` | Pending teacher applications |
| PATCH | `/admin/teachers/:id/status` | Approve/reject teacher |
| GET | `/admin/stats` | Platform analytics |

---

## Teacher (`/api/v1/teacher`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/teacher/students` | Enrolled students | Teacher |
| GET | `/teacher/students/:studentId/progress` | Student progress | Teacher |
| POST | `/teacher/announcements` | Broadcast announcement | Teacher |
| GET | `/teacher/revenue` | Revenue summary | Teacher |

---

## Live sessions (`/api/v1/live`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/live/sessions` | Create Zoom live session | Teacher |
| GET | `/live/sessions/subject/:subjectId` | Sessions for subject | Student |

---

## Config (`/api/v1/config`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/config` | Public app config (branding, toggles, currency, rate, homeContent) | Public |
| PUT | `/config` | Update app config | Admin |
| PATCH | `/config` | Update app config | Admin |

---

## Discussions (`/api/v1/discussions`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/discussions/courses/:courseId` | Threads for course | Bearer |
| POST | `/discussions/threads` | Create thread | Bearer |
| POST | `/discussions/threads/:id/replies` | Post reply | Bearer |

---

## AI (`/api/v1/ai`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/ai/tutor` | Gemini AI tutor Q&A | Bearer |

---

## Audit (`/api/v1/audit`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/audit` | View audit logs | Admin |

---

## Notifications (`/api/v1/notifications`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/notifications/me` | My notifications | Bearer |
| PATCH | `/notifications/:id/read` | Mark as read | Bearer |

---

## Client-side endpoint usage (summary)

The Next.js client calls these prefixes via `fetchApi`:

- Auth/profile/MFA, config, academic, subjects, courses (incl. teacher curriculum + admin review)
- videos, materials, progress
- quizzes, assignments
- teacher analytics/announcements/live
- discussions, AI tutor
- commerce (products, orders, vouchers, entitlement checks, admin queues)
- subscriptions (admin queue)
- admin (stats, teachers, users)
- audit

401 auto-refresh excludes auth endpoints (`/auth/*`).

---

## Error codes (server)

| HTTP | Meaning |
|------|---------|
| 400 | Validation / Prisma P2003 (FK) / bad request |
| 401 | Unauthenticated / invalid token |
| 403 | Forbidden role or entitlement |
| 404 | Not found / Prisma P2025 |
| 409 | Conflict / Prisma P2002 (unique) |
| 429 | Rate limit |
| 500 | Internal (message detail omitted in production) |
