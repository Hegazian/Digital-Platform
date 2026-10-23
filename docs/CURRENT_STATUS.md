# Current implementation status

Documentation refreshed **23 October 2026**. Reviewed M0 application and main-integration checkpoint: **34723cd** on codex/finalize-milestone-0. Original audit baseline: **2fbdc8e**; first M0 checkpoint: **fbe5fbf**. This page summarizes [historical M0 evidence](../audit/final-m0/verification.json), [the integration review](M0_FINAL_REVIEW.md) and the last recorded [reliability CI run](https://github.com/Hegazian/Digital-Platform/actions/runs/39820430062) for **34723cdded64a751b6a36c208a69421f4a57ac44**. A prior run is never attributed to later code; final integration CI is recorded separately when available.

**M0 / G0 is complete for internal synthetic-data work. G1–G3 remain open; the product is not ready for real-student or paid production onboarding.** The current task inventory is **77: 15 Complete, 5 In Progress, 57 Planned**. ENG-02, ENG-05, ENG-06, ENG-09 and ENG-13 are In Progress. The four M1 review regressions are fixed, and complete production plus development/Strict Mode browser suites each pass 32/32 with clean exit. The suites cover bilingual ENG-02 admin conflict and student charge journeys on desktop/Pixel emulation. ENG-05's exact branch CI passed; representative backup/restore and rollback evidence remain open. ENG-02 still needs exact-head CI and task-specific manual acceptance. ENG-09 still needs measured load, real Supabase/scanner and target-device acceptance. ENH-03 owns subsequent managed processing. See [ENG-02 evidence](ENG02_IMPLEMENTATION.md), [ENG-05 evidence](ENG05_IMPLEMENTATION.md) and [ENG-09 evidence](ENG09_IMPLEMENTATION.md). No task is marked complete by documenting or passing only its local synthetic fixture.

## M1 verification — 23 October (current working tree)

[Review](M1_REVIEW.md), [manual instructions](M1_MANUAL_TESTING.md) and [machine-readable evidence](../audit/m1-review/verification.json) cover M1 changes against merge base 322d070. Source hashes identify the tested files in this working tree. **M1-R01–R04 are resolved by focused regressions**; the owning tasks remain in progress for broader acceptance and operational gates.

| M1 check | Fresh recorded result |
|---|---|
| M1 server tests | 80 files / 441 tests passed |
| M1 client tests | 17 files / 90 tests passed |
| M1 typechecks / production builds | Both packages passed |
| M1 client lint | 0 errors / 27 warnings |
| M1 migration fixture | Passed; 3 migrations; 22 rows / 21 tables preserved; repeat deploy and schema parity |
| Retained production browser smoke | 32 passed / 0 failed / 0 skipped; passed — Complete production build and browser suite passed all 32 desktop/Pixel 5 cases; runner started and stopped its own API and Next processes and exited cleanly. |
| Retained development browser smoke | 32 passed / 0 failed / 0 skipped; passed — Complete Next development/Strict Mode browser suite passed all 32 desktop/Pixel 5 cases and exited cleanly. One transient ECONNRESET appeared on dashboard proxy reads during the mobile admin case; an immediate repeat of all four bilingual desktop/mobile admin config cases passed without recurrence. Expected 409 conflict and authorization-denial logs are exercised behavior. |
| Bilingual admin conflict and student checkout journeys | Covered in both complete production and development browser suites (32/32 each; clean exit) |
| M1 exact commit remote CI | Required after commit/push; earlier M0 CI is historical |

M1-specific manual config/order checks, maximum-size load measurements, real Supabase/ClamAV, representative restore/rollback, actual devices and exact-head remote CI remain open. The coverage and advisory scans below are historical M0 evidence; neither was refreshed by this pass.

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

The full-source release target is **80% statements/lines/functions and 75% branches**, enforced by each package's 'npm run test:coverage:release'. It is unmet. The [fresh gap inventory](../audit/final-m0/coverage-gaps.json) lists executable files without unit/component coverage; browser code is not instrumented, so this is not proof those components were never visited. Feature tests must establish behavior and durable state, not merely increase a percentage.

The nine client development advisory exceptions are owned by ENG-13 and expire **19 January 2027**; resolve them before paid release or expiry, whichever comes first. See the [dependency record](M0_DEPENDENCY_REVIEW.md). Zero reported runtime advisories is limited to the recorded lockfiles and scan date, not a security certification.

Before real traffic, preserve a successful remote CI run for the exact release commit; audit/rotate previously exposed deployment credentials; verify all three private Supabase origins and migrated object checksums; exercise real ClamAV clean/infected/unavailable/timeout cases; and rehearse representative database plus private-object backup/restore/rollback. Complete migrations, shared access/assets, reviewed authoring, assessments, progress, bilingual accessibility, manual commerce, consent/privacy/support and operations under [G1–G3](TESTING_RELEASE_GATES.md). Public source distribution requires an owner-approved license. These holds are not waived by committing M0.

Automated Paymob/Fawry, guardian portal, certificates, offline packs, realtime whiteboards, code execution and developer integrations remain server-disabled until their owning gates pass. Uploaders supply every educational text, media item, translation, caption and answer; technical upload processing does not create educational material.

## Current execution frontier

**The M1 review findings are fixed, but M1/G1 is not complete.** Complete production and development browser suites pass 32/32 each with clean exit, covering bilingual admin conflict and student charge flows. [ENG-02](tasks/ENG-02.md) remains In Progress for exact-head CI and task-specific manual acceptance. Order preservation also has a real-PostgreSQL regression. [ENG-09](tasks/ENG-09.md) remains In Progress for measured load, real storage/scanner and actual-device acceptance. [ENG-05](tasks/ENG-05.md) and [ENG-06](tasks/ENG-06.md) remain In Progress pending representative database recovery and real infrastructure rehearsals. The remaining M1 tasks are dependency-blocked by those gates; the [next-steps handoff](NEXT_STEPS.md) identifies the next authorized work. Continue [ENG-13](tasks/ENG-13.md) throughout M1–M3.
