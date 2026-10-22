# Implementation documentation — start here

Refreshed: **22 October 2026**. Original audit baseline: **2fbdc8e**. The M0 internal engineering checkpoint is finalized; [current status](CURRENT_STATUS.md) records the latest tests, coverage and production holds. ENG-05's baseline and populated fixture pass locally; its remote CI and restore/recovery evidence remain in progress. G1–G3 remain open. **Continue ENG-05 validation**, then follow [the M1 handoff](NEXT_STEPS.md).

> A bilingual educational platform for Egyptian students across all school stages. Admins and approved teachers provide educational content through uploads, imports, and manual editors. The platform organizes, reviews, publishes, protects, and presents that content, manages assessments and student progress, and controls enrollment and paid access.

## Ordered start checklist

1. Read [product scope](PRODUCT_SCOPE.md) and confirm the uploader/editor responsibility and required teacher review.
2. Read [current verification](CURRENT_STATUS.md) and [baseline evidence and limits](TESTING_RELEASE_GATES.md#baseline-evidence); G0 is complete for internal work, while external onboarding remains gated by G1–G3 and operator evidence.
3. Continue [ENG-05](tasks/ENG-05.md) through remote CI and restore/recovery review; start the other ready M1 tasks in parallel where appropriate. Follow the [M1 execution waves](NEXT_STEPS.md#m1-implementation-waves) and M1–M3 dependencies in [roadmap](ROADMAP_BACKLOG.md). ENG-13 continues the full-product coverage/release work.
4. Before real traffic, complete G1–G3 and the storage/scanner/credential/restore holds in [M0 implementation status](M0_IMPLEMENTATION_STATUS.md).
5. Implement migrations/contracts/taxonomy/access/assets under their owning tasks; read [target architecture](TARGET_ARCHITECTURE.md) and [contracts](API_DATA_CONTRACTS.md) before adding endpoints.
6. Deliver manual authoring/import -> exact admin review -> private lesson -> assessment/assignment -> progress in Arabic and English, then verified manual payment/voucher journeys.
7. Rehearse [operations, migration and recovery](MIGRATION_OPERATIONS.md), resolve minor-consent/retention and license decisions, and collect [release gate evidence](TESTING_RELEASE_GATES.md) for a limited pilot.
8. Keep every M4 capability disabled at API boundaries; enable each only after its own gate. Automated payment adapters have independent provider sign-offs.

## Package index

| Document | Purpose |
|---|---|
| [Current implementation status](CURRENT_STATUS.md) | Latest verified commit, exact tests/coverage, completed work and remaining holds |
| [Next implementation steps](NEXT_STEPS.md) | ENG-05 handoff, all 25 M1 tasks in dependency waves, ongoing test work and later gates |
| [ENG-05 implementation evidence](ENG05_IMPLEMENTATION.md) | Baseline rationale, local empty/populated migration fixture results and outstanding adoption gates |
| [Product goal and scope](PRODUCT_SCOPE.md) | Audiences, permissions, all-school curriculum, launch scope and exclusions |
| [Target architecture](TARGET_ARCHITECTURE.md) | Module/data ownership, workers, deployment and safety boundaries |
| [API and data contracts](API_DATA_CONTRACTS.md) | Normative DTOs, schemas, actions, errors, validation and compatibility |
| [Roadmap and backlog](ROADMAP_BACKLOG.md) | All 77 task links, dependencies, milestones and execution order |
| [Audit traceability](AUDIT_TRACEABILITY.md) | All 58 findings and all 42 previous acceptance dispositions |
| [Testing and release gates](TESTING_RELEASE_GATES.md) | Baseline, fixtures, CI, exit criteria and sign-off evidence |
| [M0 implementation status](M0_IMPLEMENTATION_STATUS.md) | Final internal checkpoint, exact results, task dispositions and production holds |
| [M0 manual testing](M0_MANUAL_TESTING.md) | Local setup, step-by-step checks and visible browser replay |
| [M0 review resolution](M0_REVIEW_RESOLUTION.md) | All five follow-up findings and regression evidence |
| [Second M0 review](M0_REVIEW_ROUND_2.md) | 22 October fixes, dashboard/session/mobile testing and remaining gaps |
| [M0 dependency review](M0_DEPENDENCY_REVIEW.md) | Patched runtime paths and bounded development-only exceptions |
| [Migration and operations](MIGRATION_OPERATIONS.md) | Data/asset preservation, deployment, rollback, recovery and monitoring |
| [Task template](TASK_TEMPLATE.md) | Required task detail and completion checklist |
| [Documentation verification](VERIFICATION_REPORT.md) | Task/finding/case coverage, links, dependencies and archived hash checks |
| [Archived documents](archive/INDEX.md) | Exact previous guides/FR/TC identifiers, superseded status and hashes |

Task source is maintained in [documentation authoring scripts](scripts/build-docs.cjs); [task-manifest.json](task-manifest.json) is machine-readable output. Run 'node docs/scripts/build-docs.cjs' to rebuild generated task/index/entry docs, then 'node docs/scripts/validate-docs.cjs'. Shared hand-written specifications are not overwritten by the generator. The generator and validator do not connect to the application or database; the separate advisory script contacts the NPM advisory service.
