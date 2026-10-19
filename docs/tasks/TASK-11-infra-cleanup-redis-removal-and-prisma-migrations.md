# TASK-11: Remove Unused Redis, Baseline Prisma Migrations & Enforce CI Coverage Gate

- **Phase**: Phase 4 — Infrastructure & 100% TDD Frontend/E2E
- **Dependencies**: [TASK-10](./TASK-10-mount-mfa-setup-and-student-notification-bell.md)
- **Estimated Effort**: 1.5–2 hours
- **Target Issue IDs**: `P2-1` (No `prisma/migrations/` directory), `P2-2` (Unused Redis container in `docker-compose.yml`), CI coverage gate enforcement (Simplification Decision 5)

---

## 1. Objective & Problem Statement

1. **Unused Redis Container (`docker-compose.yml`)**:
   - [`docker-compose.yml`](../../docker-compose.yml) spins up a `redis:7-alpine` container and `redis_data` volume on port `6379`, yet `server/package.json` has zero Redis client packages (`redis` or `ioredis`), and all server caching uses [`server/src/utils/cache.ts`](../../server/src/utils/cache.ts) (an in-memory TTL `Map`). Removing Redis simplifies local and production infrastructure.
2. **Missing Versioned Database Migrations (`server/prisma/migrations/`)**:
   - All schema changes currently rely on `prisma db push`, which cannot be safely rolled back or audited in production deployments. Now that the schema has been simplified from 35 models down to the 21 core models (Tasks 04–07), we should generate the clean baseline migration in `server/prisma/migrations/`.
3. **Unenforced Coverage Gate in CI (`.github/workflows/ci.yml`)**:
   - [`server/vitest.config.ts`](../../server/vitest.config.ts) defines coverage thresholds (`80% statements, 75% branches, 80% functions, 80% lines`), but `server/package.json`'s `"test"` script runs `vitest run --no-file-parallelism` without `--coverage`, so CI never checks coverage thresholds.

---

## 2. Files to Create & Modify

| File | Action | Purpose |
| :--- | :---: | :--- |
| [`docker-compose.yml`](../../docker-compose.yml) | Modify | Remove the unused `redis` service and `redis_data` volume. |
| `server/prisma/migrations/` | Create | Generate the initial baseline SQL migration for the simplified 21-model schema. |
| [`server/package.json`](../../server/package.json) | Modify | Add `"test:coverage": "vitest run --no-file-parallelism --coverage"` and `"db:migrate:deploy": "prisma migrate deploy"` scripts. |
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | Modify | Run `npm run test:coverage` in the `server` CI job so coverage thresholds are enforced on every push/PR. |

---

## 3. Step-by-Step Implementation Guide

### Step 1: Remove Unused Redis from `docker-compose.yml`

Edit [`docker-compose.yml`](../../docker-compose.yml) so it only provisions `postgres-dev` (`5434`) and `postgres-test` (`5433`). Also remove any `REDIS_URL` placeholder from `server/.env.example` if present.

### Step 2: Generate Baseline Prisma Migration

With the simplified 21-model [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma) finalized:
```bash
cd server
mkdir -p prisma/migrations/0001_init
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0001_init/migration.sql
```
Verify that `npx prisma migrate status` and `npm run db:push:test` succeed cleanly.

### Step 3: Add `test:coverage` Script & Enforce in CI

1. In [`server/package.json`](../../server/package.json):
   - Ensure `@vitest/coverage-v8` is installed in `devDependencies`.
   - Add `"test:coverage": "vitest run --no-file-parallelism --coverage"`.
2. In [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):
   - Update the server test step to run `npm run test:coverage`.

---

## 4. Code Review Checklist

- [ ] Is `redis` removed from `docker-compose.yml`?
- [ ] Does `server/prisma/migrations/0001_init/migration.sql` exist and accurately represent the 21 core Prisma models and enums?
- [ ] Does `npm run test:coverage` in `server/` pass all suites and meet the Vitest coverage thresholds?

---

## 5. Verification & Test Commands

```bash
cd server
npm run db:reset:test
npm run typecheck
npm run test:coverage
```
