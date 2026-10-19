# 01 — Architecture

## High-level view

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14 App Router, port 3000)                │
│  • Zustand (auth/lang/config) + React Query                │
│  • fetch wrapper `fetchApi` + auto-refresh on 401          │
│  • Edge middleware role gate (cookie JWT payload)           │
└───────────────────────────┬─────────────────────────────────┘
                            │ same-origin /api/v1 rewrite
                            │ (httpOnly cookie `eduplat_rt`)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Express 5 + TypeScript API (port 5000)                    │
│  • helmet / cors / rate-limit / morgan / request-id        │
│  • 19 domain modules under /api/v1/*                       │
│  • Zod validation, RBAC middleware, entitlement resolver   │
│  • Prisma ORM → PostgreSQL 15                              │
│  • Multer disk uploads → Supabase Storage or local uploads/│
│  • Resend email, Gemini AI, Paymob/Fawry webhooks          │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
              PostgreSQL (dev eduplatform_dev :5434)
              (test eduplatform_test :5433 in CI/Vitest)
```

**Pattern:** Modular monolith. Domain modules own routes/controllers/services. Cross-cutting concerns (auth, validation, entitlements) are composed as middleware chains inside route files.

There is **no** NestJS, TypeORM, GraphQL, message queue, or separate collab server in this repository (despite older design docs).

---

## Server package layout

```
server/
├── package.json
├── tsconfig.json              # CommonJS, strict, rootDir src → outDir dist
├── vitest.config.ts           # globals, node env, fileParallelism: false
├── .env / .env.example / .env.test
├── prisma/
│   ├── schema.prisma          # 32 models, 16 enums
│   └── seed.ts                # subjects, admin, curriculum
├── scripts/
│   ├── db-env.js              # run prisma CLI against a given env file
│   └── run-demo.ts
├── create-admin.js
├── tests/setup.ts             # loads .env.test, sets NODE_ENV=test
└── src/
    ├── server.ts              # dotenv + app.listen(PORT)
    ├── app.ts                 # middleware + mounts (see below)
    ├── prisma.ts              # PrismaClient singleton
    ├── modules/<domain>/      # routes.ts, controller.ts, service.ts, __tests__/
    └── utils/                 # jwt, env, schemas, storage, email, …
```

### Scripts

| Script | Command |
|--------|---------|
| `dev` | `tsx watch src/server.ts` |
| `build` | `tsc` |
| `start` | `node dist/server.js` |
| `test` | `vitest run --no-file-parallelism` |
| `typecheck` | `tsc --noEmit` |
| `db:push` | `prisma db push` (dev DB) |
| `db:push:test` | `node scripts/db-env.js .env.test db push` |
| `db:reset:test` | `node scripts/db-env.js .env.test db push --force-reset` |
| `db:seed` | `npx prisma db seed` |
| `create:admin` | `node create-admin.js` |

---

## Middleware pipeline (`src/app.ts`)

Order matters:

| # | Middleware | Behavior |
|---|------------|----------|
| 0 | Proxy trust | `trust proxy` when `TRUST_PROXY=true` (per-IP rate limits behind nginx/ALB) |
| 1 | Request ID | Honor inbound `x-request-id` (printable ASCII ≤128) else `crypto.randomUUID()`; echo header |
| 2a | Helmet | `crossOriginResourcePolicy: 'cross-origin'` |
| 2b | CORS | Origin from `CLIENT_URL` / `FRONTEND_URL` (default `http://localhost:3000`); `credentials: true` |
| 2c | Body parser | `express.json()` |
| 2d | Protected uploads | Blocks direct unauthenticated access to `/uploads/lesson-videos/*` and `/uploads/lesson-materials/*` with `403 Forbidden` before `express.static(getUploadsRoot())` |
| 2e | Morgan | `combined`; skipped when `NODE_ENV=test` |
| 3a | Global rate limit | `/api` — **1000 req / 15 min / IP** |
| 3b | Auth rate limit | login, register, mfa-login, refresh, `/api/v1/mfa` — **50 / 15 min in production** (`AUTH_RATE_LIMIT_MAX`); 1000 outside production for local E2E |
| 4 | Health | `GET /health` and `GET /api/v1/health` — DB `SELECT 1`, uptime, heap/rss |
| 5 | Root welcome | `GET /` — JSON API index |
| 6 | Routes | All module routers under `/api/v1/...` |
| 7 | Error handler | Prisma **P2002→409, P2025→404, P2003→400**; logs with requestId; 5xx omit message detail (except dev + status <500) |

### Route mounts

```
/api/v1/auth           modules/auth/auth.routes
/api/v1/mfa            modules/auth/mfa.routes
/api/v1/subjects       modules/courses/course.routes (subjectRouter)
/api/v1/courses        modules/courses/course.routes (courseRouter)
/api/v1/videos         modules/videos/video.routes
/api/v1/subscriptions  modules/subscriptions/subscription.routes
/api/v1/admin          modules/admin/admin.routes
/api/v1/quizzes        modules/quizzes/quiz.routes
/api/v1/materials      modules/materials/material.routes
/api/v1/progress       modules/progress/progress.routes
/api/v1/academic       modules/academic/academic.routes
/api/v1/commerce       modules/commerce/commerce.routes
/api/v1/notifications  modules/notifications/notification.routes
/api/v1/teacher        modules/teacher/teacher.routes
/api/v1/live           modules/live/live.routes
/api/v1/config         modules/config/config.routes
/api/v1/discussions    modules/discussions/discussion.routes
/api/v1/ai             modules/ai/ai.routes
/api/v1/audit          modules/audit/audit.routes
/api/v1/assignments    modules/assignments/assignment.routes
```

Health also mounted at non-versioned `/health`.

---

## Module pattern

Each domain module follows the same shape:

```
modules/<domain>/
├── <name>.routes.ts       # Router + middleware chain
├── <name>.controller.ts   # Thin: parse req → call service → shape response
├── <name>.service.ts      # Static class methods + Prisma + business rules
└── __tests__/             # Vitest integration/service specs
```

**Conventions**

- Services own business rules; controllers do not touch Prisma directly for complex flows.
- Validation: `validateBody(schema)` / `validateQuery(schema)` from `utils/validate.ts`.
- Auth: `authenticate` → `requireRole([...])` / `requireApprovedTeacher` / `optionalAuth`.
- Entitlement: `assertLearningAccess` on learning endpoints (quizzes, assignments, progress, video playback, material downloads).
- Errors: throw `AppError` subclasses from `utils/errors.ts`.
- Student-only commerce routes explicitly pass `allowAdminBypass=false` so admins cannot accidentally self-grant via admin APIs that call student checkout paths.

### Domain modules (19)

`academic`, `admin`, `ai`, `assignments`, `audit`, `auth`, `commerce`, `config`, `courses`, `discussions`, `health`, `live`, `materials`, `notifications`, `progress`, `quizzes`, `subscriptions`, `teacher`, `videos`

---

## Client package layout

```
client/
├── next.config.mjs         # rewrites /api/v1 + /uploads → API origin; quality gates ON
├── playwright.config.ts    # dual webServer: Next :3000 + API :5000
├── e2e/                    # accessibility, auth, configuration, courses, navigation, routing, video
└── src/
    ├── middleware.ts       # edge role gate on /admin|/teacher|/student|/profile
    ├── app/                # pages
    ├── components/         # shared + admin + teacher + player + ui
    └── lib/
        ├── api.ts          # fetchApi, auto-refresh, response envelope
        ├── apiTypes.ts
        ├── store.ts        # useAppStore (Zustand persist: lang, user, token, …)
        ├── configStore.ts  # useConfigStore (branding, flags, homeContent)
        ├── useRequireRole.ts
        └── useT.ts         # t(en, ar) bilingual helper
```

### API integration

- Base URL: `NEXT_PUBLIC_API_URL` or `/api/v1` (same-origin via Next rewrite → avoids CORS).
- Access token: `localStorage.accessToken` + Zustand `token`; sent as `Authorization: Bearer`.
- Refresh token: **httpOnly cookie `eduplat_rt`**; never readable by JS; `credentials: 'include'`.
- 401 handling: single-flight refresh → retry original request; dead session clears store + dispatches `eduplat:session-expired` → React Query `clear()`.
- Response envelope: `{ success, message?, data }` (`lib/apiTypes.ts`).

### State management

| Store | Purpose |
|-------|---------|
| `useAppStore` | lang/dir, user, token, selected course/subject; persist key `eduplatform-storage` |
| `useConfigStore` | Public `/config` branding, feature flags, `primaryColor` CSS var, `homeContent` marketing copy |
| React Query | Server cache; defaults `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false` |

**No React Context** is used in `client/src`.

### Client routing

| Route | Guard |
|-------|-------|
| `/` | public |
| `/courses`, `/courses/[courseId]` | public catalog/player; entitlement checked server-side |
| `/login`, `/register` | public (redirect if already authed) |
| `/student/dashboard` | roles STUDENT, ADMIN |
| `/teacher/dashboard` | roles TEACHER, ADMIN |
| `/admin/dashboard` | role ADMIN |
| `/profile` | all three roles |

Edge middleware reads the refresh cookie JWT payload, validates `exp` and the `(STUDENT | TEACHER | ADMIN)` role allowlist, and redirects by role prefix. Client hook `useRequireRole` provides hydration-aware gating after Zustand persist loads.

Post-login landing: `dashboardPathFor(role)` → admin/teacher/student dashboard paths.

---

## Cross-cutting server utilities

| File | Role |
|------|------|
| `utils/env.ts` | Central secrets; **production fail-fast** if missing or &lt;32 chars; dev/test get ephemeral random secrets |
| `utils/jwt.ts` | Access (15m default) + refresh (7d default, includes `jti`) sign/verify |
| `utils/totp.ts` | RFC 6238 verify with persisted time-step replay protection |
| `utils/validate.ts` | Zod body/query middleware (Express 5 `req.query` workaround) |
| `utils/schemas.ts` | ~45 Zod schemas for business payloads |
| `utils/storage.ts` | Supabase Storage REST upload + local `uploads/` fallback; signed URLs |
| `utils/email.ts` | Resend + console fallback; bilingual welcome emails |
| `utils/cache.ts` | In-memory TTL Map (not Redis) |
| `utils/currency.ts` | EGP source of truth; USD via `AppConfig.exchangeRateUsdToEgp` (60s cache) |
| `utils/errors.ts` | `AppError` + 400/401/403/404/409 |
| `utils/eventBus.ts` | In-process pub/sub (`EventDispatcher`); handler errors logged not thrown |
| `utils/webhook-security.ts` | Paymob HMAC-SHA512 + Fawry SHA-256 verification |
| `utils/logger.ts` | Structured JSON logs with requestId |

---

## Data flow examples

### Login → MFA → refresh

1. `POST /api/v1/auth/login` → bcrypt compare.
2. If `mfaEnabled` and no code → return `{ mfaRequired: true, mfaSessionToken }` (JWT with `purpose: 'mfa_challenge'`; rejected by `authenticate` as session token).
3. `POST /api/v1/auth/mfa-login` → TOTP verify (replay-protected) → access + refresh.
4. Refresh token hash stored in `RefreshToken` row.
5. Client stores access token; refresh cookie set httpOnly.
6. Later: `POST /api/v1/auth/refresh` rotates token; reuse of revoked token **revoke-all-for-user**.

### Student accesses course video

1. `GET /api/v1/courses/:id` — optional auth visibility rules (nested media URLs and quiz answers stripped).
2. Player checks `GET /api/v1/commerce/entitlements/check-course/:courseId`.
3. If free course → `POST /api/v1/courses/:id/enroll`.
4. `GET /api/v1/videos/:videoId/playback-url` — entitlement-gated.
5. Local stream: `GET /api/v1/videos/:videoId/stream` with signed query token (`VIDEO_STREAM_SECRET`).

### Teacher publishes course

1. Teacher creates course (`status=DRAFT`) → sections → lessons → blocks.
2. Attach video/material/quiz/assignment.
3. `POST /api/v1/courses/:id/submit` → `UNDER_REVIEW` (when `AppConfig.requireCourseApproval=true`).
4. Admin `POST /api/v1/courses/:id/review` → APPROVED or REJECTED.
5. Admin `PATCH /api/v1/courses/:id/publish` → `PUBLISHED`.

---

## Error handling & observability

- Request IDs flow logs ↔ response header.
- Prisma error codes mapped centrally.
- Health endpoint: DB ping + memory metrics.
- Morgan access logs in non-test environments.
- 5xx responses do not leak internal messages in production.

---

## Design principles observed in code

1. **Entitlement-first learning access** — content, quizzes, assignments, progress writes gated by subscription/order/voucher/admin-grant.
2. **EGP as money source of truth** — USD always derived; admins set EGP prices.
3. **Bilingual domain fields** — `titleEn`/`titleAr`, `nameEn`/`nameAr`, notifications, emails.
4. **Governance by default** — course approval flag; teacher approval workflow; public registration cannot mint admins.
5. **Fail-closed security** — payment webhook secrets unset → reject; production secrets fail boot; MFA re-auth for 2FA changes.
6. **Idempotent money paths** — order `idempotencyKey` unique; voucher redeem concurrency-safe; webhook idempotency tested.
7. **Config-driven product** — branding, feature flags, home page content editable at runtime via admin UI/API.
