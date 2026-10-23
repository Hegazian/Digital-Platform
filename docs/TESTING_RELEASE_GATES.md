# Testing strategy and release gates

## M1 review verification (23 October 2026)

The [M1 review](M1_REVIEW.md) covers branch changes and local/untracked files against merge base `322d070`. The current server suite passes **441 tests across 81 files**, with one POSIX SIGTERM process integration test skipped on Windows; Linux execution is required in exact-head CI. Client tests pass **17 files / 90 tests**, both package typechecks and production builds pass, and lint reports **0 errors / 27 warnings**. The migration fixture passes three migrations, drift rejection, schema parity, repeat deployment and preservation of **22 rows across 21 tables**. Complete production and development/Strict Mode browser suites each passed **32/32**, with 0 failures/skips and clean exit. They include bilingual admin conflict and student checkout cases on desktop and Pixel 5 emulation. Earlier failed and interrupted attempts remain in [machine-readable evidence](../audit/m1-review/verification.json) as history; exact M1 commit CI and task-specific manual/operator acceptance remain required.

**M1-R01–R04 are resolved by targeted regressions.** The four code fixes and retained browser checks pass; ENG-02, ENG-05, ENG-06 and ENG-09 remain In Progress for broader acceptance and operator gates. Execute the remaining [M1 manual journey](M1_MANUAL_TESTING.md). G1 remains open. Historical M0 coverage/advisory/browser values below are not remeasured or attributed to M1 by this pass.

## Current M0 implementation verification (22 October 2026)

The reviewed application/integration checkpoint is **34723cd**. [Current status](CURRENT_STATUS.md), [fresh machine-readable evidence](../audit/final-m0/verification.json) and [the final review](M0_FINAL_REVIEW.md) record the latest tests, browser modes, exact CI revisions and limitations. Earlier [round-two evidence](../audit/review-round-2/verification.json) and [M0 checkpoint](../audit/m0/verification.json) remain historical; their counts are not attributed to this integration.

The M0 internal engineering/G0 checkpoint is finalized. Full server coverage passed **80 files / 422 tests**; client coverage passed **14 files / 79 tests**, with **0 lint errors / 27 warnings**. Typechecks and production builds pass. The isolated migration fixture verifies empty install, drift rejection, exact pre-M0 adoption, preservation of 21 rows across 20 tables and idempotent redeployment. No production schema or migration history was changed. Current browser/CI completion is recorded in the linked evidence; desktop and Pixel 5 emulation do not establish actual-device or Firefox/WebKit acceptance. Production and development modes execute the same 24 cases.

Fresh advisory scans on 22 October and the explicit exception policy passed: no runtime advisory packages in either application, no total server advisories, and nine narrowly scoped development-only client exceptions. See the [dependency decision record](M0_DEPENDENCY_REVIEW.md); ENG-13 must resolve exceptions before paid release or **19 January 2027**, whichever comes first. The lockfile hashes still match the recorded scan. Deployed private-bucket/real-scanner checks, production credential remediation and representative restore rehearsals remain traffic holds.

Whole-source coverage is **73.38/66.31/90.83/74.35%** server and **15.32/16.02/10.29/14.77%** client (statements/branches/functions/lines). M0 enforces a backend regression floor of 70/60/90/70 with stricter authorization, token and scanning gates; client API/proxy/delivery/renewal files have explicit gates. Reports include all production sources rather than only imported files. The G3 target of **80% statements/lines/functions and 75% branches** remains **unmet**, available as `npm run test:coverage:release` in each package. ENG-13 remains In Progress. The [fresh gap inventory](../audit/final-m0/coverage-gaps.json) lists uninstrumented and partially covered source files; zero unit/component coverage does not establish an unvisited browser component. Use the [next-steps plan](NEXT_STEPS.md) and [manual guide](M0_MANUAL_TESTING.md).

