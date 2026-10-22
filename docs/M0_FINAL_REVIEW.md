# Milestone 0 final review and integration readiness

Review date: **22 October 2026**. The same independent reviewer inspected the full branch at `5e4495234653c465423468f8e6d62bd1e49cb6a5` against `2fbdc8e65a5bd5c33f749ed04b65155e9e06e1e2`, including early M1 work. The original working tree was clean. The prior five findings were fixed; four further defects were reproduced and their corrections were independently verified at **19f3540**. The reviewer then reproduced an adjacent video-reference bypass; its correction at **5e0267f** is under review.

## Findings and corrections

| Finding | Impact | Correction and regression evidence |
|---|---|---|
| P1: arbitrary material file references | A teacher could cause the new delivery adapter to sign another user's private object | New upload keys are bound to the server-generated material ID. Delivery verifies that binding before local reads or cloud signing. Manual attachments accept public HTTPS links, never storage keys. Unverified legacy keys fail closed and retain their bytes for recovery. HTTP tests substitute submission keys and unrelated material IDs. |
| P2: last-admin race | Concurrent deactivation/demotion could leave zero active administrators | Both mutations re-read current state within serializable transactions and retry only Prisma serialization failures. PostgreSQL regression tests force both transactions to read the count before either writes. |
| P2: external PDF regression | Accepted public document URLs became unavailable after DTO rewriting | Validated external HTTPS references remain direct in delivery DTOs. Direct content requests redirect without any platform credential or server-side fetch. Storage-origin URLs cannot use this external-link path. |
| P2: timestamp corruption | Recursive catalog sanitization converted Date values to empty objects | Date instances serialize to ISO strings before recursive object rewriting. Catalog and protected-learning HTTP assertions check actual timestamps. |
| P1: adjacent video-reference substitution | An owned video row could point at unrelated private submission bytes | Uploads bind object keys to a server-generated video ID. Lesson authoring resolves internal references only to an owned uploaded video, and signing/local streaming validate resource scope again. Public HTTPS video references remain separate and never receive platform credentials. Real file-byte and authorization regressions cover the bypass. |

Code and tests: [material policy](../server/src/modules/materials/material-reference.ts), [delivery controller](../server/src/modules/materials/material.controller.ts), [material HTTP tests](../server/src/modules/materials/__tests__/material.integration.spec.ts), [admin service](../server/src/modules/admin/admin.service.ts), [PostgreSQL race tests](../server/src/modules/admin/__tests__/admin-race.spec.ts), [course serializer](../server/src/modules/courses/course.service.ts), [catalog HTTP tests](../server/src/modules/courses/__tests__/course.visibility.spec.ts).

## Verification

- Before corrections, the complete API coverage run passed **78 files / 405 tests**. This resolves the previous report of an unverified full suite: it completed in 183 seconds.
- The client coverage run first had one inspection-test timeout under parallel load; serial execution passed **9 files / 63 tests**. This is recorded as a test timing limitation, not a confirmed application defect.
- Core corrections passed **79 files / 410 API tests** with whole-source coverage of 72.70% statements, 65.20% branches, 91.00% functions and 73.62% lines. The video correction's focused suite passed **8 files / 46 tests**. Server typecheck and both production builds passed.
- Full API coverage and browser journeys for the latest video correction are still being collected. No older CI result is attributed to new changes.
- The last verified remote workflow remains [39788280147](https://github.com/Hegazian/Digital-Platform/actions/runs/39788280147) for `b6dd8d4`; all five checks passed. No PR exists yet for the current local application revision, so the Code Review plugin's PR-CI diagnostics cannot certify it.

## Merge disposition

**Hold integration until the architecture conflict and review gates are resolved.** Remote `main` advanced to `f175fcd0c79041747561859aee9dce741771d02f` through PR #2. Its simplification removes CourseModule, assessment, collection, career and other models, uses Sections as modules, and adds a competing `0001_init` baseline. The approved milestone architecture preserves historical data and introduces changes through reviewed versioned migrations.

The first integration attempt was aborted without committing conflicts. The user explicitly chose **the approved milestone architecture with existing data/models preserved**. Integration therefore retains the reviewed schema and migration chain, defers incompatible simplification to owning tasks with data-preserving migrations, and preserves compatible incoming fixes. Neither create-only baseline may run blindly on existing tables or alongside the other baseline. No schema change was applied. The combined tree still requires independent review and CI before merge. M1 must start from the resulting reviewed main commit.

## Documentation disposition

The active backlog excludes completed task specifications. All 15 completed M0 specifications move to [the completed archive](archive/completed/README.md), retaining IDs, acceptance scenarios and dependencies. The manifest keeps all 77 records and each document path; 62 unfinished tasks remain active. Ten superseded root wrappers are removed and no longer regenerated. Three earlier M0 status/review documents move to [review history](archive/reviews/README.md). The original guide archives and SHA-256 records remain intact. Current scope, architecture, contracts, operations, dependency decisions and regression guides remain because they govern unfinished work and release evidence.

G1–G3, production storage/scanner canaries, credential remediation, representative restore/rollback, and real shutdown/outage rehearsals remain open. This review does not authorize production traffic or infer completion of later milestones.
