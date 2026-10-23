# Implementation documentation — start here

Refreshed: **23 October 2026**. [Current status](CURRENT_STATUS.md) records test evidence and release holds. The active backlog contains 62 unfinished tasks; 15 completed specifications are [archived](archive/completed/README.md). The [M1 release closure](M1_RELEASE_READINESS.md) lists every unfinished foundation task, review finding and external evidence requirement. Read [the M1 review](M1_REVIEW.md), [manual checks](M1_MANUAL_TESTING.md) and [implementation order](NEXT_STEPS.md) together. G1–G3 remain open; current work uses local fixtures only. [The final M0 review](M0_FINAL_REVIEW.md) remains historical checkpoint evidence.

> A bilingual educational platform for Egyptian students across all school stages. Admins and approved teachers provide educational content through uploads, imports, and manual editors. The platform organizes, reviews, publishes, protects, and presents that content, manages assessments and student progress, and controls enrollment and paid access.

## Ordered start checklist

1. Read [product scope](PRODUCT_SCOPE.md) and confirm the uploader/editor responsibility and required teacher review.
2. Read [current verification](CURRENT_STATUS.md) and [baseline evidence and limits](TESTING_RELEASE_GATES.md#baseline-evidence); G0 is complete for internal work, while external onboarding remains gated by G1–G3 and operator evidence.
3. Keep [M1-R01–R04](M1_REVIEW.md) regressions passing under ENG-09/ENG-02: upload lifetime, atomic config responses, pricing draft retention and compatible READY browser fixtures. Complete the remaining task evidence, follow [manual checks](M1_MANUAL_TESTING.md), keep ENG-05/06 rehearsals open and use the [M1 dependency waves](NEXT_STEPS.md#m1-implementation-waves). ENG-13 retains full-product verification ownership.
4. Before real traffic, complete G1–G3 and the storage/scanner/credential/restore holds in [operations](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold).
5. Implement migrations/contracts/taxonomy/access/assets under their owning tasks; read [target architecture](TARGET_ARCHITECTURE.md) and [contracts](API_DATA_CONTRACTS.md) before adding endpoints.
6. Deliver manual authoring/import -> exact admin review -> private lesson -> assessment/assignment -> progress in Arabic and English, then verified manual payment/voucher journeys.
7. Rehearse [operations, migration and recovery](MIGRATION_OPERATIONS.md), resolve minor-consent/retention and license decisions, and collect [release gate evidence](TESTING_RELEASE_GATES.md) for a limited pilot.
8. Keep every M4 capability disabled at API boundaries; enable each only after its own gate. Automated payment adapters have independent provider sign-offs.

## Package index

| Document | Purpose |
|---|---|
| [Current implementation status](CURRENT_STATUS.md) | Latest verified commit, exact tests/coverage, completed work and remaining holds |
| [M1 release closure](M1_RELEASE_READINESS.md) | Complete M1 task disposition, current review findings and remaining release evidence |
| [Next implementation steps](NEXT_STEPS.md) | Verified baseline prerequisite, next local M1 implementations, dependency waves and external release evidence |
| [M1 review](M1_REVIEW.md) | Four resolved code findings, owners, regressions and remaining acceptance limits |
| [M1 manual verification](M1_MANUAL_TESTING.md) | Step-by-step config, pricing, upload, playback and operations checks |
| [ENG-02 implementation evidence](ENG02_IMPLEMENTATION.md) | Config versioning, EGP semantics, resolved concurrency/draft regressions and remaining acceptance |
| [ENG-05 implementation evidence](ENG05_IMPLEMENTATION.md) | Baseline rationale, local and remote migration checks, and outstanding adoption gates |
| [ENG-06 implementation evidence](ENG06_IMPLEMENTATION.md) | Liveness/readiness, storage selection, graceful drain, local tests and remaining outage checks |
| [ENG-09 implementation evidence](ENG09_IMPLEMENTATION.md) | Bounded video upload staging/streaming, accurate processing state, range tests and remaining M1 acceptance |
| [Product goal and scope](PRODUCT_SCOPE.md) | Audiences, permissions, all-school curriculum, launch scope and exclusions |
| [Target architecture](TARGET_ARCHITECTURE.md) | Module/data ownership, workers, deployment and safety boundaries |
| [API and data contracts](API_DATA_CONTRACTS.md) | Normative DTOs, schemas, actions, errors, validation and compatibility |
| [Roadmap and backlog](ROADMAP_BACKLOG.md) | Unfinished task links, dependencies, milestones and execution order |
| [Completed task specifications](archive/completed/README.md) | Completed records archived under their own milestone and excluded from the active backlog |
| [Final M0 review](M0_FINAL_REVIEW.md) | Findings, corrections, fresh verification and merge disposition |
| [Audit traceability](AUDIT_TRACEABILITY.md) | All 58 findings and all 42 previous acceptance dispositions |
| [Testing and release gates](TESTING_RELEASE_GATES.md) | Baseline, fixtures, CI, exit criteria and sign-off evidence |
| [M0 manual testing](M0_MANUAL_TESTING.md) | Local setup, step-by-step checks and visible browser replay |
| [Earlier reviews](archive/reviews/README.md) | Historical checkpoint results and resolved findings, removed from the active plan |
| [M0 dependency review](M0_DEPENDENCY_REVIEW.md) | Patched runtime paths and bounded development-only exceptions |
| [Migration and operations](MIGRATION_OPERATIONS.md) | Data/asset preservation, deployment, rollback, recovery and monitoring |
| [Task template](TASK_TEMPLATE.md) | Required task detail and completion checklist |
| [Documentation verification](VERIFICATION_REPORT.md) | Task/finding/case coverage, links, dependencies and archived hash checks |
| [Archived documents](archive/INDEX.md) | Exact previous guides/FR/TC identifiers, superseded status and hashes |

Task source is maintained in [documentation authoring scripts](scripts/build-docs.cjs); [task-manifest.json](task-manifest.json) is machine-readable output. Run 'node docs/scripts/build-docs.cjs' to rebuild generated task/index/entry docs, then 'node docs/scripts/validate-docs.cjs'. Shared hand-written specifications are not overwritten by the generator. The generator and validator do not connect to the application or database; the separate advisory script contacts the NPM advisory service.