Current task status: **15 archived Complete, 4 In Progress, 58 Planned**, reflected in the [roadmap](ROADMAP_BACKLOG.md). A pass is evidence of the named revision/environment only; it does not complete future acceptance. All 42 inherited criteria retain an explicit [disposition](AUDIT_TRACEABILITY.md); enhancement scenarios extend them.

## Baseline evidence

| Evidence at commit 2fbdc8e | Result / limit |
|---|---|
| Repository inventory | 171 production TS/TSX files, about 30,796 lines; 67 backend test files, 7 Playwright files, no frontend component test files. File counts are not verified feature counts. |
| Selected DB-independent unit run | 108 passed across 16 files; [raw results](../audit/unit-tests.json). Most integration/domain paths were outside this run. |
| Selected-run V8 coverage | 46.70% statements, 34.48% branches, 66.37% functions, 47.41% lines; thresholds failed. Imported-file partial coverage only, **not whole-project coverage**. [Log](../audit/unit-coverage.log), [HTML](../audit/unit-coverage/index.html). |
| Backend generate/typecheck | Stale generated Prisma types were refreshed sufficiently to isolate TS2554 at config.routes.ts:23, Zod 4 record signature. Backend typecheck/build remain blocked pending ENG-01; a fresh CI generate/build is required. |
| Frontend clean lockfile installation | Production build and standalone typecheck passed after restoring dependencies already declared; missing CodeMirror packages were installation drift, not a new manifest bug. [Build log](../audit/client-build-clean.log). |
| Backend defect probes | 14 local fixture/double probe records completed; [results](../audit/reproduction-results.json). They demonstrate application branches, not deployed exploits or real transaction correctness. |
| Frontend probes | Six Chromium observations against production build with intercepted API fixtures; [results](../audit/browser-probe-results.json). They are not real API/database E2E. |
| Real database integration / required Playwright journeys | **Not validated**: configured PostgreSQL ports 5433/5434 were unavailable. No all-suite pass or production payment/provider result is claimed. |
| Dependency advisory scan | Locked-version findings recorded in [server summary](../audit/server-advisories-summary.json) and [client summary](../audit/client-advisories-summary.json); runtime/dev/applicability require triage and a fresh scan. No claim of exploitation. |
| Runtime | Local review used Node 24.19.0; existing CI uses Node 22. Pin and test the supported release runtime consistently. |

R/S/C/G labels in original findings mean local reproduction, source/compiler evidence, conditional risk and incomplete capability. SEC-13, COM-08, LRN-04 and other race/resource claims need actual DB/isolated deployment concurrency proof. Do not relabel a conditional issue “reproduced” because a mock made a branch run.

The audit scripts are defect demonstrations with unsafe-behavior assertions. Convert expectations into secure regression tests under normal suites after implementation; a probe that still reproduces the bug is not a passing acceptance test. AI prompt/provider tests are withdrawn; replace them with SCOPE-02 negative removal checks and uploader-driven A34–A37.

## Test protocol

