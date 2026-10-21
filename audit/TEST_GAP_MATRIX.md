> **Historical audit — revised scope notice (21 October 2026).** Observations below retain their original evidence. AI generation/tutoring recommendations and AI-dependent release requirements are withdrawn. Use the [current documentation](../docs/README.md) and [explicit finding/acceptance disposition](../docs/AUDIT_TRACEABILITY.md). The original body is preserved below; it is not the current product specification.

# EduPlatform test gaps and release acceptance matrix

Date: **21 October 2026**. Baseline: **2fbdc8e**. Read alongside the [product readiness review](<D:/digital platform/audit/PRODUCT_READINESS_REVIEW.md>).

There are **67 backend test files**, **7 Playwright files**, and **no frontend component/unit test files** in the current source tree. Existing tests are valuable, but test-file presence is not feature verification. The database-backed suites and browser journeys were not validated in this environment because the configured PostgreSQL services were unavailable.

The frontend did pass a clean production build and standalone typecheck after restoring its lockfile dependencies. Six additional Chromium behavior probes against that production build reproduced Arabic hydration, career-route, mixed-curriculum, text/block, whiteboard-ID and free-preview defects using intercepted API fixtures. [Browser observations](<D:/digital platform/audit/browser-probe-results.json>). These isolated frontend probes do not replace the missing real API/database journeys.

## 1. What the executed checks establish

The selected **16 database-independent test files passed all 108 tests**. Their V8 coverage run failed the configured 80% statement/line/function and 75% branch thresholds:

| Measurement | Selected-run coverage |
|---|---:|
| Statements | 46.70% |
| Branches | 34.48% |
| Functions | 66.37% |
| Lines | 47.41% |

This run covers imported files only. It excludes most controllers, the application route assembly, several complete backend domains, and all React behavior. **It must not be described as the project's total coverage.** Add an explicit production-source `coverage.include`, exclude test files intentionally, and execute all required suites against a disposable test database before using a whole-project percentage.

Examples of code not exercised adequately by the selected unit suite:

| Source | Statements executed | Important missing behavior in this run |
|---|---:|---|
| [course.service.ts](<D:/digital platform/server/src/modules/courses/course.service.ts>) | 126 / 355 | Answer sanitization callbacks, many resource and curriculum edits, publication completeness branches, roster calculations. |
| [entitlement-resolver.service.ts](<D:/digital platform/server/src/modules/commerce/entitlement-resolver.service.ts>) | 6 / 67 | Effective access through subscriptions, course grants, subject grants, bundles and expiry. |
| [section.service.ts](<D:/digital platform/server/src/modules/courses/section.service.ts>) | 6 / 38 | Update/delete/reorder and cross-course ownership branches. |
| [progress.service.ts](<D:/digital platform/server/src/modules/progress/progress.service.ts>) | 9 / 60 | Course hydration, mixed curriculum aggregation, grades and progress summaries. |
| [quiz.service.ts](<D:/digital platform/server/src/modules/quizzes/quiz.service.ts>) | 72 / 149 | Real transaction commit/rollback, start/resume expiry, definition replacement, multiple-answer cases. |
| [assignment.service.ts](<D:/digital platform/server/src/modules/assignments/assignment.service.ts>) | 37 / 82 | Submission creation, deadline/attempt interactions, grading and concurrent requests. |
| [auth.service.ts](<D:/digital platform/server/src/modules/auth/auth.service.ts>) | 68 / 126 | Durable refresh registration/rotation, replay races, several account-state branches. |
| [schemas.ts](<D:/digital platform/server/src/utils/schemas.ts>) | 48 / 101 | Many refinements, invalid URLs, date relationships and nested assessment inputs. |

See [raw unit results](<D:/digital platform/audit/unit-tests.json>), [coverage HTML](<D:/digital platform/audit/unit-coverage/index.html>), and [coverage JSON](<D:/digital platform/audit/unit-coverage/coverage-final.json>) for exact statement/branch locations. A zero hit here means **not exercised in this run**, not necessarily never exercised by an unrun integration test.

## 2. Existing tests that can give false confidence

