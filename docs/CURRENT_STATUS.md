# Current implementation status

Documentation refreshed **22 October 2026**. Latest locally verified application commit: **d9c720f**, on codex/finalize-milestone-0. Original audit baseline: **2fbdc8e**; first M0 checkpoint: **fbe5fbf**. This page summarizes [22 October machine-readable evidence](../audit/review-round-2/verification.json), not a new application test run performed by the documentation refresh.

**M0 / G0 is complete for internal synthetic-data work. G1–G3 remain open; the product is not ready for real-student or paid production onboarding.** The current task inventory is **77: 15 Complete, 1 In Progress, 61 Planned**. ENG-13 owns the continuing release-test obligation. No new task is marked complete by this update.

## Latest local verification — 22 October

| Check | Recorded result |
|---|---|
| Server typecheck / production build | Passed / passed |
| Server tests | 77 files / 397 tests passed |
| Client typecheck / production build | Passed / passed |
| Client tests | 9 files / 63 tests passed |
| Client lint | 0 errors / 25 warnings |
| Production browser, real local API/PostgreSQL | 24 passed / 0 skipped |
| Development browser, next dev / Strict Mode | 24 passed / 0 skipped |
| Server whole-source coverage, statements / branches / functions / lines | 71.99% / 63.18% / 91.87% / 72.84% |
| Client whole-source coverage, statements / branches / functions / lines | 11.29% / 11.33% / 6.57% / 10.88% |
| NPM audit, both runtime trees | 0 reported advisory packages; server 0 total; client 9 development-only exceptions |
| Remote CI / production deployment | Configured, not verified remotely / not performed |

Local environment: Windows, Node 26.7.0; CI is configured for Node 22. Browser runs use Chromium 156.0.8078.4, desktop and Pixel 5 emulation. These runs do not establish Firefox/WebKit or actual Android/iOS device acceptance. The two browser modes execute the same 24 checks; they are not 48 distinct feature cases.

## Delivered and retained

- Uploader-driven scope, AI tutor/provider removal, safe admin provisioning and hard-off server controls for staged features.
- Current database-backed role/approval/activation/session-version enforcement; public catalog/protected curriculum separation; student-safe assessment serialization; authenticated teacher actor binding.
- Protected local files, signed uploader-bound submission references, signature/scanner checks and private-Supabase startup validation. Short-lived playback renewal and authenticated PDF/download delivery are covered locally.
- Dashboard capability presentation, admin curriculum inspection, cancellation handling, Next proxy convention, refresh recovery, mobile logout and stale-course/playback retry regressions are fixed. See the [second review](M0_REVIEW_ROUND_2.md) and [first review](M0_REVIEW_RESOLUTION.md).
- Safe isolated tests and CI definitions are present. A small [auth-version bridge](../server/prisma/upgrades/m0-auth-version.sql) exists; the full migration baseline does not yet exist.

## Remaining evidence and release holds

The full-source release target is **80% statements/lines/functions and 75% branches**, enforced by each package's 'npm run test:coverage:release'. It is unmet. The [gap inventory](../audit/review-round-2/coverage-gaps.json) lists one executable server file and 67 executable client files without unit/component coverage; browser code is not instrumented, so this is not proof those components were never visited. Feature tests must establish behavior and durable state, not merely increase a percentage.

The nine client development advisory exceptions are owned by ENG-13 and expire **19 January 2027**; resolve them before paid release or expiry, whichever comes first. See the [dependency record](M0_DEPENDENCY_REVIEW.md). Zero reported runtime advisories is limited to the recorded lockfiles and scan date, not a security certification.

Before real traffic, preserve a successful remote CI run for the exact release commit; audit/rotate previously exposed deployment credentials; verify all three private Supabase origins and migrated object checksums; exercise real ClamAV clean/infected/unavailable/timeout cases; and rehearse representative database plus private-object backup/restore/rollback. Complete migrations, shared access/assets, reviewed authoring, assessments, progress, bilingual accessibility, manual commerce, consent/privacy/support and operations under [G1–G3](TESTING_RELEASE_GATES.md). Public source distribution requires an owner-approved license. These holds are not waived by committing M0.

Automated Paymob/Fawry, guardian portal, certificates, offline packs, realtime whiteboards, code execution and developer integrations remain server-disabled until their owning gates pass. Uploaders supply every educational text, media item, translation, caption and answer; technical upload processing does not create educational material.

## Current execution frontier

**Start with [ENG-05](tasks/ENG-05.md).** Other M1 tasks with all recorded dependencies Complete are [ENG-02](tasks/ENG-02.md), [ENG-06](tasks/ENG-06.md), [ENG-09](tasks/ENG-09.md). Readiness means prerequisites permit starting, not that implementation or tests have passed. Continue [ENG-13](tasks/ENG-13.md) throughout M1–M3. The [next-steps handoff](NEXT_STEPS.md) defines the ordered waves, exact first-task scope and release evidence.
