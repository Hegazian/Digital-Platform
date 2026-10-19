# EduPlatform — Documentation Index

Canonical engineering documentation for the **Digital-Platform** repository.  
All documents are grounded strictly in the **as-built source code** (`server/`, `client/`, `server/prisma/schema.prisma`, `docker-compose.yml`, and `.github/workflows/ci.yml`). Obsolete and misleading root-level planning/marketing files have been removed.

| Document | Contents |
| :--- | :--- |
| [00-OVERVIEW.md](./00-OVERVIEW.md) | Product overview, 3-role matrix (`STUDENT`, `TEACHER`, `ADMIN`), feature status matrix, and repository map |
| [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) | System architecture, Express 5 middleware pipeline, 19 module mounts, and Next.js 14 client integration |
| [02-SETUP.md](./02-SETUP.md) | Local development setup, Docker Compose databases (`5434`/`5433`), environment variables, and seeding |
| [03-DATA-MODEL.md](./03-DATA-MODEL.md) | Complete reference for all 32 Prisma models and 16 enums |
| [04-AUTH-AND-SECURITY.md](./04-AUTH-AND-SECURITY.md) | JWT rotation, TOTP MFA, RBAC, entitlement resolver, and verified P0 security controls |
| [05-FEATURES.md](./05-FEATURES.md) | Feature-by-feature behavior across all domains (including remaining Phase 3/4 items) |
| [06-API-CATALOG.md](./06-API-CATALOG.md) | Complete REST endpoint reference under `/api/v1` |
| [07-OPERATIONS.md](./07-OPERATIONS.md) | Docker, CI pipeline, Vitest/Playwright test suites, uploads, and production checklist |
| [08-GAP-LOG.md](./08-GAP-LOG.md) | Remediation tracker: resolved P0 security blockers, completed Phase 2 simplifications, and remaining P1/P2 items |
| [09-ROADMAP.md](./09-ROADMAP.md) | Feature simplification plan, architectural de-scoping decisions, and TDD execution roadmap |
| [tasks/00-MASTER-IMPLEMENTATION-PLAN.md](./tasks/00-MASTER-IMPLEMENTATION-PLAN.md) | **12 Detailed TDD Task Specifications (`TASK-01` to `TASK-12`)** (`TASK-01`..`TASK-07` ✅ Completed) |

---

## Key Facts at a Glance

| Fact | Value |
| :--- | :--- |
| **Backend** | Express 5.2.1 + TypeScript 5 + Prisma 5.11 + PostgreSQL 15 (19 domain modules) |
| **Frontend** | Next.js 14.2.35 App Router + React 18 + Tailwind CSS 3.4 + Zustand + TanStack React Query |
| **Roles** | `STUDENT`, `TEACHER`, `ADMIN` (secondary `TeacherStatus`: `PENDING`, `APPROVED`, `REJECTED`) |
| **API Base** | `http://localhost:5000/api/v1` |
| **Client URL** | `http://localhost:3000` (proxies `/api/v1` and `/uploads` to `:5000`) |
| **Dev DB** | `eduplatform_dev` on port **5434** (`devuser` / `devpassword`) |
| **Test DB** | `eduplatform_test` on port **5433** (`testuser` / `testpassword`) |
| **Schema Sync** | `prisma db push` (32 models, 16 enums) |
| **Auth** | Bearer Access JWT (`15m`) + rotating `httpOnly` cookie `eduplat_rt` (`7d`, SHA-256 DB registry) + TOTP MFA |
| **Payments** | Manual wallets (Vodafone Cash, InstaPay), Vouchers, and inbound Paymob/Fawry webhooks |
| **CI Pipeline** | Server `tsc` + Vitest (55 suites / 313 tests against Postgres 15); Client `tsc` + `next build` |