| Existing check | Why it is insufficient | Strengthen it with |
|---|---|---|
| [Expired quiz attempt test](<D:/digital platform/server/src/modules/quizzes/__tests__/quiz.v2.spec.ts:253>) | Its name says the expiry is recorded, but it asserts the 400 response/message and never checks that the transaction committed the expired state. The source throws after updating inside the transaction. | Reload the attempt after the error; assert terminal status, counted attempt, and next-attempt behavior. |
| [Course visibility sanitizer](<D:/digital platform/server/src/modules/courses/__tests__/course.visibility.spec.ts:139>) | Recursively searches for `isCorrect`; does not search for `correctAnswer`, `correctAnswerJson`, raw snapshots, paid URLs, text bodies or block configuration. | A recursively forbidden-field set plus explicit public/student/owner response DTO schemas for every question/resource type. |
| [Payment signature tests](<D:/digital platform/server/src/modules/commerce/__tests__/webhook-security.spec.ts>) | Helpers reproduce the application's custom signing format. Both test and implementation can agree while a real gateway disagrees. | Unmodified official sandbox payload/signature fixtures, nested payloads, exact currency/amount and transaction-state mapping. |
| [Voucher concurrency test](<D:/digital platform/server/src/modules/commerce/__tests__/voucher-concurrency.spec.ts>) | Checks the global use cap across different students; does not test the same student racing several redemptions. | Same-student, same-voucher concurrent calls and cross-voucher access/renewal policy. |
| [Browser video suite](<D:/digital platform/client/e2e/video.spec.ts:17>) | Both important paid-access/player scenarios are explicitly skipped. | Required entitled and unentitled browser journeys, raw-file denial, signed playback, actual seek/end behavior. |
| [Language toggle test](<D:/digital platform/client/e2e/auth.spec.ts:13>) | Accepts either `rtl` or `ltr` after clicking. It does not establish a change, persistence, or correct language. | Assert exact before/after `html.lang`, `html.dir`, translated labels, then reload and reassert. |
| [Catalog test](<D:/digital platform/client/e2e/courses.spec.ts:35>) | Card assertions run only when there are cards. An empty catalog or failed API can pass. | Seed known courses; require their IDs/titles/prices; assert loading/error/empty states separately. |
| Admin browser cases | Skip when credentials are missing. CI has no browser job provisioning the expected accounts. | Disposable seeded admin/teacher/student identities and no conditional skipping in the required release project. |
| Health tests | Explicitly accept degraded state with HTTP 200. | Separate liveness and readiness assertions, including DB/storage dependency failure. |
| Backend fixtures | Several create users with invalid/plain password placeholders or inconsistent course/product data, bypassing real onboarding and resource validation. Some cleanup calls delete whole tables. | Use realistic factories through appropriate boundaries, assert fixture invariants, and isolate/reset a dedicated disposable database. |

## 3. Domain coverage and missing scenarios

File counts below are an inventory, not a claim that those tests currently pass.

| Domain | Existing backend test files | Highest-priority gaps |
|---|---:|---|
| Authentication / MFA | 9 | Role/password/approval mutation revocation; rejected login; concurrent refresh; tab races; atomic TOTP replay; recovery; real cookie/proxy deployment. |
| Courses / sections / blocks / board / playground | 14 | Public paid-content redaction; private visibility; mixed tree rendering; exactly-one-parent invariant; reviewed versions; body validation; correct board IDs and capabilities; isolated execution. |
| Commerce / access | 6 | Real gateway contracts; subscription/paywall parity; resource validation; scoped order idempotency; refund/reversal; same-student voucher race; future grants. |
| Quizzes | 3 | Expiry state after rollback; due dates; immutable question snapshots; teacher ownership on reads; essay review; reload/resume deadlines; attempt concurrency. |
| Assessments | 2 | Raw submission/expiry answer snapshots; ownership and course scope; exact state transitions; submission races; per-type grading and answer review policy. |
| Assignments | 1 | HTTP/upload integration and browser authoring/grading; access-controlled reads/files; same-student concurrency; reassigned/deleted lesson handling; legitimate rubric feedback. |
| Videos | 3 | Anonymous raw files; fake MIME/extensions; actual supported media, malformed/suffix/out-of-range requests, stream disconnect/error, expired grants and large/resumable uploads. |
| Materials | 2 | Private file downloads, spoofed MIME/extensions, malware/quarantine behavior, cloud storage failure and orphan cleanup. |
| Subscriptions | 2 | Expired ACTIVE renewal; month-end/leap-year boundaries; concurrent approve/reject; actual displayed and effective access duration. |
| Progress | 2 | Browser watch-time/resume; repeated/out-of-order heartbeats; completion retry; module+section totals; pending quiz status in averages; archived content. |
| Teacher | 1 | Identity-body override; announcements from UI; recipient parity across all access sources; private student analytics; real ledger revenue. |
| Live | 1 | Identity override; real meeting lifecycle; entered URL persistence; subject IDs in dashboard contract; all enrolled subjects; timezone/display/attendance. |
| AI | 1 | Existing tests only establish a nonempty answer and empty-prompt rejection. Missing source grounding, Arabic output, provider/model availability, citations, prompt injection, leakage, cost/time limits and educational accuracy. |
| Academic structure | 1 | Versioned curriculum/year/term constraints, grade uniqueness, safe deletion with enrolled students, future/year-specific mappings, Arabic search. |
| Admin | 2 | Security changes through every edit path; actual audit actor; last-admin/self-demotion policy; historical paid-resource deletion. |
| Config | 2 | Exchange-rate save/read/checkout parity; server feature policy; singleton initialization races; malformed nested home content. |
| Careers | 1 | Correct catalog API route; controlled subject mapping; active/inactive selection, cross-account preferences and recommendation eligibility. |
| Collections | 2 | Published collection containing draft/private/archived course metadata; paging and access semantics if sold as bundles. |
| Podcasts | 3 | Actual playable private/public media policy, invalid stored URLs, upload ownership, large playlists, mobile playback and caption/transcript accessibility. |
| Discussions | 1 | Course membership and privacy; forged lesson/course associations; spam, moderation, deletion, reporting and pagination. |
| Notifications | 1 | Duplicate/outbox delivery; enrolled audience accuracy; retries; read ownership; pagination and UI discovery. |
| Audit | 1 | Review actor FK, DB outage durability, cross-process behavior, sensitive field redaction, retained searchable evidence. |
| Developer integrations | 2 | Issued token can actually authenticate with scopes; revocation/expiry; durable webhook delivery/signatures/retries; SSRF-safe outbound delivery. |
| Health / startup | 1 | Readiness failure status, startup validation, graceful shutdown/draining, dependency outage behavior. |