1. **Abort before any database write** unless NODE_ENV=test and resolved DATABASE_URL **and** DIRECT_URL point to an explicit dedicated allowlisted test host/database/schema. Require a test marker, disposable service/unique run ID and no production credentials. A name substring alone is insufficient. Never use current whole-table cleanup on development/production or a shared test run.
2. Provision disposable PostgreSQL, Redis and protected test storage. Apply checked-in migrations, then deterministic factories through realistic boundaries with hashed passwords, valid resources/prices/dates and known ownership. Verify fixture invariants before browser assertions.
3. Separate DB-free unit, real PostgreSQL integration, contract, component, production-build browser, media and deployment tests. Each has a named CI job and artifacts. No test silently returns because infra/credentials/content are missing.
4. Positive and negative cases assert response schema **and final durable state**. Reload rows after rejected/expired requests; assert no unintended email/outbox/grant/file side effects. Compare recursive forbidden-field sets, not only `isCorrect` or status code.
5. Cross-account cases use student A/B and teacher A/B; repeat guest, pending/rejected teacher, unassigned approved teacher, owner/assigned reviewer and admin where meaningful. A global role is never a substitute for ownership/access.
6. Concurrency cases use real PostgreSQL barriers and multiple independent requests/connections, not sequential Promise mocks. Assert final counts, unique successors, terminal status and ledger/attempt invariants; repeat with a deterministic race schedule. Include crash/retry/serialization-conflict behavior.
7. All affected UI paths run with `/ar` and `/en`, exact initial/reloaded lang/dir, EGP/Cairo formatting, supplied monolingual/bilingual course content, keyboard focus and localized errors. Backend-only tasks test message keys plus consuming browser smoke; genuinely inapplicable dimensions have a written rationale.
8. Use at least Chromium for every required flow; Firefox/WebKit for key auth/player/assessment/checkout flows, actual Android Chrome and iOS Safari for media/upload/offline/touch-sensitive releases. Record device/browser versions and slower network profile. Browser fixtures may isolate a component defect; release E2E must use real API/database.
9. Restore known failed/dead-letter jobs in a controlled test, verify operator visibility/replay and ensure one intended effect. No network exactly-once claim; logical dedupe is proved.
10. Run documentation validation and attach exact commit, migration/content revision IDs, environment, commands, artifacts, findings and approvals to gate evidence.

## Required fixture set

| Fixture | Needed coverage |
|---|---|
| Identities | Admin, approved teacher A/B, assigned read-only/editor/grader, pending/rejected/inactive teacher, student A/B, old JWT role, two session families and tab race |
| Academic | Multiple stages/grades/tracks/years/terms/subjects, same translated labels in distinct scopes, archived edition, invalid relationships |
| Courses | Public/unlisted/private; draft/in-review/published/archived/retracted; mixed legacy sections/modules, orphan/two-parent anomalies; supplied AR/EN/BILINGUAL text |
| Access | Free, subscription, direct/subject/grade bundle, voucher; startsAt future, exact start/expiry, revoked, overlapping; existing archived purchaser |
| Assets | Valid MP4/PDF/captions, unsupported media, harmless disguised HTML/JS, invalid magic/polyglot, large/interrupted upload, processing failure, owned submissions/receipts/rights docs |
| Assessment | All five types, frozen old/new definitions, partial/pending human rubric, expired/due/attempt limits, unavailable original legacy keys |
| Commerce | Valid explicit durations, invalid resource/type, pending/rejected/refunded/cancelled, paid-unfulfilled, duplicate scoped key/transaction, voucher global/same-user race, Cairo month/DST boundaries |
| Operations | DB/storage/Redis/email outage, SIGTERM during work, outbox duplicate/crash/dead letter, snapshot upgrade/restore, consent unknown/withdrawn and legal hold |

Never include real student data, real payment destinations or reusable privileged passwords in fixtures. Test receipt/source documents must be harmless and permission-safe.

## Untested and incompletely tested domain ownership

The historical matrix inventories test files, not verified paths. The following register assigns the broader gaps (including unnumbered concerns) without adding duplicate task files. Run the named owners' integration/component/browser scenarios before enabling any advertised surface. A low-usage module is not exempt; if its contract cannot pass, ENG-03 must disable its API and remove product claims until completed.

