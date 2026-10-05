# 🚀 EduPlatform Server — Express 5 & TypeScript Backend API

The core RESTful backend API powering the EduPlatform ecosystem. Engineered with Node.js 22, Express 5, TypeScript 5, Prisma ORM, and PostgreSQL 15, providing a robust, modular, and enterprise-grade e-learning service.

---

## 📋 Architectural Overview

- **Architecture Style**: Modular Monolith, API-first design with domain module boundaries.
- **Runtime & Language**: Node.js 22+ with strict TypeScript 5.
- **Framework**: Express 5 with async route handlers and centralized error interception.
- **ORM & Data Layer**: Prisma ORM v5.11 with PostgreSQL 15.
- **Caching & Sessions**: Redis 7 for high-throughput rate-limiting and live state caching.
- **Authentication**: JWT with Refresh Token Rotation (Token Families, reuse detection), Bcrypt/Argon2 password hashing, and RFC 6238 TOTP Two-Factor Authentication.
- **Validation**: Strict runtime request validation using Zod schemas.
- **Security**: Helmet HTTP headers, CORS whitelisting, IP and user-keyed rate limiters, timing-safe webhook verification, and sanitized logs.

---

## 📁 Directory Structure

```
server/
├── prisma/
│   ├── schema.prisma          # Database schema definition (Models, Relations, Indexes)
│   └── seed.ts                # Initial curriculum & system user seeding script
├── scripts/                   # Database & operational utility scripts
├── src/
│   ├── modules/               # Domain-driven feature modules
│   │   ├── academic/          # Stages, Grades, Terms, and Educational Board management
│   │   ├── admin/             # System admin controls, approvals, and audit trails
│   │   ├── ai/                # AI Tutor conversational assistant integration
│   │   ├── assessment/        # Question banks, exams, and auto-grading
│   │   ├── assignments/       # Student homework submissions & teacher reviews
│   │   ├── audit/             # Immutable audit logging for administrative actions
│   │   ├── auth/              # Auth, MFA, JWT rotation, and password resets
│   │   ├── careers/           # Career paths & university faculty alignment
│   │   ├── collections/       # Course bundles and learning pathways
│   │   ├── commerce/          # Orders, Paymob/Fawry payments, vouchers, entitlements
│   │   ├── config/            # Public platform settings & dynamic home content editor
│   │   ├── courses/           # Courses, sections, lessons, and approval lifecycle
│   │   ├── developer/         # Scoped API tokens & webhook notification dispatch
│   │   ├── discussions/       # Lesson Q&A forums and student comments
│   │   ├── live/              # Live class sessions and webinar scheduling
│   │   ├── materials/         # Downloadable PDF notes, worksheets, and resources
│   │   ├── notifications/     # Real-time and in-app notification center
│   │   ├── playground/        # Secure Python code sandbox execution runner
│   │   ├── podcasts/          # Audio lectures and learning podcasts
│   │   ├── progress/          # Student lesson progress & video watch-time tracking
│   │   ├── quizzes/           # Timed quizzes, multiple-choice questions, and scorecards
│   │   ├── subscriptions/     # Subject & course subscription period management
│   │   ├── teacher/           # Teacher studio, course authoring, and student analytics
│   │   └── videos/            # AES-128 encrypted HLS streaming and key delivery
│   ├── middleware/            # Auth, RBAC, Zod validation, rate limiting, error handlers
│   ├── utils/                 # Storage abstraction, JWT helpers, crypto, currency, logger
│   ├── app.ts                 # Express application assembly, middleware, and route mounting
│   └── server.ts              # Server startup, port listening, and graceful shutdown
├── tests/                     # Automated Vitest integration and unit test suites
├── create-admin.js            # Standalone utility script to promote or create admin accounts
├── vitest.config.ts           # Vitest configuration for the backend test runner
└── package.json
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in the `server` root:

```ini
# Server Port & Host Environment
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database Connections (Dual-Database Topology)
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/eduplatform?schema=public"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/eduplatform_test?schema=public"