Frontend needs component tests for `fetchApi` refresh coordination, persisted store hydration/identity changes, access and checkout states, lesson/block dispatch, timers, assessment answer state, the PDF selector, teacher form contracts, and modal focus. No such suite currently exists. Important browser flows should still use a real API/database; component mocks alone cannot validate payment or access semantics.

## 4. Required release acceptance cases

These are expected secure/product behaviors. The audit reproduction script intentionally demonstrates the opposite behavior for several cases; move corrected assertions into maintained regression suites.

| Test ID | Priority | Acceptance case |
|---|---|---|
| A01 | P0 | A clean clone installs from both lockfiles, generates Prisma, typechecks and produces production builds using the documented supported Node version. |
| A02 | P0 | Anonymous GET of a video, paid material, or student submission path returns 401/403/404; entitled/authorized grants work without making a raw public alias available. |
| A03 | P0 | `.html`, `.js`, polyglot and invalid-signature content labeled PDF is rejected or quarantined and cannot execute on the application origin. |
| A04 | P0 | Public course/list/section responses contain only approved catalog/preview metadata and never protected text, raw private paths, answer keys or block secrets. |
| A05 | P0 | Every question type is recursively checked for answer-key leakage across public, student, unrelated teacher, owner and administrator endpoints, including expired/submitted results. |
| A06 | P0 | Seed/provisioning cannot install or reset known privileged credentials in a production environment. |
| A07 | P1 | Teacher A cannot impersonate teacher B through body fields on announcements or live creation; authenticated identity is immutable. |
| A08 | P1 | Demotion, password reset, deactivation and approval rejection revoke protected access consistently through every admin route and across API instances. |
| A09 | P1 | Rejected teachers cannot bypass the agreed account policy through password login, refresh or MFA completion. |
| A10 | P1 | Many simultaneous uses of one refresh token produce the defined single successor/session result without opening multiple valid branches or unpredictably logging out unrelated sessions. |
| A11 | P1 | For subscriptions, course purchases, subject grants, bundles, vouchers and free enrollment, frontend access equals video/material/quiz/assignment/discussion access and teacher roster membership. |
| A12 | P1 | Expired, revoked and future-dated access is handled consistently at exact date boundaries; renewal works for an expired row whose stored status remains ACTIVE. |
| A13 | P1 | January 31 monthly billing, leap years, Cairo timezone display and DST transitions use documented, consistent rules. |
| A14 | P1 | A gateway sandbox checkout settles once using official signatures and payloads; wrong merchant, currency, amount, terminal state and order mapping fail closed. |
| A15 | P1 | One provider transaction cannot fulfill multiple orders; duplicate callbacks/admin approvals grant access once; refund/cancellation cannot be overwritten by an old paid callback. |
| A16 | P1 | An idempotency key cannot reveal another user's order, change request identity, or create duplicates during concurrent first calls. |
| A17 | P1 | Concurrent redemption by the same student consumes one voucher use and grants the intended access once; global use limits and failure rollback still hold. |
| A18 | P1 | Invalid resource products cannot be sold; successful paid orders receive the advertised duration and usable access; fulfillment errors are operationally visible and recoverable. |
| A19 | P1 | Editing published content creates a separately reviewable revision; the student retains the published version until the reviewed revision is atomically released. |
| A20 | P1 | Content created through teacher UI is consumable in student UI for every supported video/text/PDF/link/quiz/assignment/live/board type, in the authored order. |
| A21 | P1 | No lesson has zero/two conflicting parents. Existing mixed module/section data migrates without losing lessons or double-counting progress. |
| A22 | P1 | Guest and signed-in unentitled students can use exactly the designated preview lessons and cannot use protected siblings. |
| A23 | P1 | Quiz expiry is persisted after a late submit/start; the expired attempt counts once, repeat submit is stable, and a next attempt can be started when allowed. |
| A24 | P1 | Quiz/assessment reload resumes the same server deadline and restores saved answers. Switching lesson/quiz cannot preserve another attempt's answers, index or result. |
| A25 | P1 | Definition changes cannot alter in-flight or historical grading; due dates and max attempts are enforced under parallel submissions. |
| A26 | P1 | Each supported question type has correct grading semantics. Essays remain pending until an authorized reviewer applies a rubric and produces a final auditable grade. |
| A27 | P1 | Concurrent assignment submissions respect maxAttempts; late policy, file ownership, grader ownership, score bounds and feedback persist end to end. |
| A28 | P1 | Video watch time and resume position survive refresh/device change; retries cannot inflate time and failed completion writes are not silently shown as synced. |
| A29 | P1 | Real supported video assets play/seek on target Android/iOS/desktop browsers; suffix/invalid ranges yield correct 206/416 responses without crashes or hangs. |
| A30 | P1 | Announcements choose an owned course and reach the correct deduplicated active audience once; partial delivery failures are retried. |
| A31 | P1 | Live sessions create/open real meetings, display for all eligible subjects, respect start/end times and roles, and do not expose host links to students. |
| A32 | P1 | Arabic and English registration → catalog → checkout → lesson → quiz → assignment → results journeys contain the correct text, lang/dir, currency/date formatting and keyboard reading order after reload. |
| A33 | P1 | Real API role/session cookies work behind the intended reverse proxy/custom domain; refresh, login redirects and logout behave across tabs. |
| A34 | P1 | Source ingestion retains page-level evidence, edition/year/term/outcome metadata and permission records; low-confidence OCR does not auto-publish. |
| A35 | P1 | AI produces schema-valid Arabic/English educational drafts with verified answers and source citations; educator acceptance is required before publication. |
| A36 | P1 | Tutor retrieves only allowed content, resists source/prompt instruction injection, protects unreleased answer keys, handles unsupported questions, and respects per-user token/cost/time budgets. |
| A37 | P1 | Generated narration/video/captions match the reviewed script and render Arabic equations/diagrams/terminology correctly; corrections invalidate all affected derivatives. |
| A38 | P1 | DB/storage/model/payment outages produce correct unavailable/pending states; readiness fails, durable data survives restarts, and audit/notifications are not silently lost. |
| A39 | P1 | Migrations upgrade a representative previous database; backup/restore recovers purchases, permissions, student work, content versions and source provenance. |
| A40 | P1 | Production critical/high dependency exposure is resolved or explicitly triaged with deployment-specific evidence; CI prevents reintroduction and runs required browser journeys without skips. |
| A41 | P2 | Catalog search/filter/pagination finds known Arabic/English topics beyond the first 100 courses; career selection uses the supported endpoint and taxonomy. |
| A42 | P2 | Keyboard, screen reader, reduced motion, contrast, captions, mobile touch, and slow/interrupted-network journeys pass with intended low-cost devices. |

