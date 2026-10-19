# TASK-05: Prune Non-Core Peripheral Modules (`developer`, `podcasts`, `collections`, `careers`)

- **Phase**: Phase 2 — Codebase Simplification & Schema Consolidation
- **Status**: ✅ Completed
- **Dependencies**: [TASK-04](./TASK-04-remove-unsafe-playground-and-fake-board.md)
- **Estimated Effort**: 2.5–3 hours
- **Target Issue IDs**: `P1-1` (`CollectionsManager.tsx` broken `+ New Collection` button), `P1-2` (`CourseCatalog.tsx` `/career-tracks` 404), Unmounted `PodcastPlayer.tsx` & `CollectionCard.tsx`, Stubbed `developer` tokens/webhooks (Simplification Decision 3)

---

## 1. Objective & Architectural Rationale

Removing these 4 peripheral modules eliminates **8 Prisma tables**, **4 backend modules**, and **8 frontend components** that either do nothing at runtime or duplicate the core `EducationalStage` → `Grade` → `Subject` → `Course` hierarchy:

1. **`developer` (`ApiToken`, `WebhookEndpoint`)**:
   - Admin CRUD creates database rows, but no middleware authenticates `ApiToken` and no service dispatches outbound webhooks.
2. **`podcasts` (`Podcast`, `PodcastEpisode`)**:
   - [`PodcastPlayer.tsx`](../../client/src/components/podcasts/PodcastPlayer.tsx) is never mounted for students. Teachers can already upload audio files (`audio/mpeg`, `audio/wav`, `audio/ogg`) as standard Lesson `Material` attachments ([`material.routes.ts`](../../server/src/modules/materials/material.routes.ts#L16-L31)).
3. **`collections` (`Collection`, `CollectionCourse`)**:
   - [`CollectionCard.tsx`](../../client/src/components/collections/CollectionCard.tsx) is unmounted, [`CollectionsManager.tsx`](../../client/src/components/admin/CollectionsManager.tsx#L189) has a broken creation button, and courses are already grouped by Stage, Grade, and Subject.
4. **`careers` (`CareerTrack`, `CareerTrackSubject`)**:
   - [`CourseCatalog.tsx`](../../client/src/components/CourseCatalog.tsx#L100) calls `/career-tracks` (which 404s), and students already select their `Grade` during registration.

---

## 2. Files to Delete & Modify

### Directories & Files to Delete
- **Server Modules**:
  - `server/src/modules/developer/` (entire directory including `__tests__/`)
  - `server/src/modules/podcasts/` (entire directory including `__tests__/`)
  - `server/src/modules/collections/` (entire directory including `__tests__/`)
  - `server/src/modules/careers/` (entire directory including `__tests__/`)
- **Client Components**:
  - `client/src/components/admin/DeveloperTabs.tsx`
  - `client/src/components/admin/TokenList.tsx`
  - `client/src/components/admin/WebhookList.tsx`
  - `client/src/components/admin/CollectionsManager.tsx`
  - `client/src/components/collections/CollectionCard.tsx`
  - `client/src/components/podcasts/PodcastStudio.tsx`
  - `client/src/components/podcasts/PodcastPlayer.tsx`
  - `client/src/components/careers/CareerPickerModal.tsx`

### Files to Modify
| File | Action | Purpose |
| :--- | :---: | :--- |
| [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma) | Modify | Delete `ApiToken`, `WebhookEndpoint`, `Podcast`, `PodcastEpisode`, `Collection`, `CollectionCourse`, `CareerTrack`, `CareerTrackSubject`; remove `interestedTrackId`, `interestedTrack`, `apiTokens`, `webhooks` from `User`; remove `careerTracks` from `Subject`; remove `collections` from `Course`. |
| [`server/prisma/seed.ts`](../../server/prisma/seed.ts) | Modify | Remove `careerTrack` seeding logic. |
| [`server/src/app.ts`](../../server/src/app.ts) | Modify | Remove route mounts for `/api/v1/developer`, `/api/v1/podcasts`, `/api/v1/collections`, and `/api/v1/careers`. |
| [`server/src/utils/schemas.ts`](../../server/src/utils/schemas.ts) | Modify | Remove Zod schemas for podcasts, collections, careers, apiTokens, and webhooks. |
| [`client/src/components/AdminDashboard.tsx`](../../client/src/components/AdminDashboard.tsx) | Modify | Remove `collections` and `developers` tabs and their imports (`CollectionsManager`, `DeveloperTabs`). |
| [`client/src/components/TeacherDashboard.tsx`](../../client/src/components/TeacherDashboard.tsx) | Modify | Remove `PodcastStudio` tab/import. |
| [`client/src/components/StudentDashboard.tsx`](../../client/src/components/StudentDashboard.tsx) | Modify | Remove `CareerPickerModal` and career track pulse widget. |
| [`client/src/components/CourseCatalog.tsx`](../../client/src/components/CourseCatalog.tsx) | Modify | Remove the broken `/career-tracks` fetch and career filter dropdown, keeping clean Stage/Grade/Subject/Search filters. |
| [`client/src/lib/store.ts`](../../client/src/lib/store.ts) | Modify | Remove `selectedCareerTrack` state from `useAppStore`. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Update Tests First (`Red` Phase)

1. Delete the test suites inside the 4 removed modules (`developer`, `podcasts`, `collections`, `careers`).
2. Check [`server/src/modules/__tests__/e2e-journeys.spec.ts`](../../server/src/modules/__tests__/e2e-journeys.spec.ts) for any references to `/api/v1/careers`, `/api/v1/collections`, `/api/v1/podcasts`, or `/api/v1/developer`, and update them so the journey tests focus on the core academic + course + commerce + learning flows.
3. In [`client/e2e/courses.spec.ts`](../../client/e2e/courses.spec.ts), add an assertion that loading `/courses` produces zero `404` network responses (confirming the `/career-tracks` 404 is gone).

---

### Step 2: Remove Models, Backend Modules & Client Components (`Green` Phase)

1. Update [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma) to remove the 8 models (`ApiToken`, `WebhookEndpoint`, `Podcast`, `PodcastEpisode`, `Collection`, `CollectionCourse`, `CareerTrack`, `CareerTrackSubject`) and their relation fields on `User`, `Subject`, and `Course`.
2. Delete the 4 module folders under `server/src/modules/` and remove their imports/mounts in [`server/src/app.ts`](../../server/src/app.ts).
3. Push schema changes to dev and test databases:
   ```bash
   cd server
   npm run db:push
   npm run db:push:test
   ```
4. Delete the 8 client components and clean up [`AdminDashboard.tsx`](../../client/src/components/AdminDashboard.tsx), [`TeacherDashboard.tsx`](../../client/src/components/TeacherDashboard.tsx), [`StudentDashboard.tsx`](../../client/src/components/StudentDashboard.tsx), [`CourseCatalog.tsx`](../../client/src/components/CourseCatalog.tsx), and [`store.ts`](../../client/src/lib/store.ts).

---

### Step 3: Refactor & Cleanup (`Refactor` Phase)

Run a project-wide search (`rg "podcasts|collections|careers|developer/tokens|developer/webhooks"`) across `server/src` and `client/src` to confirm zero dangling references remain.

---

## 4. Code Review Checklist
 
- [x] Are all 8 Prisma models (`ApiToken`, `WebhookEndpoint`, `Podcast`, `PodcastEpisode`, `Collection`, `CollectionCourse`, `CareerTrack`, `CareerTrackSubject`) removed from `schema.prisma`?
- [x] Does `server/prisma/seed.ts` run cleanly via `npm run db:seed` without `CareerTrack` references?
- [x] Does `CourseCatalog.tsx` load without making any `/career-tracks` or `/careers` network requests?
- [x] Do `AdminDashboard.tsx`, `TeacherDashboard.tsx`, and `StudentDashboard.tsx` compile and render cleanly without broken tabs?

---

## 5. Verification & Test Commands

```bash
# 1. Server schema push, seed check, typecheck, and test suite
cd server
npm run db:push:test
npm run typecheck
npm test

# 2. Client typecheck, lint, and production build
cd ../client
npm run typecheck
npm run lint
npm run build
```
