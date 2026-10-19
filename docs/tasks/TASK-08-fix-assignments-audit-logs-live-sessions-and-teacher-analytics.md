# TASK-08: Fix Assignment Local Uploads, Course Review AuditLog FK, Live Session URLs & Teacher Analytics (`P1-3`, `P1-4`, `P1-6`)

- **Phase**: Phase 3 — Core Bug Fixes & UI Completion
- **Dependencies**: [TASK-07](./TASK-07-consolidate-testing-quiz-and-assignment-retire-assessment.md)
- **Estimated Effort**: 2.5–3 hours
- **Target Issue IDs**: `P1-3` (Local assignment upload path rejected by Zod `z.string().url()`), `P1-4` (`CourseService.reviewCourseStatus` passes `'ADMIN'` to `AuditLog.userId`), `P1-6` (`TeacherService` ignores `COURSE` entitlements and hardcodes revenue `students.length * 1500`), `LiveService` fake Zoom URLs

---

## 1. Objective & Problem Statement

This task resolves four high-impact backend functional bugs across Assignments, Course Governance, Live Sessions, and Teacher Analytics:

1. **Assignment Submission Rejects Local File Uploads (`P1-3`)**:
   - When Supabase is not configured, `POST /api/v1/assignments/uploads` saves files locally and returns `{ fileUrl: '/uploads/submission-files/...' }` ([`storage.ts`](../../server/src/utils/storage.ts#L139)).
   - However, `submitAssignmentSchema` in [`server/src/utils/schemas.ts`](../../server/src/utils/schemas.ts#L322) validates `files[].fileUrl` with `z.string().url()`, which rejects relative paths (`/uploads/...`) with `400 Bad Request`!
2. **Course Review `AuditLog` Foreign Key Failure (`P1-4`)**:
   - In [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts#L726-L732), `CourseService.reviewCourseStatus(courseId, action, rejectionReason)` calls:
     ```ts
     await AuditService.log({ userId: 'ADMIN', action: `COURSE_REVIEW_${action}`, ... });
     ```
   - Because `'ADMIN'` is not a valid UUID in the `users` table (`AuditLog.userId -> User.id` FK), the insert fails every time an admin reviews a course.
3. **Live Sessions Generate Fake Zoom URLs (`LiveService`)**:
   - [`server/src/modules/live/live.service.ts`](../../server/src/modules/live/live.service.ts#L22-L24) fabricates `https://zoom.us/j/zoom-${Date.now()}`, which leads to a broken Zoom page when clicked by students.
   - Instead, teachers should provide their real meeting link (`joinUrl` — e.g., Zoom, Google Meet, Microsoft Teams) when scheduling a session.
4. **Teacher Analytics Ignore Course Purchases & Hardcode Revenue (`P1-6`)**:
   - [`server/src/modules/teacher/teacher.service.ts`](../../server/src/modules/teacher/teacher.service.ts#L16-L38) only queries `Entitlement` rows where `resourceType: 'SUBJECT'`, ignoring students who bought an individual `COURSE` entitlement (`resourceType: 'COURSE'`).
   - Line 172 hardcodes `const revenueEgp = students.length * 1500` instead of summing real `PAID` `Order` rows and active `Subscription` pricing for that teacher's courses/subjects.

---

## 2. Files to Modify

| File | Action | Purpose |
| :--- | :---: | :--- |
| [`server/src/utils/schemas.ts`](../../server/src/utils/schemas.ts) | Modify | Update `submitAssignmentSchema` (`fileUrl`) to accept either a valid `http(s)://` URL or a local `/uploads/...` path; update `createLiveSessionSchema` to accept `joinUrl: z.string().url()`. |
| [`server/src/modules/courses/course.controller.ts`](../../server/src/modules/courses/course.controller.ts) | Modify | Pass `req.user!.userId` into `CourseService.reviewCourseStatus(id, status, rejectionReason, req.user!.userId)`. |
| [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts) | Modify | Accept `reviewerUserId?: string` in `reviewCourseStatus` and log the real admin `userId` in `AuditService.log`. |
| [`server/src/modules/live/live.service.ts`](../../server/src/modules/live/live.service.ts) | Modify | Store the teacher-provided `joinUrl` in `zoomJoinUrl` (with optional `startUrl`), instead of generating fake URLs. |
| [`client/src/components/teacher/LiveSessionManager.tsx`](../../client/src/components/teacher/LiveSessionManager.tsx) | Modify | Add a required "Meeting Join URL (Zoom / Google Meet / Teams)" input field to the live session creation form. |
| [`server/src/modules/teacher/teacher.service.ts`](../../server/src/modules/teacher/teacher.service.ts) | Modify | Include both `COURSE` (for `teacher.courses`) and `SUBJECT` entitlements in `getEnrolledStudents`, and compute `getRevenueSummary` from real `Order` (`status: 'PAID'`) records for the teacher's courses/subjects. |
| [`server/src/modules/assignments/__tests__/assignment.service.spec.ts`](../../server/src/modules/assignments/__tests__/assignment.service.spec.ts) | Modify | Add TDD test for submitting an assignment with a local `/uploads/submission-files/...` `fileUrl`. |
| [`server/src/modules/courses/__tests__/course.governance.spec.ts`](../../server/src/modules/courses/__tests__/course.governance.spec.ts) | Modify | Assert that `AuditLog` row is actually persisted in the DB when an admin approves/rejects a course. |
| [`server/src/modules/teacher/__tests__/teacher.integration.spec.ts`](../../server/src/modules/teacher/__tests__/teacher.integration.spec.ts) | Modify | Assert that course-level purchasers appear in `/api/v1/teacher/students` and real order amounts are summed in `/api/v1/teacher/revenue`. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Write Failing Tests First (`Red` Phase)

1. **Assignment Local Upload URL Test** (`assignment.service.spec.ts` / integration):
   - Validate `submitAssignmentSchema.parse({ submissionText: 'Done', files: [{ fileUrl: '/uploads/submission-files/123-hw.pdf', fileName: 'hw.pdf', sizeBytes: 1024 }] })`.
   - Confirm it currently throws a `ZodError` (`Invalid url`).
2. **Course Review AuditLog Persistence Test** (`course.governance.spec.ts`):
   - Admin calls `POST /api/v1/courses/:id/review` with `{ status: 'APPROVED' }`.
   - Query `prisma.auditLog.findFirst({ where: { entityId: courseId, action: 'COURSE_REVIEW_APPROVED' } })`.
   - Confirm it currently returns `null` (because `'ADMIN'` violated the `User.id` FK and was swallowed by `AuditService.log`'s catch block!).
3. **Teacher Course Entitlement & Real Revenue Test** (`teacher.integration.spec.ts`):
   - Create a paid `Product` (`productType: 'COURSE'`, `resourceId: course.id`, `priceEgp: 450`), a `PAID` `Order` (`totalAmountEgp: 450`), and a `COURSE` `Entitlement` for a student.
   - Call `GET /api/v1/teacher/students` and `GET /api/v1/teacher/revenue`.
   - Confirm the student is currently missing from `/teacher/students` and `revenueEgp` does not equal `450`.

Run the 3 specs to observe the failures (`Red`):
```bash
cd server
npx vitest run src/modules/assignments src/modules/courses/__tests__/course.governance.spec.ts src/modules/teacher
```

---

### Step 2: Implement the Fixes (`Green` Phase)

#### 2.1 Allow Relative `/uploads/...` URLs in `submitAssignmentSchema`
In [`server/src/utils/schemas.ts`](../../server/src/utils/schemas.ts#L320-L327):
```ts
const fileUrlSchema = z.string().refine(
  (val) => val.startsWith('/uploads/') || /^https?:\/\/.+/.test(val),
  { message: 'Must be a valid HTTP(S) URL or local /uploads/ path' }
);
```
Use `fileUrlSchema` for `files[].fileUrl` in `submitAssignmentSchema`.

#### 2.2 Pass Real `reviewerUserId` in `CourseService.reviewCourseStatus`
In [`server/src/modules/courses/course.controller.ts`](../../server/src/modules/courses/course.controller.ts) and [`course.service.ts`](../../server/src/modules/courses/course.service.ts#L700-L735):
- Pass `req.user?.userId` from `CourseController.reviewCourse` into `CourseService.reviewCourseStatus(id, status, rejectionReason, req.user?.userId)`.
- Only call `AuditService.log` with `userId: reviewerUserId` when `reviewerUserId` is present.

#### 2.3 Accept Real `joinUrl` in `LiveService` & `LiveSessionManager.tsx`
- In [`server/src/utils/schemas.ts`](../../server/src/utils/schemas.ts): Add `joinUrl: z.string().url().optional()` to `createLiveSessionSchema` (defaulting to a required field in the UI while keeping backward compatibility if omitted in legacy tests).
- In [`server/src/modules/live/live.service.ts`](../../server/src/modules/live/live.service.ts): Use `data.joinUrl` for `zoomJoinUrl` and `zoomStartUrl` when provided.
- In [`client/src/components/teacher/LiveSessionManager.tsx`](../../client/src/components/teacher/LiveSessionManager.tsx): Add the `joinUrl` input field to the form and pass it in `POST /live/sessions`.

#### 2.4 Fix `TeacherService.getEnrolledStudents` and `getRevenueSummary`
In [`server/src/modules/teacher/teacher.service.ts`](../../server/src/modules/teacher/teacher.service.ts):
1. Fetch the teacher's courses (`id` and `subjectId`).
2. Query active `Entitlement` rows where:
   ```ts
   OR: [
     { resourceType: 'SUBJECT', resourceId: { in: subjectIds } },
     { resourceType: 'COURSE', resourceId: { in: courseIds } },
   ]
   ```
   plus active `Subscription` rows where `subjectId: { in: subjectIds }`.
3. In `getRevenueSummary(teacherId)`:
   - Sum `totalAmountEgp` and `totalAmountUsd` from `prisma.order.findMany` where `status: 'PAID'` and `product` matches `(productType: 'COURSE', resourceId: { in: courseIds })` or `(productType: 'SUBJECT', resourceId: { in: subjectIds })`.

---

### Step 3: Refactor & Cleanup (`Refactor` Phase)

Run all backend and frontend tests and verify no regressions in `live`, `teacher`, `courses`, or `assignments`.

---

## 4. Code Review Checklist

- [x] Can a student upload a local file via `POST /api/v1/assignments/uploads` and submit the returned `/uploads/submission-files/...` URL to `POST /api/v1/assignments/:id/submit` without a Zod error?
- [x] Does `POST /api/v1/courses/:id/review` create a valid `AuditLog` row linked to the reviewing Admin's `userId`?
- [x] Can a teacher enter a real Zoom / Google Meet / Teams URL in `LiveSessionManager.tsx`?
- [x] Does `TeacherService` include students with `COURSE`-level entitlements and compute revenue from actual `PAID` orders?

---

## 5. Verification & Test Commands

```bash
cd server
npx vitest run src/modules/assignments src/modules/courses/__tests__/course.governance.spec.ts src/modules/teacher src/modules/live
npm run typecheck
npm test

cd ../client
npm run typecheck
npm run lint
npm run build
```