## 5. Verification setup and CI changes

1. **Fail before any test write if the database is not a dedicated test target.** Resolve the effective database URL, require an explicit test database identity/allowlist, and use a disposable database service. Do not rely solely on an optional `.env.test` load. Existing suite cleanup includes whole-table deletes.
2. **Separate unit, integration and browser jobs.** Unit tests should not need a database. Integration tests should use schema migrations and deterministic factories. Browser tests should start production builds where relevant and provision all required identities/content.
3. **Test contracts at boundaries.** Assert full response schemas/forbidden secrets, not just status codes. Use provider-origin fixtures for payments and stable source/educator fixtures for AI evaluation.
4. **Assert state after failures.** Especially transaction rollbacks, max attempts, duplicate callbacks, expiry and payment reconciliation. Assertions about the HTTP response alone cannot establish durable correctness.
5. **Add real concurrency tests.** Use barriers to overlap requests, verify the final database state, and handle expected serialization-conflict retries. `Serializable` without a retry policy can protect integrity while still producing user-visible 500s.
6. **Make coverage useful.** Execute all relevant test suites, include intended production sources, enforce thresholds in CI, inspect important uncovered branches, and avoid pursuing percentage increases through assertions that simply repeat the implementation.
7. **Add release artifacts.** Publish browser traces, coverage summaries, migration logs, dependency reports, AI evaluation comparisons and a dated sign-off for the exact content and application versions released.

The current audit artifacts are a starting evidence set. A release sign-off requires all P0 cases and the P1 cases for the advertised launch features to pass in the intended staging/deployment environment.