# Redis Cache & Sessions
REDIS_URL="redis://localhost:6379"

# Cryptographic & Authentication Secrets (Must be ≥32 characters in production)
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long_for_security
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_at_least_32_characters_long_for_security
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Video Security & Encryption
VIDEO_KEY_SECRET=super_secret_video_encryption_key_at_least_32_chars

# Payment Gateways (Optional for local testing / sandbox mode)
PAYMOB_API_KEY=
PAYMOB_INTEGRATION_ID=
PAYMOB_HMAC_SECRET=
FAWRY_MERCHANT_CODE=
FAWRY_SECRET_KEY=

# Storage (Local Fallback or Cloudflare R2 / AWS S3)
STORAGE_DRIVER=local
UPLOAD_DIR=./uploads
```

---

## 🗄️ Database Management & Commands

The project uses Docker Compose to run isolated PostgreSQL instances:
- **Port 5434**: Development database (`eduplatform`).
- **Port 5433**: Isolated automated test database (`eduplatform_test`).

```bash
# Push schema changes to development database
npx prisma db push

# Push schema changes to test database
npm run db:push:test

# Generate updated Prisma Client types
npx prisma generate

# Open Prisma Studio visual database browser
npx prisma studio --port 5555

# Seed initial curriculum and test accounts
npm run db:seed

# Create or promote a Super Admin account
node create-admin.js admin@eduplatform.com P@ssword123 "System Administrator"
```

---

## 📡 API Modules & Key Endpoints

All primary routes are versioned under `/api/v1/`:

| Module | Route Prefix | Key Endpoints | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /mfa-setup`, `POST /mfa-verify` | Authentication, token rotation, TOTP 2FA |
| **Config** | `/api/v1/config` | `GET /`, `PUT /` (Admin) | Platform settings, slogans, currencies, and **Home Page Content Editor** |
| **Courses** | `/api/v1/courses` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `POST /:id/submit-for-review` | Course authoring, catalog browsing, and review submission |
| **Academic** | `/api/v1/academic` | `GET /stages`, `GET /grades`, `GET /terms`, `POST /stages` | Educational hierarchy stages and grades |
| **Videos** | `/api/v1/videos` | `POST /upload-url`, `GET /:id/key`, `GET /:id/manifest` | Secure HLS AES-128 stream manifest and key gating |
| **Playground** | `/api/v1/playground` | `POST /run` | Isolated Python code sandbox execution |
| **Whiteboard** | `/api/v1/board` | `GET /rooms/:id`, `POST /rooms` | Collaborative whiteboard room lifecycle |
| **Commerce** | `/api/v1/commerce` | `POST /checkout`, `POST /vouchers/redeem`, `POST /webhooks/paymob`, `POST /webhooks/fawry` | Orders, voucher redemption, payment gateway webhooks |
| **Quizzes** | `/api/v1/quizzes` | `GET /course/:id`, `POST /:id/attempt`, `POST /:id/submit` | Timed quizzes and automated grading |
| **Developer** | `/api/v1/developer` | `GET /tokens`, `POST /tokens`, `GET /webhooks`, `POST /webhooks` | Scoped API tokens and webhook event subscriptions |
| **Admin** | `/api/v1/admin` | `GET /users`, `PUT /users/:id/role`, `GET /courses/pending`, `PUT /courses/:id/approve` | Course approval queue, teacher verification, audit logs |

---

## 🧪 Testing Suite

Tests are executed with **Vitest** in an isolated environment against `localhost:5433`:

```bash
# Run all automated tests (338 tests across 67 suites)
npm test

# Run a specific module test suite
npx vitest run src/modules/config
npx vitest run src/modules/commerce
npx vitest run src/modules/auth

# Run in watch mode for active development
npm run test:watch
```
