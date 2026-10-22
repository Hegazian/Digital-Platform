# Next implementation steps

Updated **22 October 2026** against verified application commit **d9c720f**. M0 internal engineering is complete; this is the implementation handoff for **M1 — Foundation and content delivery**. Current verification, caveats and task counts are in [CURRENT_STATUS.md](CURRENT_STATUS.md). No application migration, deployment or M1 implementation was performed by this documentation update.

## Start here

1. Retain the committed M0 regressions and review the [current status](CURRENT_STATUS.md), [target architecture](TARGET_ARCHITECTURE.md), [contracts](API_DATA_CONTRACTS.md) and [operations holds](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold).
2. Implement **[ENG-05](tasks/ENG-05.md) first**. Prepare a reviewed migration baseline and disposable populated upgrade fixture before adding the next schema-dependent feature. Do not apply generated baseline SQL to existing tables blindly.
3. Continue **[ENG-13](tasks/ENG-13.md)** throughout: keep local gates green, obtain a remote Node 22 CI result, add semantic domain/component/concurrency tests with each task, and work toward the existing release coverage target. Resolve development advisory exceptions before paid release or 19 January 2027.
4. Follow the M1 waves below; complete each task's own prerequisites and acceptance evidence. Independent work may overlap, but dependent schema/API work must consume the owning implementation.
5. Review **G1** using real upgrade, private-storage, access, session and outage evidence; then advance to M2 authoring/learning and M3 manual paid pilot. Keep all staged features denied at the API.

## First implementation task — ENG-05

Owner: database migrations and operations. Status: **Planned**, priority **P1**. See the [full task](tasks/ENG-05.md) and [migration runbook](MIGRATION_OPERATIONS.md). The original missing DIRECT_URL example has already been corrected in M0; do not repeat that as an unresolved defect. The additive auth-version bridge and its limited prior-schema user-table test do not establish a full migration chain.

1. Inventory the checked-in Prisma schema, the pre-M0 and current database shapes, existing IDs/FKs, SQL bridge and fixture/reset scripts. Identify drift, orphan records and unsupported variants explicitly. Keep the existing authVersion values and security guards.
2. Create reviewed initial migration history, migration lock metadata and package commands for deployment. On an existing verified matching database, baseline using the documented resolve procedure; on an empty database, apply the initial migration. Never run an initial create-tables migration against populated tables or force-reset a non-test database.
3. Add a deterministic, synthetic populated prior-schema fixture with users, lessons, progress, assessment/assignment history, grants/subscriptions, orders/payments and private-file references. Prove empty installation and populated upgrade converge to the expected schema while retaining original IDs, relationships and values. Validate the M0 auth-version transition without resetting versions above 1.
4. Replace release/CI schema push with reviewed migration deployment after tests prove the baseline. Preserve the current explicit host/database test safety checks before any write. Separate runtime and direct migration credentials; document schema-drift and interrupted-migration recovery.
5. Rehearse backup/restore and compatible code rollback or forward repair against disposable representative data and asset references. Compare counts/checksums and historical scores/access before and after; capture failures rather than silently repairing or deleting anomalies.
6. Run ENG-05-T01–T03 and applicable T90–T92, migration rerun/interrupt/drift tests, then impacted server/client and production/development browser regressions. Record exact commit, commands, schema diff, preservation report and recovery evidence. Mark ENG-05 Complete only after review; a local fixture does not substitute for later deployment-specific restore sign-off.

First-task exclusions: no taxonomy, canonical course migration, managed asset schema, new commerce model or assessment revision engine in this baseline task. Those owners add their own subsequent ordered migrations. No production database changes are authorized by this planning document.

## M1 implementation waves

Waves respect the existing dependency graph; they are not dates or estimates. Within a wave, read each task's dependency list before starting. All 25 M1 tasks remain Planned; ENG-13 is the continuing M0 task and is tracked separately. Only wave 1 is fully ready from the current completed-dependency set.

### Wave 1 — Migration baseline and independent reliability

[ENG-05](tasks/ENG-05.md), [ENG-06](tasks/ENG-06.md), [ENG-09](tasks/ENG-09.md), [ENG-02](tasks/ENG-02.md).

Start ENG-05 first. In parallel where capacity permits, make readiness/shutdown honest, bound existing media/range handling, and persist validated configuration with EGP charge semantics.

Exit evidence: Empty and populated upgrade/restore evidence; outage/shutdown tests; range/disconnect tests; config reload and EGP assertions.

### Wave 2 — Shared data, identity and commerce primitives

[ENH-01](tasks/ENH-01.md), [ENH-02](tasks/ENH-02.md), [ENG-07](tasks/ENG-07.md), [COM-03](tasks/COM-03.md), [COM-05](tasks/COM-05.md), [COM-09](tasks/COM-09.md), [SEC-07](tasks/SEC-07.md), [SEC-13](tasks/SEC-13.md), [SEC-14](tasks/SEC-14.md).

After ENG-05, establish curriculum metadata, shared contracts, audit/outbox, subscription terms, scoped idempotency, effective dates, bank ownership and atomic session/MFA behavior.

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
- Before local integration tests, verify the dedicated test target. Existing schema push is limited to disposable tests until ENG-05 replaces it. Never use destructive fixture cleanup on a shared or real-student database.
- Preserve exact CI artifacts and coverage denominators. The [coverage inventory](../audit/review-round-2/coverage-gaps.json) and [domain ownership table](TESTING_RELEASE_GATES.md#untested-and-incompletely-tested-domain-ownership) identify what still needs tests. Do not claim every feature tested because every dashboard tab opened.
- Regenerate docs using 'node docs/scripts/build-docs.cjs', validate using 'node docs/scripts/validate-docs.cjs', and update current evidence only when new checks actually run. Keep the 58 finding IDs, 42 acceptance dispositions and immutable archived originals.

## After M1

| Milestone | Delivery focus | Required exit evidence |
|---|---|---|
| M2 / G2 | Manual editors/import preview and atomic draft commit; exact teacher revision review; ordered accessible blocks and uploaded captions; frozen assessments/deadlines/manual grading; assignment/progress; bilingual journeys | Complete real author-to-review-to-student flow and domain test/compatibility evidence, with no automatic publication or educational generation |
| M3 / G3 | Verified manual payments, EGP vouchers/renewals/refunds/reconciliation; recovery/support; guardian consent and privacy/retention; accurate metrics; production monitoring, backups and limited pilot | All launch task dispositions reviewed, full-source coverage target met, current advisory policy, production canaries and restore/rollback signed off, exact remote CI pass and pilot owner |
| M4 / G4 | Automated providers, portal, certificates, offline packs, collaboration, isolated execution and developer integrations | Each independent feature implementation, security/device/provider tests and server enablement gate; containment stays active until then |

The complete list and ownership graph remain in [ROADMAP_BACKLOG.md](ROADMAP_BACKLOG.md). Product work continues to present uploader-supplied Egyptian educational content in Arabic and English.
