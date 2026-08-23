# Deep-Dive Analysis & Enhancement Plan
> Audit date: 2026-08-22 · Scope: full stack (`server/`, `client/`, infra) · Baseline: post-Phase-0–4 implementation (27/28 requirements ✅ per `REQUIREMENTS_COVERAGE.md`)

---

## 1. Current State Summary

| Area | State |
|---|---|
| Functional requirements | 27/28 ✅ (only Playwright *browser* runs of E2E journeys pending; API-level journeys green) |
| Security posture | All P0 code defects closed (answer leaks, lifecycle bypass, IDOR cluster, enrollment gates, revocation, MIME whitelists). Residual items in §2. |
| Tests | ~270 backend tests green incl. 10-test E2E journey suite; client tsc clean |
| CI | Backend typecheck + vitest on Postgres service; frontend lint + build |

The platform is feature-complete for the MVP spec. What follows are **verified remaining issues** (re-checked against the code today) and an enhancement roadmap.

---

## 2. Remaining Issues (verified, prioritized)

### P0 — Security & Data Safety

| # | Issue | Evidence | Impact |
|---|---|---|---|
| S1 | **Secrets remain in git history** (env files unstaged from index but present in history; rotation still pending) | `git log --all -- server/.env` | Full compromise of DB/JWT/email if repo leaks |
| S2 | **Weak JWT fallback secrets**: `'secret'`, `'refresh_secret'`, video-stream `'fallback-secret'` when env unset | `utils/jwt.ts:3-5`, `video.controller.ts:69` | Forgeable tokens on misconfigured deploys |
| S3 | **MFA half-auth bypass**: `mfa_challenge`-purpose token accepted by `authenticate` (purpose claim ignored) → profile/progress reachable without completing MFA | `auth.middleware.ts` (no purpose check), `auth.service.ts:89` | Second factor skippable on non-role-guarded routes |
| S4 | **Account-state enumeration**: login returns distinct "deactivated"/"pending approval" *before* password compare | `auth.service.ts:66-72` | Account probing without credentials |
| S5 | **No refresh-token rotation / reuse detection**; refresh valid 7d, never stored/blacklisted | `auth.service.ts:165-190` | Stolen refresh token = 7-day access |
| S6 | **Shared dev/test database**: `.env` and `.env.test` point to the same Supabase instance | both env files | Test runs mutate real data; cleanup risk |
| S7 | **Stale role / teacherStatus claims**: deactivation revokes ≤30s, but role demotions / teacher unapproval take effect only at token expiry; `requireApprovedTeacher` trusts stale claim | `auth.middleware.ts:66` | Demoted teachers keep powers ≤15 min |
| S8 | Payload logging incl. potential passwords | `admin.controller.ts:49` console.log | Credential leakage to logs |
| S9 | IP-keyed rate limits without `trust proxy`; no per-user limits | `app.ts:60-78` | Broken limiting behind proxy |

### P1 — Correctness & Data Integrity

| # | Issue | Evidence | Impact |
|---|---|---|---|
| D1 | **No migration history** — schema evolves via `prisma db push` | no `prisma/migrations/` | Unauditable prod upgrades |
| D2 | **Missing hot-path indexes**: `courses(teacherId)`, `courses(status,isPublished)`, `lessons(moduleId/sectionId)`, `assignments(lessonId)` have none | schema.prisma @@index audit | Slow dashboards/catalog at scale |
| D3 | **Soft-delete column unused**; hard deletes with hand-rolled cascades; ARCHIVED courses deletable by owner | `course.service.ts deleteCourse`, schema `deletedAt` | Accidental permanent data loss |
| D4 | **Assessment↔lesson link missing** → teacher analytics aggregates span subjects, not own lessons | schema Assessment model | Imprecise teacher KPIs (documented compromise) |
| D5 | Local-upload fallback files not served by any static route found in `app.ts` | grep: no express.static | Local-mode uploads unreachable |
| D6 | Free-preview lesson flag (`isFreePreview`) not honored by player access gate | `VideoPlayerSection.computeAccess` | Preview UX per spec section 7 unavailable |

### P2 — Code Quality & Frontend Hygiene

| # | Issue | Evidence |
|---|---|---|
| Q1 | Dead components: `StudentQuiz.tsx`, `MaterialUploader.tsx`, `LessonMaterialList.tsx`, `GradingCenter.tsx` (0 references each) | grep refs = 0 |
| Q2 | Tokens in localStorage (XSS-readable); no CSP beyond helmet defaults | `lib/api.ts`, `store.ts` |
| Q3 | `alert()/confirm()` dialogs; zustand hydration flash on guarded pages | various |
| Q4 | Hardcoded localhost API fallbacks (`configStore`, dead `MaterialUploader`) | grep localhost:5000 |
| Q5 | Coverage thresholds configured (80%) but CI runs vitest without coverage enforcement | vitest.config.ts + ci.yml |
| Q6 | Playwright stage commented out in CI; existing browser specs shallow/skipped | ci.yml |