| Domain / insufficiently tested behavior | Implementation and test owner |
|---|---|
| Login/MFA/recovery: current roles, rejection, token races, actual proxy cookies, factor recovery | SEC-10–SEC-14, ENG-11/14; ENG-13 harness |
| Catalog/collections: nested private/draft/archived metadata, pagination, sold bundle scope and member visibility | SEC-04/06, COM-01/07/09, LRN-15 |
| Courses/sections/modules: mixed tree, orphan/two-parent constraints, ownership, reorder concurrency and review completeness | LRN-05/07, ENH-06 |
| Blocks/player: supported text/link/document/live dispatch, PDF selector, timer/state isolation, preview and accessible errors | LRN-06/09/10/11, ENH-07 |
| Banks/quizzes/assessments: private keys, due dates, immutable snapshots, expiry commit, final grading/manual review and concurrent submit | SEC-05/07/08, LRN-01–LRN-04 |
| Assignment HTTP/files/grading: real multipart/private delivery, max attempts, late policy, reassigned/deleted lesson, score bounds | SEC-12, LRN-04, ENH-03/04/06 |
| Video/material/media library: real supported playback, suffix/invalid ranges, disconnect, spoofing, scanner/transcode/quota and private cloud failures | SEC-02/03, ENG-09, ENH-03/07 |
| Podcasts/audio: uploaded-file ownership, private/public metadata policy, invalid legacy URLs, bounded playlist paging, mobile playback and supplied transcript | ENH-03/07, COM-01, ENG-04/10; ENH-06 studio integration if advertised |
| Progress: heartbeat bounds, resume, retry, stale requests, pending-grade averages and retained archived learning | LRN-12, COM-09, ENH-09/17 |
| Access/subscriptions: all grant-source parity, renewal despite stale status, month/DST boundaries and review race | COM-01–COM-03, COM-09/10 |
| Orders/payment/voucher: owner-scoped keys, official provider fixtures, duplicate/reordered events, invalid products, source refunds and same-user capacity race | COM-04–COM-08, COM-11/12 |
| Teacher dashboard: actor override, owned-course announcements, private rosters, real financial metrics | SEC-09, COM-10, LRN-13, ENH-17 |
| Live: entered URL preservation, all subject summaries, role/time-bound joins, cancellation and host-secret redaction | SEC-09, LRN-14 |
| Academic/careers: coherent edition constraints, unique scoped keys, safe archival, supported endpoint and identity-scoped preferences | ENH-01, ENG-08/14, LRN-15 |
| Admin/config/home content: every security-edit path, last-admin protection, actual actor, strict nested JSON, rate persistence and singleton races | SEC-10, ENG-01–ENG-04, ENG-07/08 |
| Discussions/community: membership, forged associations, bounded replies, spam/moderation/report/delete ownership | SEC-12, ENG-04/10, ENH-16 support escalation |
| Notifications/email: recipient equivalence, durable dedupe/retry, read ownership, preference and unread paging | ENH-10, COM-10, LRN-13 |
| Audit/health/startup: actor FK, DB/storage outage, process restart, graceful drain, query-secret redaction and no memory-success | ENG-06/07/10 |
| Developer registry: unusable token scopes/revoke, absent delivery, replay and SSRF-safe destinations | ENG-03 launch denial; ENG-12 M4 enablement |
| Existing AI smoke tests | Superseded by SCOPE-02 removal/no-provider-call tests; A34–A37 uploader cases replace generation checks |
| Frontend components: fetchApi single-flight, hydration/identity stores, checkout access, block dispatch/PDF selection, forms, modal focus | ENG-13 sets component runner; domain owners add semantic assertions, ENG-14/LRN-16 cover session/locale |
| Operations/privacy: upgrade/restore, correct test target, queue recovery, support/export/deletion/consent/legal hold | ENG-05/13, ENH-11/16 and operations gate G3 |

When consolidating suites, preserve meaningful existing assertions and record intentionally retired tests with replacement IDs. No tested-file count or one nonempty response establishes feature completeness.

## CI requirements

ENG-13 owns harness/safety/dependency remediation; each feature owns its regression cases. Required jobs for a release commit:

