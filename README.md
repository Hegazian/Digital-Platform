# 🎓 EduPlatform — Bilingual Educational & E-Learning Platform

[![CI Pipeline](https://github.com/Hegazian/Digital-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Hegazian/Digital-Platform/actions)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-5.x-lightgrey.svg?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg?logo=postgresql)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.11-2D3748.svg?logo=prisma)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)

A paid, bilingual (**English LTR / Arabic RTL**) educational platform built with an **Express 5 + TypeScript + Prisma** modular monolith backend and a **Next.js 14 App Router** frontend. Originally scoped for the Egyptian secondary curriculum (Thanaweya Amma), the platform's academic hierarchy, branding, and landing page copy are dynamically configurable from the Admin Dashboard.

👉 **Full Technical Documentation**: See [`docs/README.md`](./docs/README.md) for the complete architecture, data model, API catalog, security guide, and engineering gap log.

---

## 🌟 Core Capabilities (As-Built)

### 🎨 Dynamic Branding & Platform Configuration
- **Live Landing Page Content Editor**: Administrators can customize homepage headlines, value propositions, CTAs, "How It Works" steps, teacher recruitment banners, and footer copy via `AppConfig.homeContent`.
- **Bilingual Identity (EN / AR)**: Full LTR/RTL support (`Inter` and `Tajawal` fonts) with runtime language switching, customizable slogans, and dynamic `--brand-primary` CSS theme injection.
- **Dual-Currency Pricing (EGP & USD)**: Admin-configured EGP base pricing with automated USD conversion via `AppConfig.exchangeRateUsdToEgp`.

### 🛡️ Authentication, RBAC & Security
- **JWT Access + Rotating Refresh Tokens**: Short-lived Bearer access tokens (`15m`) paired with `httpOnly` refresh cookies (`eduplat_rt`, `7d`) backed by a server-side SHA-256 `RefreshToken` registry and token-family reuse revocation.
- **Two-Factor Authentication (TOTP MFA)**: RFC 6238 TOTP enrollment with QR code generation and replay protection (`mfaLastTimeStep`).
- **Role-Based Access Control (RBAC)**: Three distinct roles (`STUDENT`, `TEACHER`, `ADMIN`) plus secondary teacher approval gating (`TeacherStatus`: `PENDING`, `APPROVED`, `REJECTED`).

### 📚 Course Delivery & Learning Tools
- **Academic Hierarchy**: `EducationalStage` → `Grade` → `AcademicYear` → `GradeSubject` → `Subject` → `Course` → `Section` → `Lesson` → `LessonBlock`.
- **Course Governance Workflow**: `DRAFT` → `UNDER_REVIEW` → `APPROVED` → `PUBLISHED` / `REJECTED` / `ARCHIVED`, with soft-delete protection (`deletedAt`).
- **Gated Video & Material Delivery**: Video upload (local disk or Supabase Storage) with entitlement-checked playback URLs and HMAC-SHA256 signed local range streaming (`/api/v1/videos/:videoId/stream`).
- **Quizzes & Assignments**: Timed auto-graded lesson quizzes (MCQ, True/False, Multi-Select, Short Answer) and file/text homework assignments with teacher grading and feedback.
- **Interactive Lesson Blocks**: Support for `VIDEO`, `TEXT`, `DOCUMENT`, `QUIZ`, `ASSIGNMENT`, `LIVE_SESSION`, and `LINK` blocks, plus an authenticated Google Gemini AI Tutor drawer (`POST /api/v1/ai/tutor`).

### 💳 Commerce, Subscriptions & Entitlements
- **Hierarchical Entitlement Resolver**: Access granted via direct `COURSE` purchase, parent `SUBJECT` subscription/purchase, or `GRADE_BUNDLE` entitlement, plus `Section.isFreePreview` and `Course.isFree` support.
- **Payment Channels**: Manual wallet subscriptions/orders (Vodafone Cash, InstaPay) with Admin reconciliation queues, atomic `Voucher` code redemption, and HMAC-verified inbound webhooks for **Paymob** and **Fawry**.

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Client["Frontend Client (Next.js 14 App Router - Port 3000)"]
        UI["Tailwind CSS + Bilingual LTR/RTL UI"]
        Zustand["Zustand Stores (useAppStore, useConfigStore)"]
        RQ["TanStack React Query + fetchApi Auto-Refresh"]
    end

    subgraph Server["Backend API (Express 5 + TypeScript - Port 5000)"]
        Router["Express REST Router (/api/v1/*) + Zod Validation"]
        AuthM["Auth, TOTP MFA & RBAC Middleware"]
        Modules["19 Domain Modules (Courses, Commerce, Quizzes, Videos, etc.)"]
        PrismaClient["Prisma ORM Client + In-Memory TTL Cache"]
    end

    subgraph DataTier["Data & Storage Tier"]
        PG_Dev["PostgreSQL 15 Dev DB (eduplatform_dev - Port 5434)"]
        PG_Test["PostgreSQL 15 Test DB (eduplatform_test - Port 5433)"]
        Storage["Storage (Local server/uploads/ or Supabase Storage)"]
    end

    Client -->|Same-Origin /api/v1 Rewrite + httpOnly Cookie| Router
    Router --> AuthM
    AuthM --> Modules
    Modules --> PrismaClient
    PrismaClient --> PG_Dev
    PrismaClient -.->|Vitest Suite| PG_Test
    Modules --> Storage
```

---

## 📁 Repository Structure

```text
digital-platform/
├── client/                     # Next.js 14.2.35 App Router Frontend
│   ├── e2e/                    # Playwright E2E test specifications
│   ├── src/
│   │   ├── app/                # App Router pages (/, /courses, /student, /teacher, /admin, /profile)
│   │   ├── components/         # Role dashboards, course player, editors, modals
│   │   ├── lib/                # fetchApi client, Zustand stores, i18n helper
│   │   └── middleware.ts       # Edge UX route guard
│   └── package.json
│
├── server/                     # Express 5 + TypeScript Backend API
│   ├── prisma/                 # schema.prisma (32 models, 16 enums) & seed.ts
│   ├── scripts/                # Test database environment helper (db-env.js)
│   ├── src/
│   │   ├── modules/            # 19 domain modules (routes, controllers, services, __tests__)
│   │   ├── middleware/         # JWT auth, RBAC, entitlement checks
│   │   ├── utils/              # Env validation, JWT, TOTP, storage, currency, Zod schemas
│   │   ├── app.ts              # Express app pipeline & route mounts
│   │   └── server.ts           # HTTP server entry point
│   ├── tests/setup.ts          # Vitest global setup
│   └── package.json
│
├── docs/                       # Canonical codebase documentation (00-OVERVIEW to 09-ROADMAP)
├── .github/workflows/ci.yml    # GitHub Actions CI (Server Vitest + Client Typecheck & Build)
└── docker-compose.yml          # Local PostgreSQL (Dev :5434, Test :5433) containers
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js**: v22+ LTS
- **npm**: v10+
- **Docker & Docker Compose**: For local PostgreSQL containers

### 1. Start Database Containers
```bash
docker compose up -d
```
| Container | Host Port | Database | User / Password |
| :--- | :--- | :--- | :--- |
| `postgres-dev` | `5434` | `eduplatform_dev` | `devuser` / `devpassword` |
| `postgres-test` | `5433` | `eduplatform_test` | `testuser` / `testpassword` |

### 2. Configure & Start Backend Server (`http://localhost:5000`)
```bash
cd server
npm ci

# Copy environment template and set DATABASE_URL to match docker-compose:
# DATABASE_URL="postgresql://devuser:devpassword@localhost:5434/eduplatform_dev"
cp .env.example .env

# Push Prisma schema to development database & seed initial data
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

### 3. Configure & Start Frontend Client (`http://localhost:3000`)
```bash
cd ../client
npm ci
npm run dev
```
> Note: Next.js automatically proxies `/api/v1/*` and `/uploads/*` to `http://localhost:5000` via [`client/next.config.mjs`](./client/next.config.mjs).

---

## 🧪 Testing & Verification

### Backend Tests (Vitest + Supertest)
```bash
cd server

# Sync schema to the isolated test database (Port 5433)
npm run db:push:test

# Run all 55 backend test suites serially (313 tests)
npm test

# Type-check backend code
npm run typecheck
```

### Frontend Typecheck, Lint & Build
```bash
cd client
npm run typecheck
npm run lint
npm run build
```

### End-to-End Tests (Playwright)
```bash
cd client
npx playwright test
```

---

## 📚 Documentation Index

All architectural and operational documentation lives in [`docs/`](./docs/README.md):

- [**00 — Overview**](./docs/00-OVERVIEW.md): Product scope, 3-role matrix, and feature status.
- [**01 — Architecture**](./docs/01-ARCHITECTURE.md): Request pipeline, module pattern, and client-server integration.
- [**02 — Local Setup**](./docs/02-SETUP.md): Detailed environment variables, database sync, and troubleshooting.
- [**03 — Data Model**](./docs/03-DATA-MODEL.md): Complete reference for all 35 Prisma models and 20 enums.
- [**04 — Auth & Security**](./docs/04-AUTH-AND-SECURITY.md): JWT rotation, TOTP MFA, RBAC, entitlement resolver, and known security gaps.
- [**05 — Features**](./docs/05-FEATURES.md): Feature-by-feature breakdown across all domains.
- [**06 — API Catalog**](./docs/06-API-CATALOG.md): Complete REST endpoint catalog under `/api/v1`.
- [**07 — Operations & CI**](./docs/07-OPERATIONS.md): Testing, CI pipeline, storage, and production checklist.
- [**08 — Gap Log**](./docs/08-GAP-LOG.md): Known bugs, unmounted UI components, stubs, and technical risks.
- [**09 — Roadmap & Simplification Plan**](./docs/09-ROADMAP.md): Prioritized engineering roadmap and simplification strategy.
