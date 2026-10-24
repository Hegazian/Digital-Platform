# Current implementation status

Documentation refreshed **24 October 2026**. Reviewed M0 application and main-integration checkpoint: **34723cd** on codex/finalize-milestone-0. Original audit baseline: **2fbdc8e**; first M0 checkpoint: **fbe5fbf**. This page summarizes [historical M0 evidence](../audit/final-m0/verification.json), [the integration review](M0_FINAL_REVIEW.md) and the last recorded [reliability CI run](https://github.com/Hegazian/Digital-Platform/actions/runs/39820430062) for **34723cdded64a751b6a36c208a69421f4a57ac44**. A prior run is never attributed to later code; final integration CI is recorded separately when available. Current SEC and dependency checks are local evidence bound to the normalized source manifest; a matching remote CI run is still required.

**M0 / G0 is complete for internal synthetic-data work. G1–G3 remain open; the product is not ready for real-student or paid production onboarding.** The current task inventory is **77: 15 Complete, 13 In Progress, 49 Planned**. All 13 In Progress tasks have a reviewed disposition in [the latest review](M1_PROGRESS_REVIEW.md). Local regressions, complete suites and maximum-size upload checks pass as recorded below; shared contract/consumer work and the remaining M1 foundation tasks still require implementation. Representative restore/rollback, real private storage/scanning, MFA deployment transition, physical devices and matching-commit CI remain open. ENH-03 owns subsequent managed media processing. See [ENG-02 evidence](ENG02_IMPLEMENTATION.md), [ENG-05 evidence](ENG05_IMPLEMENTATION.md) and [ENG-09 evidence](ENG09_IMPLEMENTATION.md). No task is marked complete by documenting or passing only its local synthetic fixture.

## Latest task review — 24 October

The [13-task review](M1_PROGRESS_REVIEW.md) records findings M1-R06–R24 and their repairs. [Fresh verification](../audit/m1-closure/verification.json) binds the checks to normalized source hashes.

| Current local check | Result |
|---|---|
| API full suite / coverage ratchet | 86 files / 479 tests passed; command exit 0 |
| Web full suite | 17 files / 93 tests passed |
| Whole-source coverage, statements / branches / functions / lines | API 75.09% / 67.95% / 90.46% / 76.58%; web 19.76% / 19.38% / 13.68% / 19.26% |
| Typechecks / builds | Both apps pass; independent contracts build and 2 package checks pass |
| Client lint | 0 errors / 27 existing warnings |
| Production / development browser journeys | 38 / 38 passed, desktop and Pixel emulation, including English/Arabic MFA and one-use recovery |
| Migration install / populated upgrade | 8 migrations; 22 rows / 21 tables preserved; drift rejection and repeat deployment pass |
| Maximum-size local uploads | Two 500 MiB uploads; about 71 MiB RSS increase; third request 503; staging cleaned |
| Advisory policy | No runtime advisory packages; 3 development-only client advisories covered by the existing expiring policy |

The local load measurement uses a protocol fixture scanner and filesystem; actual Supabase/ClamAV and physical devices remain unverified. Matching-commit Linux CI, representative restore/rollback, MFA deployment key/legacy transition and the unfinished contract/consumer work remain release holds. Tasks with open acceptance are kept In Progress.

## M1 checkpoint verification — 23 October (historical)

[Review](M1_REVIEW.md), [manual instructions](M1_MANUAL_TESTING.md) and [machine-readable evidence](../audit/m1-review/verification.json) cover M1 changes against merge base 322d070. That evidence is a historical checkpoint; later SEC and prerequisite changes are recorded in the [current local security verification](../audit/sec-implementation/verification.json). **M1-R01–R04 are resolved by focused regressions**; the owning tasks remain in progress for broader acceptance and operational gates.

| M1 check | Fresh recorded result |
|---|---|
| M1 server tests | 81 files / 446 tests passed |
| M1 client tests | 17 files / 90 tests passed |
| M1 typechecks / production builds | Both packages passed |
| M1 client lint | 0 errors / 27 warnings |
| Current server coverage, statements / branches / functions / lines | 73.87% / 66.64% / 89.82% / 75.11% |
| Current client coverage, statements / branches / functions / lines | 19.34% / 18.94% / 13.39% / 18.86% |
| M1 migration fixture | Fresh local fixture passed all 8 migrations, including empty install, drift rejection, populated upgrade with 22 rows / 21 tables preserved, repeat deploy, and schema parity |
| Retained production browser smoke | 32 passed / 0 failed / 0 skipped; passed — Freshly rerun after the bounded shutdown and stale staging cleanup changes. Production build and all desktop/Pixel 5 browser cases passed; test runner started and stopped its local API and Next processes cleanly. |
| Retained development browser smoke | 32 passed / 0 failed / 0 skipped; passed — Freshly rerun after the bounded shutdown and stale staging cleanup changes. Next development/Strict Mode and all desktop/Pixel 5 browser cases passed cleanly. Expected stale-config conflict and authorization denial logs were exercised by the suite. |
| Bilingual admin conflict and student checkout journeys | Covered in fresh production/development browser suites (32/32 each; desktop and Pixel 5 emulation) |
| M1 exact commit remote CI | Required after commit/push; earlier M0 CI is historical |

M1-specific manual config/order checks, maximum-size load measurements, real Supabase/ClamAV, representative restore/rollback, actual devices and final-commit remote CI remain open. The current [coverage gaps](../audit/m1-review/coverage-gaps.json) are freshly measured; browser/child-process execution is not instrumented. The server coverage command runs every test but exits 1 because function coverage is 89.82% against the 90% threshold; the separate full server test command exits 0. Both packages remain below the G3 whole-product targets. Production/development browser suites were rerun successfully after the runtime follow-up, using desktop and Pixel 5 emulation. M0 coverage and advisory scans below remain historical; the advisory audit was not refreshed in this review. The [M1 release closure](M1_RELEASE_READINESS.md) lists every remaining task and acceptance hold.

## Initial SEC implementation checkpoint — 24 October (historical)

The historical M1 hashes above are retained without rewriting. The [fresh local report](../audit/sec-implementation/verification.json) records task-focused changes and checks for SEC-06/07/12/13/14 plus COM-09/COM-01/ENH-02 dependencies. The latest focused security suite passed 110 tests across 17 files, including regressions that block free-preview video and material access after retraction. Both app typechecks and production builds pass; client lint reports zero errors and 27 existing warnings. These local checks do not establish exact-head remote CI, a representative restore, production MFA key provisioning or browser acceptance; SEC tasks remain In Progress.

## Historical M0 verification — 22 October (sources stated below)

| Check | Recorded result |
|---|---|
| Server typecheck / production build | Passed / passed |
| Server tests | 80 files / 422 tests passed |
| Client typecheck / production build | Passed / passed |
| Client tests | 14 files / 79 tests passed |
| Client lint | 0 errors / 27 warnings |
| Production browser in CI, real isolated API/PostgreSQL | 24 passed / 0 skipped |
| Development browser in CI, next dev / Strict Mode | 24 passed / 0 skipped |
| Server whole-source coverage, statements / branches / functions / lines | 73.38% / 66.31% / 90.83% / 74.35% |
| Client whole-source coverage, statements / branches / functions / lines | 15.32% / 16.02% / 10.29% / 14.77% |
| NPM audit, both runtime trees | 0 reported advisory packages; server 0 total; client 9 development-only exceptions |
| Migration install / populated-upgrade fixture | Passed locally in unique schemas in dedicated PostgreSQL test database; schemas cleaned up |
| Remote CI / production deployment | All five checks passed at reviewed application revision 34723cd (PR run 39820430062); later documentation changes require their own CI / not performed |

Local API/client environment: Windows, Node 26.7.0. Both complete browser modes passed on GitHub Actions Linux/Node 22 at the reviewed application revision, using Chromium 156.0.8078.4, desktop and Pixel 5 emulation. Local runs initially lacked the required browser, then hit a sandbox denial for Google Fonts; unrestricted reruns subsequently passed all 24 checks in each mode (production 4.1 minutes, development 2.6 minutes). The evidence records each attempt separately. These runs do not establish Firefox/WebKit or actual Android/iOS device acceptance. The two browser modes execute the same 24 checks; they are not 48 distinct feature cases.

## Delivered and retained

- Uploader-driven scope, AI tutor/provider removal, safe admin provisioning and hard-off server controls for staged features.
- Current database-backed role/approval/activation/session-version enforcement; public catalog/protected curriculum separation; student-safe assessment serialization; authenticated teacher actor binding.
- Protected local files, signed uploader-bound submission references, signature/scanner checks and private-Supabase startup validation. Short-lived playback renewal and authenticated PDF/download delivery are covered locally.
- Dashboard capability presentation, admin curriculum inspection, cancellation handling, Next proxy convention, refresh recovery, mobile logout and stale-course/playback retry regressions are fixed. See the [second review](archive/reviews/M0_REVIEW_ROUND_2.md) and [first review](archive/reviews/M0_REVIEW_RESOLUTION.md).
- Safe isolated tests and CI definitions are present. ENG-05 adds a full exact pre-M0 schema baseline and the idempotent [auth-version bridge](../server/prisma/upgrades/m0-auth-version.sql) as a versioned migration. Empty installs and a populated synthetic prior-schema upgrade pass inside disposable schemas. Existing production databases have not been baselined; operators must verify a restored-copy diff before resolving history.

## Remaining evidence and release holds

The full-source release target is **80% statements/lines/functions and 75% branches**, enforced by each package's 'npm run test:coverage:release'. It is unmet. The [current gap inventory](../audit/m1-closure/coverage-gaps.json) lists executable files without unit/component coverage; browser code is not instrumented, so this is not proof those components were never visited. Feature tests must establish behavior and durable state, not merely increase a percentage.

The 3 current client development advisory exceptions are owned by ENG-13 and expire **19 January 2027**; resolve them before paid release or expiry, whichever comes first. See the [fresh dependency record](../audit/m1-closure/dependencies/dependency-verification.json); the M0 scan remains historical. Zero reported runtime advisories is limited to the recorded lockfiles and scan date, not a security certification.

Before real traffic, preserve a successful remote CI run for the exact release commit; audit/rotate previously exposed deployment credentials; verify all three private Supabase origins and migrated object checksums; exercise real ClamAV clean/infected/unavailable/timeout cases; and rehearse representative database plus private-object backup/restore/rollback. Complete migrations, shared access/assets, reviewed authoring, assessments, progress, bilingual accessibility, manual commerce, consent/privacy/support and operations under [G1–G3](TESTING_RELEASE_GATES.md). Public source distribution requires an owner-approved license. These holds are not waived by committing M0.

Automated Paymob/Fawry, guardian portal, certificates, offline packs, realtime whiteboards, code execution and developer integrations remain server-disabled until their owning gates pass. Uploaders supply every educational text, media item, translation, caption and answer; technical upload processing does not create educational material.

## Current execution frontier

**All current review findings are repaired locally; M1/G1 is incomplete.** The [13-task review](M1_PROGRESS_REVIEW.md) records code delivery separately from unfinished acceptance. Continue ENH-02 endpoint/envelope adoption and COM-01 consumer parity next, then ENH-01 taxonomy and ENG-07 audit/outbox under the existing dependency graph. Keep representative restore, actual Supabase/ClamAV, production MFA transition/keys, physical devices and matching-commit Linux CI open. Use [the implementation order](NEXT_STEPS.md); ENG-13 continues through G3.