---

## 3. Enhancement Plan

### Horizon 1 — Hardening (1–2 weeks, do first)
| ID | Item | Addresses |
|---|---|---|
| H1 | ✅ **DONE 2026-08-23** — history purged (filter-repo, force-pushed), JWT secrets rotated (48-byte), scratch cred-bearing files deleted. *Provider-side rotation checklist issued to owner.* | S1 |
| H2 | Fail-fast startup if `JWT_SECRET`/`JWT_REFRESH_SECRET` absent or <32 chars; single shared secret module | S2 |
| H3 | Reject `purpose === 'mfa_challenge'` tokens in `authenticate` (accept only at `/auth/mfa-login`) | S3 |
| H4 | Uniform login failure: always bcrypt-compare vs dummy hash, single generic error | S4 |
| H5 | Refresh-token rotation: hash+store jti family on User/RefreshToken table, detect reuse → revoke family | S5 |
| H6 | Split dev/test databases; add `docker-compose` app services for local dev | S6 |
| H7 | Embed `role`/`teacherStatus` version counter in JWT; bump on admin changes → instant effect | S7 |
| H8 | Remove payload logging; add `trust proxy`; per-user rate limit on login/attempts/uploads | S8, S9 |

### Horizon 2 — Platform Capabilities (3–6 weeks)
| ID | Item | Notes |
|---|---|---|
| C1 | **Migrations discipline**: baseline + `prisma migrate dev/deploy` in CI; forbid db push in prod | D1 |
| C2 | **Index pass** with slow-query review (`courses`, `lessons`, `assignments`, composite `(studentId,status)` etc.) + `EXPLAIN` benchmarks | D2 |
| C3 | **Soft-delete adoption** for Course/Lesson (query filters + restore tooling); archive-protection rules | D3 |
| C4 | **Background jobs** (BullMQ + existing Redis): email queue, video post-processing, webhook retries, nudge cron | reliability |
| C5 | **Video pipeline**: transcode to HLS via ffmpeg worker + signed CDN URLs; replace direct stream endpoint | scale |
| C6 | **Free-preview gating** end-to-end (flag honored by player + signed-URL scope) | D6 |
| C7 | **Observability**: pino structured logs w/ request ids, Sentry, Prometheus `/metrics`, deeper `/health` (db+storage probes) | ops |
| C8 | **OpenAPI/Swagger** generated from zod schemas; typed client generation for Next.js | DX |
| C9 | **Assessment↔Lesson FK** migration to fix analytics scoping properly | D4 |
| C10 | Frontend cleanup sprint: delete dead components, toast/dialog system replacing alert/confirm, SSR-safe hydration guards, env-only API base URL | Q1–Q4 |

### Horizon 3 — Product & Scale (quarter)
| ID | Item |
|---|---|
| P1 | Payments automation: Paymob/Fawry webhook-driven entitlements (module scaffolding exists), invoices, refunds |
| P2 | Notifications center expansion: push (web-push), digest emails, per-user preferences UI |
| P3 | Certificates v2: PDF rendering worker, public verification page (model exists) |
| P4 | Live classes: Zoom/Webinar integration hardening + recordings attached to lessons |
| P5 | Discussions upgrades: moderation queue, rich media, search |
| P6 | Mobile app (React Native/Expo) sharing the OpenAPI client |
| P7 | Scale-out: read replica for analytics queries, pgBouncer tuning, audit-log partitioning, cache-aside Redis for catalog |
| P8 | Accessibility (WCAG 2.1 AA) + full AR/EN i18n sweep of new surfaces |

### Testing & CI additions
- Enforce coverage thresholds in CI (`vitest run --coverage.enabled` already configured thresholds).
- Enable Playwright job in CI with built frontend + seeded Postgres; port the three journey scenarios to browser specs.
- Add k6 smoke load profile for catalog/player/quiz endpoints.
- Dependabot + `npm audit --production` gate.

---

## 4. Suggested Sequencing

```text
Week 1      : H1–H8 (security closure) + C1 (migrations)     ← blocks production launch
Weeks 2–3   : C2 indexes, C10 frontend cleanup, C7 observability
Weeks 3–6   : C4 jobs, C5 video pipeline, C8 OpenAPI, C9 schema fix
Quarter     : Horizon 3 product tracks (parallelizable)
```

**Definition of done for Horizon 1:** no plaintext secrets anywhere in repo/history; all auth flows resistant to enumeration/replay/stale-claim attacks (verified by new tests); dev/test isolation proven by separate connection strings in CI.