- Clean npm lockfile installation, Prisma generation, server/client typecheck and production build on the pinned runtime; lint with the upgraded toolchain.
- Unit and component suites without database imports; contract/schema/output-redaction tests.
- Migrated real PostgreSQL integration and concurrency suites, followed by upgrade from representative prior-schema fixture and preservation assertions.
- Explicit production-source coverage inclusion for server and client; exclude generated/test files intentionally. G3 release target: >=80% statements/lines/functions and >=75% branches, enforced by `test:coverage:release`. M0's narrower ratchets above establish an internal checkpoint only. Publish actual denominators and uncovered critical paths. Percentage cannot substitute for named access/payment/attempt invariants.
- Real API/DB production-build Playwright journeys in both locales; no required skips, no empty-catalog success, no either-direction RTL assertion, no skip-on-missing-admin-credentials.
- Private local and Supabase staging storage driver tests, supported media play/seek/range, upload interruption, scan/quota failure and no public raw alias.
- Fresh dependency advisory/SBOM/secret scan and reviewed runtime-path remediation; no untriaged critical/high production exposure. Exemptions require precise deployment evidence, owner, expiry and compensating control. No blind `audit fix --force`.
- Documentation ID/link/cycle/hash validation, capability denial tests, migration dry-run artifacts and staging deployment smoke/restore evidence.

Retain JUnit/coverage reports, browser traces/screenshots, sanitized media logs, migration diff/counts, dependency report and gate decisions. Separate PR checks from slower staging/actual-device/restore gates, but require both before traffic. General CI must keep API-host code execution off and must not load production secrets.

## Gate G0 — safe internal build (M0)

- [x] Revised scope is authoritative; archived evidence and withdrawn AI recommendations remain clear.
- [x] Known seed credentials removed from active provisioning; raw uploads, active-content hosting, paid catalog body/key leaks and teacher actor override are closed by code and regression tests. Investigation/rotation on any existing deployment remains a separate traffic hold.
- [x] Current authorization invalidates role/password/activation/approval changes; pending/rejected policy consistent.
- [x] AI tutor surface/SDK/key/fallback removed; legacy endpoint tombstone or 404; no provider request.
- [x] Backend build blocker fixed, safe isolated test harness works, dependency risk is remediated/precisely triaged and clean builds pass.
- [x] ENG-03 capability policy plus SEC-15 containment prevents unsafe execution/incomplete endpoint enablement; direct API denial tests pass.

G0 allows internal synthetic-data work only. Production storage/scanner canaries, credentials and backup/restore operator checks remain mandatory in [operations](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold). ENG-13's M0 harness is established; accumulated feature/browser/upgrade evidence and full-source release coverage are required again at G3. Finishing harness setup does not mark future test obligations complete.

## Gate G1 — durable foundation (M1)

- [x] M1-R01–R04 regression fixes pass; both retained browser modes pass with isolated READY fixtures while normal uploads retain PROCESSING protection.
- [ ] Exact M1 revision CI and bilingual config/order-preservation, upload/resource, storage/scanner, and actual-device evidence are attached.
- [ ] ENG-09 transport acceptance closes independently using known supported READY fixtures; ENH-03 subsequently supplies managed processing/READY and complete A29 media evidence. Neither task waives the G1 end-to-end gate.
- [ ] Checked-in migrations upgrade both empty and populated prior database; canonical lessons/IDs/progress/previews and access/payment history preserved.
- [ ] Shared contracts and route validation classification, coherent Egyptian taxonomy and side-effect-free public reads.
- [ ] Private managed asset lifecycle, upload completion verification/scanning/processing/quota, protected legacy delivery; direct public aliases fail.
- [ ] Access-source/date/lifecycle parity, secure token family/MFA/client session handling; conditional races verified with real DB tests.
- [ ] Honest readiness/shutdown, no storage/audit memory fallback success, durable audit/outbox and recovery paths.

## Gate G2 — complete human-authoring and learning (M2)

- [ ] Teacher manually edits/uploads/imports a real permissioned unit; admin reviews exact revision; subsequent teacher revisions require another review; admin self-publication validated.
- [ ] All supported ordered blocks, explicit preview/access and supplied Arabic/English variants render; required captions/transcripts/alternatives are uploaded and reviewed.
- [ ] Versioned assessment/assignment workflows cover all advertised types, deadlines, concurrency, human grading and historical compatibility.
- [ ] Watch/resume/completion is bounded, persisted and honest under failure; announcements and supplied live links reach correct audiences.
- [ ] Full Arabic/English student and teacher/admin browser journeys, accessibility and target-device/media checks pass.
- [ ] A34–A37 current uploader/removal criteria pass; no AI-generation prerequisite remains.

