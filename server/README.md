# 🚀 EduPlatform Server — Express 5 & TypeScript Backend API

The RESTful backend API powering EduPlatform, built with **Node.js 22**, **Express 5**, **TypeScript 5**, **Prisma ORM 5.11**, and **PostgreSQL 15**.

For deep-dive documentation, see [`../docs/README.md`](../docs/README.md).

---

## 📋 Architectural Overview

- **Architecture Style**: Modular monolith (`routes` → `controller` → `service`) with 19 domain modules mounted under `/api/v1`.
- **Runtime & Framework**: Node.js 22+ with Express 5.2.1 and strict TypeScript.
- **Database & ORM**: PostgreSQL 15 managed via Prisma 5.11 with versioned SQL migrations (`prisma/migrations/0001_init`) and `prisma db push`.
- **Caching & Rate Limiting**: In-memory TTL cache (`src/utils/cache.ts`) and `express-rate-limit` middleware.
- **Authentication**: Bearer Access JWT (`15m`), `httpOnly` Refresh JWT cookie (`eduplat_rt`, `7d`) with SHA-256 database rotation and reuse detection, plus RFC 6238 TOTP MFA (`otplib`).
- **Validation**: Request body and query validation via Zod (`src/utils/schemas.ts`, `src/utils/validate.ts`).

---

## 📁 Directory Structure

```text
server/
├── prisma/
│   ├── migrations/            # Versioned baseline SQL migrations (0001_init/migration.sql)
│   ├── schema.prisma          # 32 models, 17 enums
│   └── seed.ts                # Initial curriculum & admin seed script
├── scripts/
│   ├── db-env.js              # Helper to run Prisma CLI against .env.test
│   └── run-demo.ts            # Demo seed/execution script
├── src/
│   ├── modules/               # 19 domain modules (co-located with __tests__/)
│   │   ├── academic/          # Stages, Grades, AcademicYears, GradeSubjects
│   │   ├── admin/             # User management, teacher approval, platform stats
│   │   ├── ai/                # Google Gemini AI tutor endpoint
│   │   ├── assignments/       # Lesson assignments, file uploads, and grading
│   │   ├── audit/             # Admin audit log reader
│   │   ├── auth/              # Register, login, refresh, logout, profile, TOTP MFA
│   │   ├── commerce/          # Products, orders, vouchers, webhooks, entitlement resolver
│   │   ├── config/            # Public/admin AppConfig and homeContent JSON
│   │   ├── courses/           # Courses, sections, lessons, blocks, subjects
│   │   ├── discussions/       # Course discussion threads and replies
│   │   ├── health/            # DB ping, uptime, and memory health check
│   │   ├── live/              # Live session scheduling (Zoom / Google Meet / Teams join URLs)
│   │   ├── materials/         # Lesson material uploads (50MB limit) & entitled download
│   │   ├── notifications/     # User notifications
│   │   ├── progress/          # Lesson watch time and completion tracking
│   │   ├── quizzes/           # Deterministic auto-graded lesson quizzes & attempts
│   │   ├── subscriptions/     # Manual subject subscriptions and admin approval queue
│   │   ├── teacher/           # Teacher students list, announcements, revenue stats
│   │   └── videos/            # Disk-streamed video uploads (500MB limit) & signed range streaming
│   ├── middleware/            # authenticate, optionalAuth, requireRole, requireApprovedTeacher
│   ├── utils/                 # env, jwt, totp, storage, currency, schemas, webhook-security, logger
│   ├── app.ts                 # Express middleware pipeline and route mounts
│   ├── prisma.ts              # PrismaClient singleton
│   └── server.ts              # Entry point
├── tests/
│   └── setup.ts               # Vitest global test setup
├── create-admin.js            # CLI script to create/promote an ADMIN user
├── vitest.config.ts           # Vitest configuration (serial file execution + v8 coverage thresholds)
└── package.json
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in `server/`:

```ini
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"

# Matches docker-compose.yml (postgres-dev on port 5434)
DATABASE_URL="postgresql://devuser:devpassword@localhost:5434/eduplatform_dev"
DIRECT_URL="postgresql://devuser:devpassword@localhost:5434/eduplatform_dev"

# Cryptographic Secrets (Required >= 32 chars in production; auto-generated in dev if omitted)
JWT_SECRET="replace-with-at-least-32-characters-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="replace-with-at-least-32-characters-in-production"
JWT_REFRESH_EXPIRES_IN="7d"
VIDEO_STREAM_SECRET="replace-with-at-least-32-characters-in-production"

# Payment Webhook Secrets
PAYMOB_HMAC_SECRET="replace-with-paymob-hmac-secret-32-chars"
FAWRY_SECRET_KEY="replace-with-fawry-secret-key-32-chars"

# Optional Integrations
RESEND_API_KEY=""
GEMINI_API_KEY=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
UPLOADS_DIR=""
TRUST_PROXY="false"
```

---

## 🗄️ Database & Operational Commands

```bash
# Deploy versioned SQL migrations to target DB
npm run db:migrate:deploy

# Push schema to development DB (localhost:5434 / eduplatform_dev)
npm run db:push

# Push schema to test DB (localhost:5433 / eduplatform_test)
npm run db:push:test

# Force-reset test DB
npm run db:reset:test

# Seed initial subjects, curriculum, and admin user
npm run db:seed

# Create or promote an admin user interactively / via CLI
npm run create:admin
```

---

## 🧪 Testing, Coverage & Typechecking

Tests run serially against `eduplatform_test` (`localhost:5433`) using **Vitest** and **Supertest**:

```bash
# Run all 56 test suites (324 tests)
npm test

# Run full suite with enforced v8 coverage thresholds (70% stmts, 60% branch, 80% funcs, 70% lines)
npm run test:coverage

# Run a single module's test suite
npx vitest run src/modules/commerce

# Run TypeScript compiler check
npm run typecheck
```

See [`../docs/06-API-CATALOG.md`](../docs/06-API-CATALOG.md) for the complete list of REST endpoints.
