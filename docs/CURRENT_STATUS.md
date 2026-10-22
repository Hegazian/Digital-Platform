# Current implementation status

Documentation refreshed **22 October 2026**. Reviewed M0 application and main-integration checkpoint: **34723cd** on codex/finalize-milestone-0. Original audit baseline: **2fbdc8e**; first M0 checkpoint: **fbe5fbf**. This page summarizes [fresh machine-readable evidence](../audit/final-m0/verification.json), [the integration review](M0_FINAL_REVIEW.md) and the last recorded [reliability CI run](https://github.com/Hegazian/Digital-Platform/actions/runs/39820430062) for **34723cdded64a751b6a36c208a69421f4a57ac44**. A prior run is never attributed to later code; final integration CI is recorded separately when available.

**M0 / G0 is complete for internal synthetic-data work. G1–G3 remain open; the product is not ready for real-student or paid production onboarding.** The current task inventory is **77: 15 Complete, 4 In Progress, 58 Planned**. ENG-05, ENG-06 and ENG-13 are In Progress. ENG-05's exact branch CI passed; representative backup/restore and rollback evidence remain open. See [ENG-05 evidence](ENG05_IMPLEMENTATION.md). No task is marked complete by documenting or passing only its local synthetic fixture.

## Verification — 22 October (sources stated below)

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

**M1 is active. Continue [ENG-09](tasks/ENG-09.md); its first change hardens byte-range playback.** [ENG-05](tasks/ENG-05.md) and [ENG-06](tasks/ENG-06.md) code and exact-head CI are green; both stay In Progress pending named operator/infrastructure rehearsals. Other dependency-ready M1 work is [ENG-02](tasks/ENG-02.md). Continue [ENG-13](tasks/ENG-13.md) throughout M1–M3. The [next-steps handoff](NEXT_STEPS.md) defines the ordered waves and remaining acceptance evidence.
