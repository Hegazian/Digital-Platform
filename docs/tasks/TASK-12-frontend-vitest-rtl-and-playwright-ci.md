# TASK-12: Frontend Vitest + React Testing Library Suite & Playwright E2E CI Gate

- **Phase**: Phase 4 — Infrastructure & 100% TDD Frontend/E2E
- **Dependencies**: [TASK-11](./TASK-11-infra-cleanup-redis-removal-and-prisma-migrations.md)
- **Estimated Effort**: 3–4 hours
- **Target Issue IDs**: `P2-4` (Zero frontend unit/component tests; `client/e2e/video.spec.ts` 100% `test.skip`; tautological RTL check in `auth.spec.ts`; Playwright not run in `.github/workflows/ci.yml`)

---

## 1. Objective & Problem Statement

To make the repository a **100% Test-Driven Software** across the entire stack, we must close the frontend and E2E testing gaps:

1. **Zero Frontend Unit/Component Tests (`client/`)**:
   - `client/package.json` currently has no unit/component test runner (no Vitest, `@testing-library/react`, `jsdom`, or `msw`).
   - Core client logic—such as single-flight 401 token refresh in [`client/src/lib/api.ts`](../../client/src/lib/api.ts), Zustand persistence in [`store.ts`](../../client/src/lib/store.ts), fallback merging in [`configStore.ts`](../../client/src/lib/configStore.ts), and interactive components (`CheckoutModal`, `InteractiveQuizRunner`, `AssignmentRunner`, `MfaSetupModal`, `NotificationBell`)—has no unit/component tests.
2. **Skipped & Flawed Playwright E2E Specs (`client/e2e/`)**:
   - [`client/e2e/video.spec.ts`](../../client/e2e/video.spec.ts#L17-L36) has `test.skip(...)` on every single test.
   - [`client/e2e/auth.spec.ts`](../../client/e2e/auth.spec.ts#L23) asserts `expect(initialDir === 'rtl' || toggledDir === 'rtl').toBeTruthy()`, which passes even if clicking the language toggle button does nothing when `initialDir === 'rtl'`.
3. **Playwright Not Executed in CI (`.github/workflows/ci.yml`)**:
   - `.github/workflows/ci.yml` only runs `tsc` and `next build` for the client, never running Playwright E2E tests.

---

## 2. Files to Create & Modify

| File | Action | Purpose |
| :--- | :---: | :--- |
| [`client/package.json`](../../client/package.json) | Modify | Add `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` to `devDependencies`; add `"test": "vitest run"` and `"test:e2e": "playwright test"` scripts. |
| `client/vitest.config.ts` | Create | Configure Vitest with `jsdom` environment, `@/` path alias, and `src/test/setup.ts`. |
| `client/src/test/setup.ts` | Create | Configure `@testing-library/jest-dom` matchers and `localStorage` / `fetch` mocks. |
| `client/src/lib/__tests__/api.spec.ts` | Create | Unit tests for `fetchApi`: Bearer header injection, 401 single-flight `/auth/refresh` retry, and `eduplat:session-expired` event dispatch on refresh failure. |
| `client/src/lib/__tests__/configStore.spec.ts` | Create | Unit tests for `useHomeContent()` deep merge fallback when `homeContent` is partial or null. |
| `client/src/components/__tests__/NotificationBell.spec.tsx` | Create | Component tests for unread badge rendering, dropdown toggle, and marking notifications as read. |
| `client/src/components/__tests__/CheckoutModal.spec.tsx` | Create | Component tests for Manual Wallet order submission with idempotency key and transaction reference validation. |
| [`client/e2e/auth.spec.ts`](../../client/e2e/auth.spec.ts) | Modify | Fix language toggle test to assert `expect(toggledDir).not.toBe(initialDir)`. |
| [`client/e2e/video.spec.ts`](../../client/e2e/video.spec.ts) | Modify | Remove `test.skip` and test real un-entitled course lock state vs. free-enrolled video player access. |
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | Modify | Run `npm test` (Vitest unit/component tests) in the `client` job and add an `e2e` Playwright job against the test database. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Install & Configure Frontend Vitest + React Testing Library

1. Install packages in `client/`:
   ```bash
   cd client
   npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
   ```
2. Create `client/vitest.config.ts`:
   ```ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   import path from 'path';

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./src/test/setup.ts'],
       include: ['src/**/*.{test,spec}.{ts,tsx}'],
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
       },
     },
   });
   ```

---

### Step 2: Write Frontend Unit & Component Tests (`Red` → `Green`)

1. **`client/src/lib/__tests__/api.spec.ts`**:
   - Test 1: Injects `Authorization: Bearer <token>` from `useAppStore`.
   - Test 2: When an API call returns `401`, calls `POST /api/v1/auth/refresh` exactly once even if 3 concurrent requests receive `401` simultaneously (single-flight lock), updates the token, and retries all 3 original requests.
   - Test 3: When `/auth/refresh` fails with `401`, clears user/token in `useAppStore` and dispatches `window` event `eduplat:session-expired`.
2. **`client/src/lib/__tests__/configStore.spec.ts`**:
   - Test 1: Returns `DEFAULT_HOME_CONTENT` when config is not loaded.
   - Test 2: Preserves default sections when admin provides partial `homeContent` overrides.
3. **`client/src/components/__tests__/NotificationBell.spec.tsx` & `CheckoutModal.spec.tsx`**:
   - Test rendering, user interactions, form validation, and API payload submission.

---

### Step 3: Fix Playwright E2E Specs & Wire CI

1. In [`client/e2e/auth.spec.ts`](../../client/e2e/auth.spec.ts#L19-L25):
   - Replace the tautological assertion with:
     ```ts
     const initialDir = await page.locator('html').getAttribute('dir');
     await page.locator('#lang-toggle-btn').click();
     const toggledDir = await page.locator('html').getAttribute('dir');
     expect(toggledDir).not.toBe(initialDir);
     ```
2. In [`client/e2e/video.spec.ts`](../../client/e2e/video.spec.ts):
   - Remove `test.skip` and verify that visiting `/courses` and opening a course page enforces the entitlement boundary for locked lessons while allowing free preview / free enrollment.
3. In [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):
   - Add `npm test` to the `client` job so frontend Vitest suites run on every commit.

---

## 4. Code Review Checklist

- [ ] Does `cd client && npm test` execute Vitest unit and component specs and pass 100%?
- [ ] Does `api.spec.ts` verify single-flight token refresh and session-expired event dispatch?
- [ ] Are there zero `test.skip` calls remaining in `client/e2e/video.spec.ts`?
- [ ] Does `client/e2e/auth.spec.ts` strictly assert `expect(toggledDir).not.toBe(initialDir)`?
- [ ] Does `.github/workflows/ci.yml` run backend `test:coverage` and frontend `npm test` + `npm run build`?

---

## 5. Verification & Test Commands

```bash
# 1. Run backend full suite with coverage
cd server
npm run typecheck
npm run test:coverage

# 2. Run frontend unit/component tests, typecheck, lint, and build
cd ../client
npm test
npm run typecheck
npm run lint
npm run build

# 3. Run Playwright E2E suite
npx playwright test
```
