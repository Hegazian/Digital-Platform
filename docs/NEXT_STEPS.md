# Next implementation steps

Updated **23 October 2026**. M0/G0 is complete for internal synthetic-data work. The historical M0 reliability commit **34723cdded64a751b6a36c208a69421f4a57ac44** passed all five GitHub checks; this is not CI evidence for later M1 commits. ENG-05 and ENG-06 remain In Progress for external rehearsal evidence. The original four M1 review findings under ENG-09/ENG-02 and the new M1-R05 shutdown-test defect are fixed. The [release closure](M1_RELEASE_READINESS.md) retains all 25 M1 tasks and the local-only execution boundary. Complete production and development/Strict Mode browser suites each pass 32/32 with clean exit, including bilingual admin conflict and student charge cases on desktop/Pixel emulation. [Review](M1_REVIEW.md), [fresh evidence](../audit/m1-review/verification.json) and [manual checks](M1_MANUAL_TESTING.md) define the remaining M1 gates. Exact-head M1 CI, G1–G3 acceptance and production onboarding remain gated. Current verification and task counts are in [CURRENT_STATUS.md](CURRENT_STATUS.md).

## Start here

1. Retain the committed M0 regressions and review the [current status](CURRENT_STATUS.md), [target architecture](TARGET_ARCHITECTURE.md), [contracts](API_DATA_CONTRACTS.md) and [operations holds](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold).
2. Keep the M1-R01–R04 regressions in CI; they pass locally. Complete production and development/Strict Mode browser suites each pass 32/32, including ENG-02 order snapshots, bilingual admin conflict, student EGP charge display and ENG-09 media/document journeys. Obtain exact M1 commit CI. Complete [ENG-09](tasks/ENG-09.md) measured load, real storage/scanner and actual-device acceptance while retaining all operational gates. ENH-03 owns new-upload-to-READY after ENG-09 transport acceptance; unverified new uploads stay PROCESSING.
3. Keep **[ENG-05](tasks/ENG-05.md)** and **[ENG-06](tasks/ENG-06.md)** In Progress while an authorized operator performs representative restore/rollback review and real storage outage/upload shutdown rehearsals. Run the new POSIX SIGTERM process test on Linux CI. Never apply generated baseline SQL to existing tables blindly.
4. Continue **[ENG-13](tasks/ENG-13.md)** throughout: keep local gates green, add semantic domain/component/concurrency tests with each task, and work toward the existing release coverage target. Resolve development advisory exceptions before paid release or 19 January 2027.
5. Follow the M1 waves; complete each task's prerequisites and acceptance evidence. Review **G1** using real upgrade, private-storage, access, session and outage evidence; then advance to M2 authoring/learning and M3 manual paid pilot. Keep all staged features denied at the API.

## Immediate implementation packages

The original four findings and M1-R05 are fixed in the current working tree; [the current review](M1_REVIEW.md) preserves their evidence. The fixes reuse existing owners and do not add duplicate backlog IDs. Full ENG-02/ENG-09 completion and M1/G1 still require the remaining evidence below.

1. **ENG-09 / M1-R01 — completed regression.** Premature response close after body consumption aborts scanner/source work; staging cleanup and slot release await termination. A controlled HTTP/scanner test verifies two-slot admission, third-request rejection, cleanup and safe slot reuse. Remaining: measured maximum-size resource use, real storage/scanner behavior and cross-platform CI.
2. **ENG-02 / M1-R02 — completed regression.** The conditional update and exact-row readback share one transaction. Real-PostgreSQL barriers verify a competing stale write cannot replace the first response; API tests verify the response and persisted version match.
3. **ENG-02 / M1-R03 — completed regression.** Saving a subject preserves other drafts and edits typed during the request; component tests cover Arabic copy, RTL and server-confirmed pricing. Additional tests verify Arabic EGP submission, equal English/Arabic checkout charges and immutable order snapshots when the indicative rate changes. Complete production and development browser suites also verify bilingual admin conflicts and student checkout charges on desktop/Pixel emulation. Exact-head CI and broader manual acceptance remain open.
4. **ENG-09 / M1-R04 — completed regression.** Guarded setup seeds a known supported READY video and isolates the renewal lesson. The complete production and development/Strict Mode desktop/mobile browser suites pass 32/32 each with clean exit. Ordinary uploads remain PROCESSING until verified; measured load, external storage/scanner and actual-device acceptance remain open.
5. **Evidence and release gates.** Keep the resolved finding regressions in CI. Collect exact-commit CI after the current branch commit is pushed; complete the ENG-02 bilingual/order checks and ENG-09 load/storage/device acceptance, then finish the ENG-05/06 operator rehearsals below. Leave task statuses In Progress until their full acceptance criteria are evidenced.
6. **Continue Wave 2 locally.** The reviewed ENG-05 baseline and populated fixture are implemented and reverified. Start COM-09 lifecycle primitives and ENH-02 shared contracts, then ENH-01 taxonomy and the other primitives according to their implementation prerequisites. Keep ENG-05 In Progress for representative restore/operator acceptance; that release hold does not prevent preparing tested additive migrations in disposable schemas. Never deploy them to existing databases without the adoption review. Consumers reuse the owning contracts and policies.

