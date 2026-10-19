# TASK-04: Remove Unsafe Host Python Playground (`P0-3`) & Fake Multiplayer Board

- **Status**: ✅ Completed
- **Phase**: Phase 2 — Codebase Simplification & Schema Consolidation
- **Dependencies**: [TASK-03](./TASK-03-upload-streaming-and-frontend-xss-edge-auth.md)
- **Estimated Effort**: 2 hours
- **Target Issue IDs**: `P0-3` (Unsandboxed host OS Python execution in `playground.controller.ts`), Simplification Decision 4 (`CODE_PLAYGROUND` & `BOARD` removal)

---

## 1. Objective & Architectural Rationale

1. **Eliminate Host RCE Vector (`Playground`)**:
   - `server/src/modules/courses/playground.controller.ts` previously spawned `python -I` directly on the backend host OS whenever `CODE_EXECUTION_ENABLED=true`.
2. **Eliminate Fake Multiplayer Whiteboard (`Board`)**:
   - `server/src/modules/courses/board.controller.ts` and `client/src/components/editor/CollaborativeBoardBlock.tsx` were named "Collaborative Board" with a `yjsState` column in Prisma, but had no WebSocket server and only persisted single-user JSON canvas strokes.
3. **Simplification Outcome**:
   - Removed the `Playground` and `Board` models from [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma), removed `CODE_PLAYGROUND` and `BOARD` from `LessonBlockType`, deleted the routes/controllers/components, and removed the `enableCodePlaygrounds` / `enableCollaborativeBoards` toggles from `AppConfig`.
   - This reduces `LessonBlockType` to the **7 reliable educational block types**: `VIDEO`, `TEXT`, `DOCUMENT`, `QUIZ`, `ASSIGNMENT`, `LIVE_SESSION`, and `LINK`.

---

## 2. Files Deleted & Modified

### Files Deleted
- `server/src/modules/courses/playground.routes.ts`
- `server/src/modules/courses/playground.controller.ts`
- `server/src/modules/courses/playground.test.ts`
- `server/src/modules/courses/board.routes.ts`
- `server/src/modules/courses/board.controller.ts`
- `server/src/modules/courses/__tests__/board.integration.spec.ts`
- `client/src/components/editor/CodePlaygroundBlock.tsx`
- `client/src/components/editor/CollaborativeBoardBlock.tsx`

### Files Modified
| File | Action | Purpose |
| :--- | :---: | :--- |
| [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma) | Modify | Delete `Board` and `Playground` models; remove `CODE_PLAYGROUND` and `BOARD` from `LessonBlockType`; remove `enableCodePlaygrounds` and `enableCollaborativeBoards` from `AppConfig`. |
| [`server/src/app.ts`](../../server/src/app.ts) | Modify | Remove `/api/v1/boards` and `/api/v1/playgrounds` route mounts and imports. |
| [`server/src/modules/courses/course.service.ts`](../../server/src/modules/courses/course.service.ts) | Modify | Validate `blockType` against `LessonBlockType` enum values in `addLessonBlock` and `updateLessonBlock` (`400 Bad Request` on invalid types). |
| [`server/src/modules/config/config.controller.ts`](../../server/src/modules/config/config.controller.ts) | Modify | Remove `enableCodePlaygrounds` and `enableCollaborativeBoards` from config payload. |
| [`server/src/modules/config/config.routes.ts`](../../server/src/modules/config/config.routes.ts) | Modify | Remove `enableCodePlaygrounds` and `enableCollaborativeBoards` from `updateAppConfigSchema`. |
| [`client/src/lib/configStore.ts`](../../client/src/lib/configStore.ts) | Modify | Remove `enableCodePlaygrounds` and `enableCollaborativeBoards` from `AppConfig` type. |
| [`client/src/lib/api.ts`](../../client/src/lib/api.ts) | Modify | Remove `/playgrounds/execute` special-case check in 401 interceptor. |
| [`client/src/components/VideoPlayerSection.tsx`](../../client/src/components/VideoPlayerSection.tsx) | Modify | Remove `CodePlaygroundBlock` and `CollaborativeBoardBlock` imports and tabs/rendering. |
| [`client/src/components/teacher/CourseManager.tsx`](../../client/src/components/teacher/CourseManager.tsx) | Modify | Remove `BOARD` option from the lesson block creation selector. |
| [`client/src/components/admin/PlatformSettings.tsx`](../../client/src/components/admin/PlatformSettings.tsx) | Modify | Remove the "Enable Interactive Code Runner" and "Enable Collaborative Whiteboards" checkboxes. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Update Tests First (`Red` Phase)

1. Delete `server/src/modules/courses/playground.test.ts` and `server/src/modules/courses/__tests__/board.integration.spec.ts`.
2. In [`server/src/modules/courses/__tests__/module-lesson-management.spec.ts`](../../server/src/modules/courses/__tests__/module-lesson-management.spec.ts), add tests asserting that `POST /api/v1/courses/lessons/:lessonId/blocks` rejects `CODE_PLAYGROUND` and `BOARD` with `400 Bad Request` and that `/api/v1/playgrounds/execute` and `/api/v1/boards/:blockId` return `404 Not Found`.

---

### Step 2: Apply Schema, Backend & Frontend Removal (`Green` Phase)

1. Edit [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma):
   - Remove `CODE_PLAYGROUND` and `BOARD` from `enum LessonBlockType`.
   - Remove `board Board?` and `playground Playground?` from `model LessonBlock`.
   - Delete `model Board` and `model Playground`.
   - Remove `enableCodePlaygrounds` and `enableCollaborativeBoards` from `model AppConfig`.
2. Push updated schema to dev and test databases:
   ```bash
   cd server
   npm run db:push
   npm run db:push:test
   ```
3. Delete the playground and board route/controller files and remove their mounts in [`server/src/app.ts`](../../server/src/app.ts).
4. Delete `CodePlaygroundBlock.tsx` and `CollaborativeBoardBlock.tsx` in `client/` and remove their references in `VideoPlayerSection.tsx`, `CourseManager.tsx`, `PlatformSettings.tsx`, and `configStore.ts`.
5. Uninstall unused CodeMirror dependencies (`@codemirror/lang-python`, `@uiw/react-codemirror`) from [`client/package.json`](../../client/package.json) to shrink the client bundle size.

---

### Step 3: Refactor & Verify (`Refactor` Phase)

Updated `server/src/modules/config/config.test.ts`, `server/src/modules/config/__tests__/config-branding.spec.ts`, and `server/src/modules/podcasts/__tests__/podcast-persistence.spec.ts` to remove references to `enableCodePlaygrounds`, `enableCollaborativeBoards`, and `prisma.board`.

---

## 4. Code Review Checklist

- [x] Are `playground.controller.ts` and all `child_process.spawn('python')` calls completely removed from the repository?
- [x] Are `Board` and `Playground` removed from `schema.prisma`?
- [x] Does `POST /api/v1/courses/lessons/:lessonId/blocks` reject `CODE_PLAYGROUND` and `BOARD` with `400`?
- [x] Are `@codemirror/lang-python` and `@uiw/react-codemirror` removed from `client/package.json`?

---

## 5. Verification & Test Commands

```bash
# 1. Sync test DB and run server tests
cd server
npm run db:push:test
npm run typecheck
npm test

# 2. Verify client build & lint
cd ../client
npm run typecheck
npm run lint
npm run build
```
