# TASK-02: Lock Down Quiz Answer Keys & Ownership (`P0-2`)

- **Phase**: Phase 1 — Test Harness & P0 Security Remediation
- **Dependencies**: [TASK-01](./TASK-01-test-harness-and-media-security.md)
- **Estimated Effort**: 1.5–2 hours
- **Target Issue IDs**: `P0-2` (`SHORT_ANSWER` `correctAnswer` leaked in course payload; cross-teacher quiz access & missing student entitlement check in `GET /api/v1/quizzes/:id`)

---

## 1. Objective & Problem Statement

1. **`SHORT_ANSWER` Answer Key Leak in `CourseService.sanitizeCourseContent`**:
   - In [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts#L13-L32), `sanitizeQuiz` strips `isCorrect` from `q.options`, but **does not strip `q.correctAnswer`**, which holds the plaintext answer key for `SHORT_ANSWER` questions!
2. **Broken Authorization & Missing Entitlement Check in `QuizController.getQuiz`**:
   - In [`server/src/modules/quizzes/quiz.controller.ts`](../../server/src/modules/quizzes/quiz.controller.ts#L36-L45):
     ```ts
     const isTeacher = req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';
     const quiz = await QuizService.getQuizById(id as string, isTeacher);
     ```
   - **Bug A (Cross-Teacher Leak)**: Any logged-in `TEACHER` (even one who does *not* own the course) gets `isTeacher = true` and receives the full un-sanitized answer key (`isCorrect` and `correctAnswer`) for any other teacher's quiz.
   - **Bug B (Un-entitled Student Access)**: [`quiz.routes.ts`](../../server/src/modules/quizzes/quiz.routes.ts#L19) mounts `GET /:id` with only `authenticate` (no `assertLearningAccess` or service-level entitlement check), allowing any registered student to fetch the questions of a paid course's quiz without purchasing the course.

---

## 2. Files to Modify

| File | Action | Purpose |
| :--- | :---: | :--- |
| [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts) | Modify | Strip `correctAnswer` alongside `options[].isCorrect` in `sanitizeCourseContent`. |
| [`server/src/modules/quizzes/quiz.service.ts`](../../server/src/modules/quizzes/quiz.service.ts) | Modify | Update `getQuizById` to accept `viewer?: { userId: string; role: string }`, verify teacher ownership via `EntitlementResolver.getQuizOwnerTeacherId(id)`, and verify student entitlement via `EntitlementResolver.hasLessonAccess`. |
| [`server/src/modules/quizzes/quiz.controller.ts`](../../server/src/modules/quizzes/quiz.controller.ts) | Modify | Pass `req.user` into `QuizService.getQuizById(id, req.user)`. |
| [`server/src/modules/quizzes/__tests__/quiz.integration.spec.ts`](../../server/src/modules/quizzes/__tests__/quiz.integration.spec.ts) | Modify | Add TDD regression tests for `SHORT_ANSWER` sanitization, cross-teacher access, and un-entitled student access. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Write Failing Tests First (`Red` Phase)

In [`server/src/modules/quizzes/__tests__/quiz.integration.spec.ts`](../../server/src/modules/quizzes/__tests__/quiz.integration.spec.ts), add a `describe('Quiz Answer Key & Entitlement Security (P0-2)', ...)` suite:

1. **Setup**:
   - Teacher A creates a paid course (`isFree: false`), a section (`isFreePreview: false`), a lesson, and a Quiz containing both an `MCQ` question (`options: [{ id: '1', text: 'A', isCorrect: true }]`) and a `SHORT_ANSWER` question (`correctAnswer: '42'`).
   - Teacher B is another approved teacher (`role: 'TEACHER'`).
   - Student U is an un-enrolled student; Student E is an entitled student.
2. **Test Case 1 (Course Detail Sanitization)**:
   - Student E calls `GET /api/v1/courses/:courseId`.
   - **Assert**: `quiz.questions` has neither `options[0].isCorrect` nor `correctAnswer`.
3. **Test Case 2 (Un-entitled Student Blocked on `GET /api/v1/quizzes/:id`)**:
   - Student U calls `GET /api/v1/quizzes/:quizId`.
   - **Assert**: Returns `403 Forbidden`.
4. **Test Case 3 (Entitled Student Receives Sanitized Quiz on `GET /api/v1/quizzes/:id`)**:
   - Student E calls `GET /api/v1/quizzes/:quizId`.
   - **Assert**: Returns `200 OK`, and for every question, `correctAnswer` is `undefined`, `explanation` is `undefined`, and `options[].isCorrect` is `undefined`.
5. **Test Case 4 (Other Teacher Blocked or Sanitized on `GET /api/v1/quizzes/:id`)**:
   - Teacher B calls `GET /api/v1/quizzes/:quizId`.
   - **Assert**: Returns `403 Forbidden` (Teacher B does not own Teacher A's course).
6. **Test Case 5 (Owning Teacher & Admin Receive Full Answer Key)**:
   - Teacher A and Admin call `GET /api/v1/quizzes/:quizId`.
   - **Assert**: Returns `200 OK` with `options[0].isCorrect === true` and `correctAnswer === '42'`.

Run the spec to confirm failure (`Red`):
```bash
cd server
npx vitest run src/modules/quizzes/__tests__/quiz.integration.spec.ts
```

---

### Step 2: Implement the Fixes (`Green` Phase)

#### 2.1 Strip `correctAnswer` and `explanation` in `CourseService.sanitizeCourseContent`
In [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts#L13-L32):
```ts
const sanitizeQuiz = (quiz: any) => {
  if (!quiz || !quiz.questions) return quiz;
  return {
    ...quiz,
    questions: quiz.questions.map((q: any) => {
      const { correctAnswer, explanation, ...restQuestion } = q;
      return {
        ...restQuestion,
        options: Array.isArray(q.options)
          ? q.options.map(({ isCorrect, ...opt }: any) => opt)
          : q.options,
      };
    }),
  };
};
```

#### 2.2 Enforce Ownership & Entitlement in `QuizService.getQuizById`
In [`server/src/modules/quizzes/quiz.service.ts`](../../server/src/modules/quizzes/quiz.service.ts#L149-L176):
1. Check quiz existence first; if not found, throw `new NotFoundError('Quiz not found')`.
2. Resolve owner teacher via `const ownerTeacherId = await EntitlementResolver.getQuizOwnerTeacherId(id)`.
3. Determine role access:
   - If `viewer.role === 'ADMIN'`, `includeAnswers = true`.
   - Else if `viewer.role === 'TEACHER'`:
     - If `ownerTeacherId && ownerTeacherId !== viewer.userId`, throw `new ForbiddenError('You do not own this quiz')`.
     - Set `includeAnswers = true`.
   - Else (`STUDENT`):
     - If the quiz is attached to a lesson (`quiz.lesson?.id`), verify `const hasAccess = await EntitlementResolver.hasLessonAccess(viewer.userId, quiz.lesson.id)`. If `!hasAccess`, throw `new ForbiddenError('You do not have access to this course quiz')`.
     - Set `includeAnswers = false`.
4. When `!includeAnswers`, strip `correctAnswer`, `explanation`, and `options[].isCorrect`.

---

### Step 3: Refactor & Cleanup (`Refactor` Phase)

Check if any existing tests in `server/src/modules/quizzes/__tests__/` call `QuizService.getQuizById(id, true)` directly in unit tests; support both `viewerOrIncludeAnswers: boolean | { userId: string; role: string }` in `getQuizById` so unit tests passing a boolean continue to work seamlessly while `QuizController.getQuiz` passes `req.user!`.

---

## 4. Code Review Checklist

- [x] Does `CourseService.sanitizeCourseContent` strip `correctAnswer` and `explanation` in addition to `options[].isCorrect`?
- [x] Does `GET /api/v1/quizzes/:id` return `403` when called by a `TEACHER` who does not own the course?
- [x] Does `GET /api/v1/quizzes/:id` return `403` when called by a `STUDENT` who is not enrolled/entitled to the lesson's course (unless `isFree` or `isFreePreview`)?
- [x] Does `GET /api/v1/quizzes/:id` strip `correctAnswer`, `explanation`, and `isCorrect` for entitled students?

---

## 5. Verification & Test Commands (Verified: 100% Pass)

```bash
cd server
npx vitest run src/modules/quizzes
npx vitest run src/modules/courses
npm run typecheck
npm test
```
