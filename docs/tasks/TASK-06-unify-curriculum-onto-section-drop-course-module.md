# TASK-06: Unify Curriculum Hierarchy onto `Section` → `Lesson` (Retire `CourseModule`)

- **Phase**: Phase 2 — Codebase Simplification & Schema Consolidation
- **Dependencies**: [TASK-05](./TASK-05-prune-peripheral-modules-developer-podcasts-collections-careers.md)
- **Estimated Effort**: 2.5–3 hours
- **Target Issue IDs**: Simplification Decision 1 (Dual curriculum `CourseModule` vs. `Section` consolidation)

---

## 1. Objective & Architectural Rationale

1. **Eliminate Dual Curriculum Trees**:
   - Currently, [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma#L204-L246) defines both `CourseModule` (`course_modules`) and `Section` (`sections`) as parent containers of `Lesson`.
   - `Lesson` has two optional foreign keys (`sectionId String?` and `moduleId String?`).
   - Only `Section` supports `isFreePreview: Boolean`, which is a core requirement for allowing students to preview the first chapter of a paid course.
   - Maintaining both `CourseModule` and `Section` forces [`course.service.ts`](../../server/src/modules/courses/course.service.ts), [`entitlement-resolver.service.ts`](../../server/src/modules/commerce/entitlement-resolver.service.ts), and the frontend player/builder to branch on `lesson.section || lesson.module` everywhere.
2. **Simplification Outcome**:
   - Standardize 100% on **`Course` → `Section` → `Lesson` → `LessonBlock`**.
   - Remove `CourseModule` and `Lesson.moduleId`. Make `Lesson.sectionId` the sole parent foreign key (`onDelete: Cascade`).

---

## 2. Files to Modify & Delete

| File | Action | Purpose |
| :--- | :---: | :--- |
| [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma) | Modify | Delete `model CourseModule`; remove `modules CourseModule[]` from `Course`; remove `moduleId` and `module` from `Lesson`; make `sectionId` required on `Lesson` (with `onDelete: Cascade` on `Section.course` and `Lesson.section`). |
| [`server/prisma/seed.ts`](../../server/prisma/seed.ts) | Modify | Ensure any seeded lessons are created under `Section` (`sections`) rather than `CourseModule`. |
| [`server/src/modules/courses/course.routes.ts`](../../server/src/modules/courses/course.routes.ts) | Modify | Remove `/courses/:courseId/modules`, `/courses/modules/:moduleId`, `/courses/:courseId/modules/reorder`, and `/courses/modules/:moduleId/lessons` routes. |
| [`server/src/modules/courses/course.controller.ts`](../../server/src/modules/courses/course.controller.ts) | Modify | Remove `createModule`, `updateModule`, `deleteModule`, `reorderModules`, and `createModuleLesson` controller handlers. |
| [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts) | Modify | Remove all `CourseModule` methods and `modules` query includes, standardizing all lesson queries, reordering, and sanitization on `sections`. |
| [`server/src/modules/commerce/entitlement-resolver.service.ts`](../../server/src/modules/commerce/entitlement-resolver.service.ts) | Modify | Simplify `hasLessonAccess` and teacher ownership lookups to traverse `lesson.section.course` only. |
| [`client/src/components/teacher/CourseManager.tsx`](../../client/src/components/teacher/CourseManager.tsx) | Modify | Ensure all curriculum CRUD calls `/courses/:courseId/sections` and `/courses/sections/:sectionId/lessons`. |
| [`client/src/app/courses/[courseId]/page.tsx`](../../client/src/app/courses/%5BcourseId%5D/page.tsx) | Modify | Read curriculum strictly from `course.sections`. |
| `server/src/modules/courses/__tests__/curriculum-unification.spec.ts` | Modify / Replace | Update specs to test `Section` → `Lesson` hierarchy exclusively. |
| `server/src/modules/courses/__tests__/module-lesson.integration.spec.ts` | Modify | Update test helper routes from `/modules` to `/sections`. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Write/Update Tests First (`Red` Phase)

1. In [`server/src/modules/courses/__tests__/section.integration.spec.ts`](../../server/src/modules/courses/__tests__/section.integration.spec.ts):
   - Add tests verifying full CRUD + reordering + `isFreePreview` access on `Section` → `Lesson` → `LessonBlock`, including cascading deletion when a `Section` or `Course` is deleted.
2. Update any existing test files in `server/src/modules/*/__tests__/` that create test lessons via `prisma.courseModule.create` or `POST /api/v1/courses/:courseId/modules` to use `prisma.section.create` / `POST /api/v1/courses/:courseId/sections`.

---

### Step 2: Implement Schema & Service Consolidation (`Green` Phase)

#### 2.1 Update `server/prisma/schema.prisma`
```prisma
model Section {
  id            String   @id @default(uuid())
  courseId      String   @map("course_id")
  titleEn       String   @map("title_en")
  titleAr       String   @map("title_ar")
  description   String?  @db.Text
  orderIndex    Int      @default(0) @map("order_index")
  isFreePreview Boolean  @default(false) @map("is_free_preview")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  course  Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons Lesson[]

  @@index([courseId])
  @@map("sections")
}
```
And in `model Lesson`:
- Remove `moduleId` and `module`.
- Make `sectionId String @map("section_id")` and `section Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)`.

#### 2.2 Simplify `CourseService` & `EntitlementResolver`
- In [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts):
  - Remove `modules` from `include` blocks in `getAllCourses`, `getCourseById`, and `submitCourseForReview`.
  - In `submitCourseForReview`, validate that `course.sections` has at least 1 section with at least 1 lesson.
- In [`server/src/modules/commerce/entitlement-resolver.service.ts`](../../server/src/modules/commerce/entitlement-resolver.service.ts):
  - Simplify `hasLessonAccess(studentId, lessonId)` to check `lesson.section.isFreePreview || lesson.section.course.isFree || hasCourseAccess(studentId, lesson.section.courseId)`.

---

### Step 3: Refactor & Cleanup (`Refactor` Phase)

Search for `courseModule` and `moduleId` across `server/` and `client/` (`rg "courseModule|moduleId"`) to verify zero remaining references.

---

## 4. Code Review Checklist

- [x] Is `CourseModule` completely removed from `schema.prisma`?
- [x] Does `Section` support optional `description`, `orderIndex`, `isFreePreview`, and cascade delete on `courseId`?
- [x] Does `Lesson` require `sectionId` with `onDelete: Cascade`?
- [x] Does `EntitlementResolver.hasLessonAccess` grant access when `lesson.section.isFreePreview === true`?
- [x] Does the frontend `CourseManager.tsx` and course player `/courses/[courseId]` work exclusively with `course.sections`?
- [x] Are 100% of server tests (57 files, 320 tests) passing cleanly?
- [x] Are client typecheck, lint, and build 100% clean?

---

## 5. Verification & Test Commands

```bash
cd server
npm run db:reset:test
npm run typecheck
npm test

cd ../client
npm run typecheck
npm run lint
npm run build
```