### ENG-09 / ENH-03 acceptance boundary

ENH-03 depends on ENG-09, ENG-05, ENG-06, ENG-07, ENH-02 and completed SEC-02/03 controls. ENG-09 therefore closes transport acceptance with known verified READY fixtures, staging/scan/storage limits, ranges and truthful new-upload PROCESSING state. It does not wait for ENH-03 renditions. ENH-03 then owns managed assets, resumable completion verification, durable quotas/workers, codec/duration checks and READY transitions, including complete new-upload A29/G1 acceptance. Never mark unverified media READY merely to pass a playback test.

## ENG-05 operational follow-through

Owner: database migrations and operations. Status: **In Progress**, priority **P1**. See the [full task](tasks/ENG-05.md), [implementation evidence](ENG05_IMPLEMENTATION.md) and [migration runbook](MIGRATION_OPERATIONS.md). Baseline code and local fixtures are implemented; earlier checkpoint CI is linked below. The current M1 chain still needs final-commit CI, representative restore/rollback and operator review.

1. **Complete:** inventory the pre-M0/current schema difference; check in the immutable 2fbdc8e schema snapshot; generate and verify its baseline SQL; preserve the idempotent M0 authVersion bridge as the next migration. Existing production history is not marked as applied by CI or local tests.
2. **Complete:** add migrate-deploy/test commands and replace CI's schema-push setup with reviewed migration application. Guard schema push to local development or the dedicated test database.
3. **Complete locally:** the isolated fixture migrates an empty schema and verifies exact current-schema parity; builds the historical pre-M0 schema in a second unique schema; runs a read-only diff; seeds bilingual courses, grades, lessons, quiz/assessment attempts, assignment work/files, orders and entitlements; resolves the baseline; applies the bridge; and verifies every row and both auth versions survive a repeated deploy.
4. **Remaining:** verify a restored representative copy using the runbook's read-only diff and practice the migration-history adoption procedure, including code rollback/forward repair and before/after counts/checksums. Do not apply baseline create-table SQL to populated tables.
5. **Complete:** exact branch Node 22 CI passed all five checks for 34723cdded64a751b6a36c208a69421f4a57ac44 in [GitHub Actions run 39820430062](https://github.com/Hegazian/Digital-Platform/actions/runs/39820430062), including the server empty/populated migration fixture and both browser modes.
6. **Remaining:** restore an authorized representative copy, inspect it with read-only schema diff, rehearse baseline resolution plus rollback/forward repair and backup/restore, then obtain operator review before marking ENG-05 Complete.

Baseline-task exclusions: taxonomy, canonical course migration, managed assets, commerce and assessment revisions keep their own owners and subsequent ordered migrations. The baseline/fixture engineering prerequisite is ready for local implementation; representative restore, deployment adoption and rollback approval remain release holds. No production database changes are authorized by this document.

## M1 implementation waves

Waves respect the existing dependency graph; they are not dates or estimates. Within a wave, read each task's dependency list before starting. The ENG-09/ENG-02 review fixes are complete. ENG-05 and ENG-06 remain In Progress pending representative database and real infrastructure rehearsals; ENG-02/ENG-09 retain broader acceptance items. 21 other M1 tasks remain Planned; ENG-13 also remains In Progress. Wave 1 code regressions pass, but its operational and acceptance exit evidence is incomplete.

### Wave 1 — Migration baseline and independent reliability

[ENG-05](tasks/ENG-05.md), [ENG-06](tasks/ENG-06.md), [ENG-09](tasks/ENG-09.md), [ENG-02](tasks/ENG-02.md).

The M1-R01–R04 code regressions and full local desktop/mobile browser acceptance now pass. ENG-05 and ENG-06 have historical M0 CI; ENG-06 also has a POSIX process-level SIGTERM regression awaiting Linux CI. Finish the restored-copy review and real storage/upload shutdown rehearsals. ENG-02 still needs exact-head CI and task-specific manual acceptance. Complete ENG-09 transport/device acceptance using known READY fixtures. ENH-03 owns subsequent processing.

Exit evidence: Exact-head remote CI; ENG-05 restored-copy diff/restore rehearsal; ENG-06 stalled-readiness SIGTERM process test on Linux plus real storage outage and upload drain tests; ENG-09 real upload, bounded memory, scan, cleanup, playback/range and target-device tests; ENG-02 migration fixture, stale-write conflict, rate readback, immutable order snapshots, bilingual browser admin/student EGP display and manual saved-state checks.

### Wave 2 — Shared data, identity and commerce primitives

[ENH-01](tasks/ENH-01.md), [ENH-02](tasks/ENH-02.md), [ENG-07](tasks/ENG-07.md), [COM-03](tasks/COM-03.md), [COM-05](tasks/COM-05.md), [COM-09](tasks/COM-09.md), [SEC-07](tasks/SEC-07.md), [SEC-13](tasks/SEC-13.md), [SEC-14](tasks/SEC-14.md).

ENG-05 baseline code and its populated disposable upgrade fixture are verified for local feature development. Continue COM-09 lifecycle primitives and ENH-02 shared contracts, then curriculum metadata, audit/outbox, subscription terms, scoped idempotency, bank ownership and atomic session/MFA behavior. Representative restore/operator approval remains a release gate; it does not authorize production migrations.

Exit evidence: Schema/contract and preservation checks; real PostgreSQL races for token/code consumption, payment intent and calendar boundaries; cross-account bank tests.

### Wave 3 — Foundation integration

[ENG-04](tasks/ENG-04.md), [LRN-07](tasks/LRN-07.md), [ENG-08](tasks/ENG-08.md), [COM-01](tasks/COM-01.md), [COM-02](tasks/COM-02.md), [COM-06](tasks/COM-06.md), [ENG-14](tasks/ENG-14.md), [ENH-03](tasks/ENH-03.md).

Integrate route validation, canonical modules, side-effect-free reads, shared access, renewal, recoverable payment transitions, client session recovery and managed private media. Each task starts only when its own dependencies are Complete.

Exit evidence: Legacy IDs/progress/previews retained; all grant-source/date decisions agree; paid-but-unfulfilled recovery; actual private storage/upload/scan/range and tab/session failure tests.

### Wave 4 — Visibility, learning authorization and products

[SEC-06](tasks/SEC-06.md), [SEC-12](tasks/SEC-12.md), [COM-07](tasks/COM-07.md).

Apply the shared policy to visibility and every discussion/assignment/bank surface; validate products and snapshot explicit access durations.

Exit evidence: Guest/student/teacher/admin visibility and cross-account matrix; effective access tests; invalid product rejection and historical duration preservation.

### Wave 5 — Pricing and G1 evidence

[COM-11](tasks/COM-11.md).

Finish atomic course pricing and purchase-history preservation, then review every G1 criterion. This wave does not by itself complete the G3 paid checkout/voucher workflow.

Exit evidence: Concurrent price edits/purchases preserve snapshots; all M1 task acceptance and G1 evidence reviewed, with no migration, access, storage or session gaps.

## Continuous verification and review

- Every implemented task adds meaningful positive/negative, cross-account, real database concurrency/recovery, migration and Arabic/English tests as applicable. Keep the 397-server/63-client and 24-per-mode browser checkpoint as historical regression evidence; record new counts for the new commit instead of treating them as a fixed test quota.
- Use [M0 manual steps](M0_MANUAL_TESTING.md) for current flows. Recheck disabled developer tabs with no requests, malformed cookies, transient refresh failures, protected course inspection, rapid PDF/course switches, failed video renewal retry, mobile profile/logout, enrollment and assignment delivery in both locales.
- Before local integration tests, verify the dedicated test target. Existing schema push is limited to local development and disposable test fixtures; install/upgrade workflows use reviewed migrations. Never use destructive fixture cleanup on a shared or real-student database.
- Preserve exact CI artifacts and coverage denominators. The [coverage inventory](../audit/m1-review/coverage-gaps.json) and [domain ownership table](TESTING_RELEASE_GATES.md#untested-and-incompletely-tested-domain-ownership) identify what still needs tests. Do not claim every feature tested because every dashboard tab opened.
- Regenerate docs using 'node docs/scripts/build-docs.cjs', validate using 'node docs/scripts/validate-docs.cjs', and update current evidence only when new checks actually run. Keep the 58 finding IDs, 42 acceptance dispositions and immutable archived originals.

## After M1

| Milestone | Delivery focus | Required exit evidence |
|---|---|---|
| M2 / G2 | Manual editors/import preview and atomic draft commit; exact teacher revision review; ordered accessible blocks and uploaded captions; frozen assessments/deadlines/manual grading; assignment/progress; bilingual journeys | Complete real author-to-review-to-student flow and domain test/compatibility evidence, with no automatic publication or educational generation |
| M3 / G3 | Verified manual payments, EGP vouchers/renewals/refunds/reconciliation; recovery/support; guardian consent and privacy/retention; accurate metrics; production monitoring, backups and limited pilot | All launch task dispositions reviewed, full-source coverage target met, current advisory policy, production canaries and restore/rollback signed off, exact remote CI pass and pilot owner |
| M4 / G4 | Automated providers, portal, certificates, offline packs, collaboration, isolated execution and developer integrations | Each independent feature implementation, security/device/provider tests and server enablement gate; containment stays active until then |

The complete list and ownership graph remain in [ROADMAP_BACKLOG.md](ROADMAP_BACKLOG.md). Product work continues to present uploader-supplied Egyptian educational content in Arabic and English.
