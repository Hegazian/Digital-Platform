# 07 — Operations, Testing & CI

## Local operations

| Process | Command | Port |
|---------|---------|------|
| API dev | `cd server && npm run dev` | 5000 |
| Client dev | `cd client && npm run dev` | 3000 |
| Postgres dev | `docker compose up postgres-dev` | 5434 |
| Postgres test | `docker compose up postgres-test` | 5433 |

Built artifacts:

```bash
cd server && npm run build   # tsc → server/dist
cd server && npm start       # node dist/server.js
cd client && npm run build   # .next production build
```

---

## Database operations

```bash
cd server
npm run db:migrate:deploy # apply versioned SQL migrations (prisma/migrations/0001_init)
npm run db:push           # schema → eduplatform_dev
npm run db:push:test      # schema → eduplatform_test
npm run db:reset:test     # force-reset test DB
npm run db:seed           # prisma/seed.ts
npm run create:admin      # create/promote admin
```

Baseline SQL migrations are stored in `server/prisma/migrations/0001_init/migration.sql` with `migration_lock.toml`.

Seed contents: default educational stages, grades, subjects, curriculum structure, and admin user(s).

---

## Environment reference

### Server `.env` keys (authoritative names)

| Key | Purpose |
|-----|---------|
| `PORT` | API port (default 5000) |
| `DATABASE_URL` | Postgres URL |
| `DIRECT_URL` | Prisma direct URL (used by config; match DATABASE_URL locally) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Access tokens |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | Refresh tokens |
| `VIDEO_STREAM_SECRET` | Local video stream signing (fallback JWT_SECRET) |
| `UPLOADS_DIR` | Optional uploads root override |
| `PAYMOB_HMAC_SECRET` | Paymob webhook HMAC |
| `FAWRY_SECRET_KEY` | Fawry webhook signature |
| `RESEND_API_KEY` | Transactional email |
| `FRONTEND_URL` / `CLIENT_URL` | CORS origin |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Remote storage |
| `GEMINI_API_KEY` | AI tutor |
| `TRUST_PROXY` | Behind proxy rate-limit trust |
| `AUTH_RATE_LIMIT_MAX` | Auth rate limit max |
| `NODE_ENV` | development / test / production |

### Client

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Optional: `API_PROXY_TARGET` for Next rewrites when not using the public API URL; `NEXT_PUBLIC_ENABLE_GATEWAY_CHECKOUT=true` to expose Paymob/Fawry checkout tabs alongside Manual Wallet and Voucher redemption.

### Test env (`.env.test`)

Isolated test DB `eduplatform_test` on **5433**, test JWT/payment secrets (`setup.ts` preserves `.env.test` values via `||=`).

---

## Vitest (server)

Config: `server/vitest.config.ts`

| Setting | Value |
|---------|-------|
| Environment | node |
| Globals | true |
| Setup | `tests/setup.ts` (loads `.env.test`, `NODE_ENV=test`, Prisma teardown) |
| Include | `src/**/*.{test,spec}.ts` |
| File parallelism | **false** (DB contention) |
| Timeouts | 45s (test + hooks) |
| Coverage | v8 (`@vitest/coverage-v8`); thresholds statements 70 / branches 60 / functions 80 / lines 70 |

Run:

```bash
cd server
npm test                 # vitest run --no-file-parallelism
npm run test:coverage    # vitest run --no-file-parallelism --coverage
npm run typecheck
```

### Test areas (co-located `__tests__`)

| Domain | Representative specs |
|--------|----------------------|
| E2E journeys | `e2e-journeys.spec.ts` |
| Auth | integration, middleware, service, MFA, profile, rate-limit, session-management |
| Courses | governance, visibility, dynamic subject, curriculum unification, section, subject, teacher architecture, media-sanitization |
| Videos | service, integration, playback |
| Materials | integration, service, download |
| Quizzes | integration, service, v2 |
| Assignments | service |
| Progress | service, tests |
| Subscriptions | integration, service |
| Commerce | integration, entitlement-resolver, manual-reconciliation, voucher-concurrency, webhook-idempotency, webhook-security |
| Academic / Admin / Teacher / Live / Notifications | integration + service specs |
| Discussions / AI / Audit / Config / Health | module specs |
| Utils | `validate.spec.ts`, `webhook-security.spec.ts` |

Current suite count: **56 test suites / 324 tests** (100% passing).

---

## Vitest + React Testing Library (client)

Config: `client/vitest.config.ts` & `client/src/test/setup.ts`

| Setting | Value |
|---------|-------|
| Environment | `jsdom` |
| Globals | true |
| Setup | `src/test/setup.ts` (`@testing-library/jest-dom`, DOM cleanup, `localStorage` & `matchMedia` mocks) |
| Include | `src/**/*.{test,spec}.{ts,tsx}` |

| File | Focus |
|------|-------|
| `src/lib/__tests__/api.spec.ts` | Bearer token injection, single-flight 401 `/auth/refresh` lock & retry, `eduplat:session-expired` event |
| `src/lib/__tests__/configStore.spec.ts` | `DEFAULT_HOME_CONTENT` fallback, partial deep merge, EN/AR localization |
| `src/components/__tests__/NotificationBell.spec.tsx` | Unread badge count, dropdown toggle, `PATCH /notifications/:id/read` |
| `src/components/__tests__/CheckoutModal.spec.tsx` | Course details, instant voucher redemption, manual wallet order submission |

