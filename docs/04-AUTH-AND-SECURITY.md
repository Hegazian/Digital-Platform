# 04 — Auth, RBAC, Entitlements & Security

## Token Architecture

| Token | Lifetime (Default) | Secret | Transport |
| :--- | :--- | :--- | :--- |
| **Access JWT** | `15m` (`JWT_EXPIRES_IN`) | `JWT_SECRET` | `Authorization: Bearer <token>` |
| **Refresh JWT** | `7d` (`JWT_REFRESH_EXPIRES_IN`) | `JWT_REFRESH_SECRET` | `httpOnly` cookie **`eduplat_rt`** (also accepted in request body) |
| **MFA Challenge JWT** | `5m` | `JWT_SECRET` | Returned by `/auth/login` when `mfaEnabled=true`; carries `purpose: 'mfa_challenge'` |

Refresh tokens carry a unique `jti` UUID. Every issued refresh token's **SHA-256 hash** is stored in the `RefreshToken` table (`tokenHash @unique`), enabling server-side session revocation and token-family theft detection.

Production startup (`src/utils/env.ts`) **fails fast** if `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PAYMOB_HMAC_SECRET`, or `FAWRY_SECRET_KEY` are missing or shorter than 32 characters.

---

## Login & TOTP MFA Flow

Implemented in [`server/src/modules/auth/auth.service.ts`](../server/src/modules/auth/auth.service.ts):

1. Look up user by email; reject if missing, `isActive=false`, or `role === 'TEACHER'` with `teacherStatus !== 'APPROVED'`.
2. Verify password via `bcrypt.compare`.
3. If `mfaEnabled && mfaSecret`: return `{ mfaRequired: true, mfaSessionToken }` (`purpose: 'mfa_challenge'`).
4. `POST /api/v1/auth/mfa-login` verifies the 6-digit TOTP code (`src/utils/totp.ts`) and updates `User.mfaLastTimeStep` to block replay attacks within the same 30-second window.
5. Issue access + refresh tokens and persist the hashed `RefreshToken` record.

> **Current UI Note**: While backend MFA endpoints (`/api/v1/mfa/setup`, `/api/v1/mfa/verify`) and `/login` MFA challenge verification are complete, [`MfaSetupModal.tsx`](../client/src/components/settings/MfaSetupModal.tsx) is currently unmounted in `/profile/page.tsx`.

---

## Refresh Token Rotation & Reuse Detection

In `AuthService.refreshToken`:
1. Verify refresh JWT signature and look up `RefreshToken` by SHA-256 `tokenHash`.
2. Reject if not found, expired, or user is inactive.
3. **Reuse Detection**: If `revokedAt` is already set on the presented token, the server immediately calls `revokeAllForUser(userId)` to invalidate the entire token family and force re-authentication.
4. Otherwise, atomically mark the old token `revokedAt = new Date()` and insert a new `RefreshToken` row.

---

## RBAC Middleware (`auth.middleware.ts`)

| Middleware | Behavior |
| :--- | :--- |
| `authenticate` | Verifies Bearer JWT, rejects `mfa_challenge` tokens, checks `user.isActive` (cached 30s in memory), and populates `req.user`. |
| `optionalAuth` | Parses Bearer JWT if valid; falls back to anonymous (`req.user = undefined`) without throwing on missing/expired tokens. |
| `requireRole(roles, allowAdminBypass=true)` | Enforces role membership; `ADMIN` bypasses by default unless `allowAdminBypass=false` (used on student checkout/subscription/voucher routes). |
| `requireApprovedTeacher` | Allows `ADMIN` or `TEACHER` with `teacherStatus === 'APPROVED'`. |
| `invalidateActivationCache(userId)` | Evicts user from the 30s activation cache immediately when an admin deactivates an account. |

---

## Entitlements & Learning Access (`entitlement-resolver.service.ts`)

### Entitlement Hierarchy
`EntitlementResolver.hasCourseAccess(studentId, courseId)` and `EntitlementResolver.hasLessonAccess(studentId, lessonId)` grant access if any of the following hold:
1. Course has `isFree === true` (or the specific lesson belongs to a `Section` with `isFreePreview === true`).
2. Active `Entitlement` with `resourceType: 'COURSE'` and `resourceId: courseId`.
3. Active `Entitlement` or `Subscription` for the course's parent `Subject` (`resourceType: 'SUBJECT'`).
4. Active `Entitlement` for the course's `Grade` (`resourceType: 'GRADE_BUNDLE'`).

---

## Security Controls & Remediations (Tracked in `08-GAP-LOG.md`)

1. **Protected Media & Material Downloads (`P0-1` — ✅ Resolved in TASK-01)**:
   - `CourseService.getAllCourses` and `CourseService.getCourseById` strip `lessons.video.videoUrl` and `lessons.materials.fileUrl` for un-enrolled/anonymous callers on non-preview lessons.
   - `app.ts` blocks direct unauthenticated static access (`403 Forbidden`) to `/uploads/lesson-videos` and `/uploads/lesson-materials`.
   - `GET /api/v1/materials/:id/download` enforces course/lesson entitlement before returning material download URLs.
2. **Quiz Answer Key & Ownership Lockdown (`P0-2` — ✅ Resolved in TASK-02)**:
   - `CourseService.sanitizeCourseContent` strips `Question.correctAnswer`, `Question.explanation`, and `options[].isCorrect`.
   - `QuizService.getQuizById` (`GET /api/v1/quizzes/:id`) enforces teacher ownership (`EntitlementResolver.getQuizOwnerTeacherId`) and student course entitlement (`EntitlementResolver.hasLessonAccess`), stripping answer keys for all students.
3. **Host Python Subprocess Execution (`P0-3` — ✅ Resolved in TASK-04)**:
   - Removed `playground.controller.ts`, `playground.routes.ts`, `board.controller.ts`, `board.routes.ts`, and the `Playground` / `Board` Prisma models, completely eliminating host OS `child_process.spawn('python')` execution.
4. **Disk Streaming Video Uploads (`P0-4` — ✅ Resolved in TASK-03)**:
   - `video.routes.ts` uses `multer.diskStorage()` streaming to `.tmp` with automatic cleanup in `finally`, eliminating 500MB V8 heap OOM risks.
5. **Edge Middleware & Rich-Text Sanitization (`P0-5` — ✅ Resolved in TASK-03)**:
   - `client/src/middleware.ts` validates JWT `exp` timestamps, enforces strict role whitelists (`STUDENT | TEACHER | ADMIN`), and deletes expired/invalid `eduplat_rt` cookies.
   - `TiptapEditor.tsx` sanitizes HTML via `DOMPurify.sanitize` (`isomorphic-dompurify`) before rendering `dangerouslySetInnerHTML`.
