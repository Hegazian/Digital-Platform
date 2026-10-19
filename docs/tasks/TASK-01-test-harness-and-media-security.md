# TASK-01: Fix Test Harness Secrets & Lock Down Course Media Leaks (`P0-1`)

- **Phase**: Phase 1 — Test Harness & P0 Security Remediation
- **Dependencies**: None (First task in sequence)
- **Estimated Effort**: 2–3 hours
- **Target Issue IDs**: `P0-1` (Media URL leak in public catalog & unauthenticated `/uploads` static mount), `P2-3` (`tests/setup.ts` secret override)

---

## 1. Objective & Problem Statement

1. **Test Harness Bug (`server/tests/setup.ts`)**:
   - Lines 8–9 hardcode `process.env.JWT_SECRET = 'test_secret'` (11 chars) and `process.env.JWT_REFRESH_SECRET = 'test_refresh_secret'` (19 chars) *after* `dotenv.config({ path: '.env.test', override: true })`, overwriting the 32+ character secrets defined in `server/.env.test`.
2. **Paid Video & Material URL Exposure (`server/src/modules/courses/course.service.ts`)**:
   - `CourseService.getAllCourses` (lines 95–111) and `CourseService.getCourseById` (lines 161–193) include `video: true` and `materials: true` on every lesson, returning raw `video.videoUrl` and `materials[].fileUrl` to anonymous visitors and un-enrolled students.
   - `CourseService.sanitizeCourseContent` (lines 13–32) strips quiz `isCorrect` flags for non-teachers, but **never strips `video.videoUrl` or `materials[].fileUrl`**.
3. **Unauthenticated Static Media Serving (`server/src/app.ts`)**:
   - Line 72 mounts `app.use('/uploads', express.static(getUploadsRoot()))` before authentication. Any user who obtains a `/uploads/lesson-videos/...` or `/uploads/lesson-materials/...` path can download paid course files without an entitlement.

---

## 2. Files to Modify

| File | Action | Purpose |
| :--- | :---: | :--- |
| [`server/tests/setup.ts`](../../server/tests/setup.ts) | Modify | Use fallback `||=` with ≥32-char secrets so `.env.test` is respected. |
| [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts) | Modify | Strip `video.videoUrl` and `materials[].fileUrl` for un-entitled callers (unless course `isFree` or section `isFreePreview`). |
| [`server/src/modules/materials/material.routes.ts`](../../server/src/modules/materials/material.routes.ts) | Modify | Add `GET /api/v1/materials/:id/download` protected by `authenticate` and entitlement check. |
| [`server/src/modules/materials/material.controller.ts`](../../server/src/modules/materials/material.controller.ts) | Modify | Implement `downloadMaterial` controller action. |
| [`server/src/modules/materials/material.service.ts`](../../server/src/modules/materials/material.service.ts) | Modify | Verify `EntitlementResolver.hasLessonAccess` (or teacher/admin ownership) before returning signed URL or streaming local file. |
| [`server/src/app.ts`](../../server/src/app.ts) | Modify | Restrict `/uploads` static middleware so `/uploads/lesson-videos` and `/uploads/lesson-materials` cannot be bypassed directly without going through `/api/v1/videos/:id/stream` or `/api/v1/materials/:id/download`. |
| [`server/src/modules/courses/__tests__/course.visibility.spec.ts`](../../server/src/modules/courses/__tests__/course.visibility.spec.ts) | Modify | Add TDD security regression tests for media URL sanitization. |
| [`server/src/modules/materials/__tests__/material.integration.spec.ts`](../../server/src/modules/materials/__tests__/material.integration.spec.ts) | Modify | Add TDD tests for gated material download and `/uploads` direct access denial. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Write Failing Tests First (`Red` Phase)

1. In [`server/src/modules/courses/__tests__/course.visibility.spec.ts`](../../server/src/modules/courses/__tests__/course.visibility.spec.ts), add a `describe('Media URL Sanitization (P0-1)', ...)` block that:
   - Creates a paid published course (`isFree: false`) with a non-preview section (`isFreePreview: false`), a lesson, an attached `Video` (`videoUrl: '/uploads/lesson-videos/secret.mp4'`), and a `Material` (`fileUrl: '/uploads/lesson-materials/secret.pdf'`).
   - **Test Case 1**: Calls `GET /api/v1/courses` and `GET /api/v1/courses/:id` as an anonymous user and as an un-enrolled `STUDENT`.
   - **Expected Assertion**: `lesson.video.id` is present (so the player knows a video exists), but `lesson.video.videoUrl` is `undefined` (or `null`), and `lesson.materials[0].fileUrl` is `undefined`.
   - **Test Case 2**: Grants the student an active course `Entitlement` and calls `GET /api/v1/courses/:id`.
   - **Expected Assertion**: Entitled student receives metadata, and can fetch `/api/v1/videos/:videoId/playback-url` (`200 OK`) and `/api/v1/materials/:materialId/download` (`200 OK`).