## Gate G3 — controlled paid pilot and operations (M3)

- [ ] Every launch P0/P1 finding and applicable P2 task has implementation/test evidence; no unresolved critical authorization/payment/data-loss defect. Recheck all 58 dispositions, including staged containment.
- [ ] Free/manual/voucher journey reconciles actual verified transfer, receipt privacy, EGP duration, idempotent fulfillment, renewal/refund and support; paid-unfulfilled recovery drilled.
- [ ] Verification/recovery, real sender configuration, minor-consent/rights/retention policy sign-off, human support ownership and privacy export/deletion recovery work.
- [ ] Production deployment definition/images/secrets/probes, shared rate limits/quotas, load budgets and rollback/backup/restore runbooks are implemented and rehearsed.
- [ ] Exact application/content release revisions pass required CI without skips; dependency triage current; dashboards use real metric definitions/ledger.
- [ ] Limited student pilot has named scope/cohorts, no claim of nationwide content completeness, operational monitoring and incident/refund contacts. Expand only after reviewing actual outcomes/support load.
- [ ] All staged direct API denials below pass. Owner resolves software license before public source distribution; do not claim it from metadata.

No calendar estimate overrides a failed gate. A documented exception cannot waive known cross-account leaks, incorrect financial state or unprotected student work.

## Gate G4 — individual post-launch enablement

Each capability requires its own task complete, policy/operational owner sign-off, staging rollback/kill-switch rehearsal and meaningful security/concurrency/browser tests. Enabling one does not enable others. COM-04 tracks Paymob and Fawry independently; ENH-11 tracks portal separately from launch consent. ENG-12 token authentication and webhook delivery must both be real before related claims.

## Launch disabled-feature matrix

| Capability | API requirement at launch | Later enablement owner |
|---|---|---|
| AI tutor/generation | Removed; legacy 410/404, no SDK/provider call; no enable flag | SCOPE-02; no later requirement |
| Paymob / Fawry | FEATURE_DISABLED checkout and unverified callback handling; no grant | COM-04, separate provider evidence |
| Realtime whiteboard | FEATURE_DISABLED board collaboration session/write; real ID preserved | LRN-08 containment / ENH-14 |
| Code execution | FEATURE_DISABLED before any process/queue admission; no API-host fallback | SEC-15 / ENH-15 |
| Developer tokens/webhooks | FEATURE_DISABLED create/use/deliver routes; no scope bypass | ENG-12 |
| Guardian portal | FEATURE_DISABLED linkage/summary APIs; launch consent remains implemented | ENH-11 |
| Certificates | FEATURE_DISABLED issue/verify surfaces until actual implementation | ENH-12 |
| Offline packs | FEATURE_DISABLED pack issuance; no permanent private URL download bypass | ENH-13 |
| Full content search/bookmarks/notes | FEATURE_DISABLED until scoped index/ownership tests | ENH-08 |
| Mastery/revision tools | FEATURE_DISABLED until deterministic evidence/rules validated | ENH-09 |

Test each via direct HTTP with guest/student/teacher/admin, changed body flags and all deployed API instances. UI absence alone is not evidence. Fail closed when capability policy cannot be evaluated. Existing inert stored content remains recoverable.

## Release evidence record

For every gate, record: application commit/build hash; migrations and schema baseline; content/review revision IDs; runtime/storage/provider versions; test commands/job links/results; manual/actual-device/restore evidence; disabled capability snapshot; dependency triage; known limitations; named engineering, educator, operations and product/policy sign-offs. Store a dated Markdown record under a proposed `docs/releases/<release-id>.md` only when executed. Do not manufacture a passing release record from this planning exercise.
