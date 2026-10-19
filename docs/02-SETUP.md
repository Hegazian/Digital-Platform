# 02 — Local Setup & Environment

## Prerequisites

- Node.js **22** (CI uses Node 22)
- npm
- Docker + Docker Compose (Postgres + Redis)
- (Optional) Supabase project for remote video/material storage
- (Optional) Resend API key, Paymob/Fawry secrets, Gemini API key

---

## 1. Clone & install

```bash
git clone git@github.com:Hegazian/Digital-Platform.git
cd Digital-Platform

# Two independent packages (not a root workspace)
cd server && npm ci
cd ../client && npm ci
```

Root `node_modules/` is essentially empty Vite cache — **do not** run `npm install` at repo root expecting a workspace.

---

## 2. Start infrastructure

From repo root:

```bash
docker compose up -d
```

| Service | Container | Host port | User / password | Database |
|---------|-----------|-----------|-----------------|----------|
| `postgres-dev` | postgres:15-alpine | **5434** | `devuser` / `devpassword` | **`eduplatform_dev`** |
| `postgres-test` | postgres:15-alpine | **5433** | `testuser` / `testpassword` | **`eduplatform_test`** |
| `redis` | redis:7-alpine | 6379 | — | — |

Volumes: `postgres_dev_data`, `postgres_test_data`, `redis_data`.

**Note:** Older READMEs say DB `eduplatform` on 5434 — the compose file uses **`eduplatform_dev`** and user `devuser`. Use compose values.

---

## 3. Server environment

Copy `server/.env.example` → `server/.env` and fill in:

| Key | Required | Notes |
|-----|----------|-------|
| `PORT` | optional | Default `5000` |
| `DATABASE_URL` | **yes** | See below — must match compose, **not** the example default |
| `DIRECT_URL` | recommended | Prisma multi-URL / accelerate style; used by Prisma config |
| `JWT_SECRET` | **prod: yes** | ≥32 chars in production; boot fails otherwise |
| `JWT_EXPIRES_IN` | optional | Default `15m` |
| `JWT_REFRESH_SECRET` | **prod: yes** | ≥32 chars production |
| `JWT_REFRESH_EXPIRES_IN` | optional | Default `7d` |
| `VIDEO_STREAM_SECRET` | optional | Local video stream token secret; falls back to `JWT_SECRET` |
| `UPLOADS_DIR` | optional | Absolute path override for uploads root |
| `PAYMOB_HMAC_SECRET` | **prod: yes** | Webhook HMAC |
| `FAWRY_SECRET_KEY` | **prod: yes** | Webhook signature |
| `RESEND_API_KEY` | optional | Real keys start with `re_`; placeholder `re_test_key` uses console mock |
| `FRONTEND_URL` / `CLIENT_URL` | optional | CORS origin, default `http://localhost:3000` |
| `SUPABASE_URL` | optional | Remote object storage |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Supabase REST upload |
| `GEMINI_API_KEY` | optional | AI tutor |
| `TRUST_PROXY` | optional | `true` behind nginx/ALB for rate limits |
| `AUTH_RATE_LIMIT_MAX` | optional | Auth rate limit max (prod default 50) |
| `NODE_ENV` | optional | `development` / `test` / `production` |

### Correct DATABASE_URL for local compose

```bash
# server/.env  (matches docker-compose.yml)
DATABASE_URL="postgresql://devuser:devpassword@localhost:5434/eduplatform_dev"
DIRECT_URL="postgresql://devuser:devpassword@localhost:5434/eduplatform_dev"
```

`.env.example` currently ships `localhost:5432/eduplatform` — **override it** to match compose.

### Secrets in non-production

`utils/env.ts` generates **ephemeral random secrets** for JWT/video/payment keys when not in production (reset on restart; not forgeable). Production **requires** real secrets of sufficient length at boot.

### Client environment

`client/.env` (or `.env.local`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

If unset, the client defaults to relative `/api/v1` and relies on Next rewrites to `API_PROXY_TARGET` or `http://localhost:5000`.

---

## 4. Database schema sync

Schema is pushed to PostgreSQL via Prisma:

```bash
cd server
npm run db:push          # dev DB (eduplatform_dev)
npm run db:push:test     # test DB (eduplatform_test) via scripts/db-env.js
npm run db:reset:test    # force-reset test DB
```

Seeding:

```bash
cd server
npm run db:seed          # npx prisma db seed → prisma/seed.ts
```

Seed creates default educational stages, grades, subjects, curriculum structure, and **admin user(s)**.

Create/promote an admin later:

```bash
cd server
npm run create:admin     # node create-admin.js
```

Default seed admin referenced in older docs: `admin@eduplatform.com` / `AdminPass123!` — **change this in any shared environment**.

---

## 5. Run the apps

### Terminal A — API

```bash
cd server
npm run dev              # tsx watch src/server.ts → http://localhost:5000
```

Sanity checks:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/
```

### Terminal B — Client

```bash
cd client
npm run dev              # next dev → http://localhost:3000
```

Same-origin `/api/v1` and `/uploads` are rewritten to the API origin, so cookies work without CORS in the browser.

---

## 6. Typecheck & tests

```bash
# Server
cd server
npm run typecheck
npm test                 # vitest, serial file execution (DB contention)

# Client
cd client
npm run typecheck
npm run lint             # next lint
npm run build            # quality gates: eslint + tsc failures fail the build
```

Playwright E2E:

```bash
cd client
npx playwright install
npx playwright test
```

`playwright.config.ts` starts **both** Next (3000) and the server dev API (5000) via `webServer`. Some configuration tests need `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`.

---

## 7. Optional storage & AI

| Feature | Config |
|---------|--------|
| Video/material upload | Without Supabase: files land under `server/uploads/` (gitignored). With Supabase: set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. |
| AI tutor | Set `GEMINI_API_KEY` in `server/.env`; call `POST /api/v1/ai/tutor` |
| Email | `RESEND_API_KEY` real key; otherwise console mock emails |

---

## 8. Test database workflow

CI (`.github/workflows/ci.yml`) provisions its own Postgres service on **5433** with env:

- `DATABASE_URL` → `eduplatform_test`
- JWT secrets, Paymob/Fawry test secrets

Locally, ensure `postgres-test` is up and:

```bash
cd server
npm run db:push:test
npm test
```

`.env.test` uses port 5433 / `eduplatform_test` / `testuser`-style credentials — keep it aligned with compose.

---

## 9. Common pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Prisma connection refused | Wrong port/DB name | Use 5434 + `eduplatform_dev` + `devuser`/`devpassword` |
| Cookie login fails cross-origin | Hitting API directly on :5000 from :3000 | Use Next rewrites / same-origin `/api/v1` |
| Payment webhook 401/403 | Missing/wrong HMAC or Fawry secret | Set secrets; fail-closed is intentional |
| 403 on course videos | No entitlement | Free-enroll or admin-grant / purchase / voucher |
| Tests fight over DB | Parallel vitest | Keep `--no-file-parallelism` (already in npm test) |
| Auth rate limited in tests | Production limit 50/15min | Non-production uses 1000; don't set `NODE_ENV=production` for E2E |
| Uploads missing in git | `.gitignore` | Expected; use seed/demo or re-upload |

---

## 10. Security notes for local vs production

- Never commit `.env` (gitignored).
- Production boot **fails** if `JWT_SECRET` / `JWT_REFRESH_SECRET` (and payment secrets when commerce is used) are missing or weak.
- Public register cannot create ADMIN accounts.
- Rotate seed admin password immediately on any shared deploy.