2. In [`server/src/modules/materials/__tests__/material.integration.spec.ts`](../../server/src/modules/materials/__tests__/material.integration.spec.ts):
   - **Test Case 3**: Calls `GET /uploads/lesson-videos/secret.mp4` and `GET /uploads/lesson-materials/secret.pdf` directly without a signed token.
   - **Expected Assertion**: Returns `403 Forbidden` or `404 Not Found`.
   - **Test Case 4**: Calls `GET /api/v1/materials/:id/download` as an un-enrolled student (`403 Forbidden`) vs. an entitled student (`200 OK`).

Run the tests to confirm they fail (`Red`):
```bash
cd server
npx vitest run src/modules/courses/__tests__/course.visibility.spec.ts src/modules/materials/__tests__/material.integration.spec.ts
```

---

### Step 2: Implement the Fixes (`Green` Phase)

#### 2.1 Fix `server/tests/setup.ts`
Replace lines 7–9 in [`server/tests/setup.ts`](../../server/tests/setup.ts):
```ts
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test_jwt_secret_at_least_32_characters_long_12345';
process.env.JWT_REFRESH_SECRET ||= 'test_refresh_secret_at_least_32_characters_12345';
```

#### 2.2 Sanitize `videoUrl` and `fileUrl` in `CourseService`
In [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts):
- Update `sanitizeCourseContent(course: any, hasFullAccess: boolean)` so that when `hasFullAccess` is `false`:
  - For every lesson in `course.sections` (where `!section.isFreePreview` and `!course.isFree`) and `course.modules` (where `!course.isFree`):
    - If `lesson.video` exists, omit `videoUrl` (`const { videoUrl, ...safeVideo } = lesson.video`).
    - If `lesson.materials` exists, map each material to omit `fileUrl` (`const { fileUrl, ...safeMaterial } = m`).
- In `getCourseById(id: string, user?: { userId: string; role: string })`:
  - Determine `hasFullAccess` as:
    - `user?.role === 'ADMIN'`
    - OR `(user?.role === 'TEACHER' && course.teacherId === user.userId)`
    - OR `course.isFree === true`
    - OR `(user?.userId ? await EntitlementResolver.hasCourseAccess(user.userId, course.id) : false)`
  - Pass `hasFullAccess` to `sanitizeCourseContent(course, hasFullAccess)`.
- In `getAllCourses`:
  - Always sanitize nested lesson media (`sanitizeCourseContent(course, false)`) on catalog list responses so catalog payloads remain lightweight and never leak paid URLs.

#### 2.3 Add Entitlement-Gated Material Download (`GET /api/v1/materials/:id/download`)
In [`server/src/modules/materials/material.service.ts`](../../server/src/modules/materials/material.service.ts):
- Add `getMaterialDownload(materialId: string, user: { userId: string; role: string })`:
  1. Look up `material` with `lesson.section.course` and `lesson.module.course`.
  2. If `user.role !== 'ADMIN'` and `course.teacherId !== user.userId`:
     - Check if `course.isFree` or `lesson.section?.isFreePreview` or `await EntitlementResolver.hasCourseAccess(user.userId, course.id)`.
     - If false, throw `new ForbiddenError('Active entitlement required to download lesson material')`.
  3. Return resolved file path or signed Supabase URL.

#### 2.4 Block Direct Unauthenticated Static Access to Paid Media in `server/src/app.ts`
In [`server/src/app.ts`](../../server/src/app.ts#L72):
- Replace the blanket `app.use('/uploads', express.static(getUploadsRoot()))` with a guarded middleware that blocks `/uploads/lesson-videos/*` and `/uploads/lesson-materials/*` from direct unauthenticated static serving (returning `403 Forbidden`), allowing only public assets (like avatars/thumbnails) or routing lesson media strictly through `/api/v1/videos/:videoId/stream` and `/api/v1/materials/:id/download`.

---

### Step 3: Refactor & Verify (`Refactor` Phase)

Update [`client/src/components/player/LessonMaterialList.tsx`](../../client/src/components/player/LessonMaterialList.tsx) and [`client/src/components/player/PDFDocumentViewer.tsx`](../../client/src/components/player/PDFDocumentViewer.tsx) if needed so they request the material via `/api/v1/materials/:id/download` when `fileUrl` is gated.

---

## 4. Code Review Checklist

- [x] Does `server/tests/setup.ts` preserve 32+ character secrets from `.env.test`?
- [x] Does `GET /api/v1/courses` (anonymous or student) strip `video.videoUrl` and `materials[].fileUrl` from non-preview lessons of paid courses?
- [x] Does `GET /api/v1/courses/:id` allow free-preview section lessons (`section.isFreePreview === true`) and free courses (`course.isFree === true`) to remain accessible while stripping non-preview lessons for un-enrolled students?
- [x] Does `GET /uploads/lesson-videos/<any-file>` return `403` when requested directly?
- [x] Does `GET /api/v1/materials/:id/download` enforce `EntitlementResolver.hasCourseAccess` for students and ownership for teachers?

---

## 5. Verification & Test Commands (Verified: 100% Pass)

```bash
# 1. Run targeted security & material specs
cd server
npx vitest run src/modules/courses/__tests__/course.visibility.spec.ts
npx vitest run src/modules/materials/__tests__/material.integration.spec.ts
npx vitest run src/modules/videos/__tests__/video-playback.spec.ts

# 2. Run full backend test suite & typecheck
npm run typecheck
npm test
```
