# TASK-07: Consolidate Testing onto Auto-Graded `Quiz` + Teacher-Graded `Assignment` (Retire `Assessment`)

- **Phase**: Phase 2 — Codebase Simplification & Schema Consolidation
- **Dependencies**: [TASK-06](./TASK-06-unify-curriculum-onto-section-drop-course-module.md)
- **Estimated Effort**: 2–2.5 hours
- **Target Issue IDs**: `P1-5` (`Quiz` essay attempts stuck in `AWAITING_REVIEW` forever; `Assessment` essay auto-grading bug & unmounted `AssessmentRunner.tsx`), Simplification Decision 2

---

## 1. Objective & Architectural Rationale

1. **Eliminate Duplicate Testing Engines (`Assessment` vs `Quiz`)**:
   - The `assessment` module (`QuestionPool`, `QuestionItem`, `Assessment`, `AssessmentAttempt`) is a second quiz engine whose student component ([`AssessmentRunner.tsx`](../../client/src/components/player/AssessmentRunner.tsx)) is **not mounted anywhere in the app** and whose essay grading compares student text against `"undefined"` ([`assessment.service.ts`](../../server/src/modules/assessment/assessment.service.ts#L345)).
2. **Eliminate the Quiz `AWAITING_REVIEW` Dead-End**:
   - In [`server/src/modules/quizzes/quiz.service.ts`](../../server/src/modules/quizzes/quiz.service.ts#L381), if a quiz contains a question of type `ESSAY`, submitting an attempt sets `status: 'AWAITING_REVIEW'` and `isPassed: false`, with **no endpoint or UI for teachers to grade it**.
   - Meanwhile, the `assignments` module (`Assignment` / `AssignmentSubmission`) is specifically built for open-ended text/file submissions and already has a complete teacher grading endpoint (`POST /api/v1/assignments/submissions/:submissionId/grade`) and UI ([`AssignmentStudio.tsx`](../../client/src/components/teacher/AssignmentStudio.tsx)).
3. **Simplification Outcome**:
   - Delete the redundant `assessment` module (4 Prisma models, backend module, `AssessmentBuilder.tsx`, `AssessmentRunner.tsx`).
   - Restrict `QuizQuestionType` to the **4 deterministic auto-graded question types**: `MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, and `SHORT_ANSWER` (case-insensitive trimmed match), removing `ESSAY` and `AttemptStatus.AWAITING_REVIEW` so 100% of quiz submissions are immediately and accurately scored.

---

## 2. Files to Delete & Modify

### Files & Directories to Delete
- `server/src/modules/assessment/` (entire directory including `__tests__/`)
- `client/src/components/teacher/AssessmentBuilder.tsx`
- `client/src/components/player/AssessmentRunner.tsx`

### Files to Modify
| File | Action | Purpose |
| :--- | :---: | :--- |
| [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma) | Modify | Delete `QuestionPool`, `QuestionItem`, `Assessment`, `AssessmentAttempt` models and `QuestionType`, `QuestionDifficulty`, `AssessmentAttemptStatus` enums; remove `assessmentAttempts` from `User`; remove `ESSAY` from `QuizQuestionType` and `AWAITING_REVIEW` from `AttemptStatus`. |
| [`server/src/app.ts`](../../server/src/app.ts) | Modify | Remove `/api/v1/assessment` route mount and import. |
| [`server/src/utils/schemas.ts`](../../server/src/utils/schemas.ts) | Modify | Remove `ESSAY` from `quizQuestionSchema` and delete assessment schemas (`createQuestionPoolSchema`, `createQuestionItemSchema`, `createAssessmentSchema`, `submitAssessmentAttemptSchema`). |
| [`server/src/modules/quizzes/quiz.service.ts`](../../server/src/modules/quizzes/quiz.service.ts) | Modify | Remove `ESSAY` / `AWAITING_REVIEW` branching in `submitAttempt` so all attempts complete with a final deterministic score. |
| [`client/src/components/TeacherDashboard.tsx`](../../client/src/components/TeacherDashboard.tsx) | Modify | Remove `AssessmentBuilder` tab/import. |
| [`client/src/components/teacher/CourseManager.tsx`](../../client/src/components/teacher/CourseManager.tsx) | Modify | Remove `ESSAY` option from quiz question type selector (directing teachers to use Lesson Assignments for written/file work). |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Write/Update Tests First (`Red` Phase)

1. Delete `server/src/modules/assessment/`.
2. In [`server/src/modules/quizzes/__tests__/quiz.service.spec.ts`](../../server/src/modules/quizzes/__tests__/quiz.service.spec.ts) and [`quiz.v2.spec.ts`](../../server/src/modules/quizzes/__tests__/quiz.v2.spec.ts):
   - Verify that `MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, and `SHORT_ANSWER` (case-insensitive, whitespace-trimmed) questions are auto-graded to `status: 'COMPLETED'` immediately upon submission.
   - Add a validation test asserting that creating a quiz question with `type: 'ESSAY'` is rejected with `400 Bad Request` by Zod validation.

Run the quiz test suite:
```bash
cd server
npx vitest run src/modules/quizzes
```

---

### Step 2: Apply Schema, Backend & Frontend Changes (`Green` Phase)

1. In [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma):
   - Remove `QuestionPool`, `QuestionItem`, `Assessment`, `AssessmentAttempt` and their enums.
   - Update `enum QuizQuestionType` to:
     ```prisma
     enum QuizQuestionType {
       MCQ
       TRUE_FALSE
       MULTIPLE_SELECT
       SHORT_ANSWER
     }
     ```
   - Update `enum AttemptStatus` to:
     ```prisma
     enum AttemptStatus {
       IN_PROGRESS
       COMPLETED
     }
     ```
2. In [`server/src/modules/quizzes/quiz.service.ts`](../../server/src/modules/quizzes/quiz.service.ts):
   - Simplify `submitAttempt` so every question is scored deterministically (`MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, `SHORT_ANSWER`), `status` is always set to `'COMPLETED'`, and `isPassed = percentageScore >= quiz.passingScore`.
3. Remove `AssessmentBuilder.tsx` from [`TeacherDashboard.tsx`](../../client/src/components/TeacherDashboard.tsx) and delete `AssessmentBuilder.tsx` and `AssessmentRunner.tsx`.

---

### Step 3: Refactor & Cleanup (`Refactor` Phase)

Push the updated Prisma schema to dev and test databases (`npm run db:push` and `npm run db:push:test`) and verify no references to `/assessment` remain in `server/` or `client/`.

---

## 4. Code Review Checklist

- [x] Are `QuestionPool`, `QuestionItem`, `Assessment`, and `AssessmentAttempt` removed from `schema.prisma`?
- [x] Does `QuizService.submitAttempt` deterministically auto-grade `MCQ`, `TRUE_FALSE`, `MULTIPLE_SELECT`, and `SHORT_ANSWER` (ignoring leading/trailing whitespace and casing on `SHORT_ANSWER`)?
- [x] Are `AssessmentBuilder.tsx` and `AssessmentRunner.tsx` deleted and removed from `TeacherDashboard.tsx`?
- [x] Are `CreateLessonModal.tsx`, `EditLessonModal.tsx`, and `InteractiveQuizRunner.tsx` updated to remove `ESSAY` and route open-ended submissions to Assignments?
- [x] Are 100% of server tests (55 files, 313 tests) passing cleanly?
- [x] Are client typecheck, lint, and build 100% clean?

---

## 5. Verification & Test Commands

```bash
cd server
npm run db:push:test
npx vitest run src/modules/quizzes
npm run typecheck
npm test

cd ../client
npm run typecheck
npm run lint
npm run build
```