Current suite count: **4 test suites / 12 tests** (100% passing).

---

## Playwright (client E2E)

Config: `client/playwright.config.ts`

| Setting | Value |
|---------|-------|
| testDir | `./e2e` |
| baseURL | `http://127.0.0.1:3000` |
| webServer | **Dual**: Next `npm run dev` (3000) + API `npm run dev` in `../server` (5000) |
| Projects | chromium, firefox, mobile-chrome (Pixel 5) |
| Retries | 2 in CI |
| Workers | 2 local / 1 CI |
| Timeout | 45s; webServer timeout 180s |
| Traces | on first retry |

Specs:

| File | Focus |
|------|-------|
| `accessibility.spec.ts` | Modal a11y contract |
| `auth.spec.ts` | Home, strict RTL/LTR language toggle (`expect(toggledDir).not.toBe(initialDir)`), login form |
| `configuration.spec.ts` | Config-driven branding regression (needs E2E admin env) |
| `courses.spec.ts` | Catalog navigation/search |
| `navigation.spec.ts` | Cross-role navigation |
| `routing.spec.ts` | Direct URLs + unauth redirects |
| `video.spec.ts` | Catalog display, invalid course fallback, and course navigation |

```bash
cd client
npx playwright install
npm run test:e2e
```

---

## CI (`.github/workflows/ci.yml`)

Triggers: push (all branches) + pull requests. Concurrency: cancel-in-progress.

### Job `server`

1. Postgres service on **5433**
2. Env: test DATABASE_URL, JWT secrets, Paymob/Fawry test secrets
3. `npm ci`
4. `prisma generate`
5. `prisma db push`
6. `npm run typecheck`
7. `npm run test:coverage` (enforces v8 coverage thresholds)

### Job `client`

1. `npm ci`
2. `npm run typecheck`
3. `npm test` (Vitest unit & component suites)
4. `npm run build`  
   (ESLint + TypeScript failures fail the build via `next.config.mjs` gates)

Node: **22**. Lockfiles required.

---

## Uploads & storage

| Path | Notes |
|------|-------|
| `server/uploads/lesson-videos/` | Local video files (gitignored; direct static access blocked with `403`, served via signed `/api/v1/videos/:id/stream`) |
| `server/uploads/lesson-materials/` | Local materials (gitignored; direct static access blocked with `403`, served via `/api/v1/materials/:id/download`) |
| Supabase Storage | When `SUPABASE_*` env set; signed URLs default ~2h |

Static serving: `GET /uploads/*` serves only non-restricted subdirectories (e.g., public thumbnails/submission files).  
Client also rewrites `/uploads/:path*` to API origin for same-origin media.

Size limits enforced at upload: video 500MB (disk-streamed via `multer.diskStorage()`), material 50MB, assignment file 20MB.

---

## Health & observability

| Endpoint | Payload |
|----------|---------|
| `GET /health`, `GET /api/v1/health` | DB ping (`SELECT 1`), uptime, `heapUsed`, `rss` |

- Structured JSON logger with `requestId`.
- Morgan `combined` access logs (skipped in `NODE_ENV=test`).
- Request ID echoed in `x-request-id`.
- 5xx responses omit internal messages in production.

---

## Production checklist (consolidated)

1. Strong `JWT_SECRET` / `JWT_REFRESH_SECRET` (≥32 chars); fail-fast enforced.
2. `VIDEO_STREAM_SECRET` set distinctly from JWT secret.
3. Paymob/Fawry secrets set if commerce live (fail-closed otherwise).
4. `NODE_ENV=production`; auth rate limits active.
5. `TRUST_PROXY=true` behind nginx/ALB.
6. HTTPS + correct `CLIENT_URL`/`FRONTEND_URL`.
7. Postgres backups + deploy versioned migrations via `npm run db:migrate:deploy`.
8. Admin seed passwords rotated; `create:admin` for real admins.
9. Upload storage (local disk or Supabase) monitored for capacity.
10. CI green on main (Server coverage + Client Vitest, Typecheck & Build).
11. Log/audit retention policy for `AuditLog`.

---

## Debugging tips

| Issue | Where to look |
|-------|----------------|
| Route 404 | `src/app.ts` mounts vs module route paths |
| 401 after deploy | Clock skew, secret rotation without refresh grace, cookie domain |
| Entitlement 403 | `commerce/entitlements/check-course/:courseId` |
| Webhook rejected | Header signature vs `webhook-security.ts`; secrets unset fail-closed |
| Upload fails | MIME/size whitelist; `UPLOADS_DIR`; Supabase env |
| Tests fail on unique | Fresh DB via `db:reset:test` |
| E2E cookie issues | Ensure Next rewrite to API :5000; don't hit :5000 directly from browser |
| Client build fails | `next.config.mjs` has `ignoreDuringBuilds: false` and `ignoreBuildErrors: false` |

---

## Repo hygiene

- `.gitignore`: env files (except `.env.example`), keys, `dist/`, `.next/`, uploads, logs, test artifacts.
- Root `node_modules/` is not a real install root — install in `client/` and `server/`.
