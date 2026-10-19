# EduPlatform — Documentation Index

Canonical engineering documentation for the **Digital-Platform** repository.  
All documents are grounded strictly in the **as-built source code** (`server/`, `client/`, `server/prisma/schema.prisma`, `docker-compose.yml`, and `.github/workflows/ci.yml`).

| Document | Contents |
| :--- | :--- |
| [00-OVERVIEW.md](./00-OVERVIEW.md) | Product overview, 3-role matrix (`STUDENT`, `TEACHER`, `ADMIN`), feature status matrix, and repository map |
| [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) | System architecture, Express 5 middleware pipeline, 19 module mounts, and Next.js 14 client integration |
| [02-SETUP.md](./02-SETUP.md) | Local development setup, Docker Compose databases (`5434`/`5433`), environment variables, and seeding |
| [03-DATA-MODEL.md](./03-DATA-MODEL.md) | Complete reference for all 32 Prisma models, 17 enums, and SQL migrations |
| [04-AUTH-AND-SECURITY.md](./04-AUTH-AND-SECURITY.md) | JWT rotation, TOTP MFA, RBAC, entitlement resolver, and enforced security controls |
| [05-FEATURES.md](./05-FEATURES.md) | Feature-by-feature behavior across all 19 domains |
| [06-API-CATALOG.md](./06-API-CATALOG.md) | Complete REST endpoint reference under `/api/v1` |
| [07-OPERATIONS.md](./07-OPERATIONS.md) | Docker, CI pipeline, Vitest/Playwright test suites, uploads, and production checklist |

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
| **Schema & Migrations** | 32 models, 17 enums, versioned SQL migrations (`prisma/migrations/0001_init`) |
| **Auth** | Bearer Access JWT (`15m`) + rotating `httpOnly` cookie `eduplat_rt` (`7d`, SHA-256 DB registry) + TOTP MFA |
| **Payments** | Manual wallets (Vodafone Cash, InstaPay), Vouchers, and inbound Paymob/Fawry webhooks |
| **CI Pipeline** | Server `tsc` + Vitest coverage (56 suites / 324 tests); Client `tsc` + Vitest (4 suites / 12 tests) + `next build` |
