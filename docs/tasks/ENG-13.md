# ENG-13 — Build trustworthy isolated tests and production CI gates

| Field | Value |
|---|---|
| Stable ID | ENG-13 |
| Priority | P1 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **In Progress** |
| Implementation owner | Quality engineering and dependency remediation |
| Dependencies | None; start independently within the milestone gate. |
| Original finding / request | [ENG-13 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A01](../AUDIT_TRACEABILITY.md#a01), [A40](../AUDIT_TRACEABILITY.md#a40) |
| Release disposition | M0 harness/dependency subgate Complete; full-product coverage and production CI evidence remain In Progress through G3. |

**M0 checkpoint evidence:** See [current verification](../CURRENT_STATUS.md), [implementation results and task disposition](../archive/reviews/M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../archive/reviews/M0_REVIEW_ROUND_2.md), and [manual checks](../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. The isolated PostgreSQL harness, whole-source reporting, client component tests, production/development browser jobs and dependency policy are implemented. Latest local API/client evidence: 422 server tests and 79 client tests. CI browser evidence: 24 checks per mode; local browser attempts are recorded separately. Full-source G3 coverage, migration/concurrency/domain breadth and actual-device coverage remain open. Remote evidence is attributed to its recorded commit. Use the [coverage-gap inventory](../../audit/final-m0/coverage-gaps.json), domain owners and [next steps](../NEXT_STEPS.md); do not lower release thresholds to mark this Complete. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

CI runs backend tests without coverage and has no Playwright job, dependency advisory gate, or migration-upgrade test. Browser tests skip video access, conditionally skip admin paths, and sometimes accept an empty catalog. The RTL assertion accepts either direction after toggling.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Safe test infrastructure and fresh dependency triage are established first; release CI evolves to run all advertised-flow and migration/security gates without permissive skips.

Quality engineering and dependency remediation owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: enforce test-DB identity allowlist before any destructive cleanup; separate DB-free/unit and migrated integration suites with deterministic factories and real concurrency barriers.
2. Frontend: add component tests for auth/timers/player state and required Playwright fixtures for student/teacher/admin; remove skip-on-missing-credentials and empty-catalog success assertions.
3. Database: provision disposable PostgreSQL and migration-upgrade fixture, never use shared dev/prod target; assert durable state after error paths.
4. Configuration/infrastructure: clean lockfile install/generate/typecheck/build, coverage.include all intended production sources, browser artifacts, dependency advisory triage and docs validator.
5. Dependencies: triage recorded advisories by locked runtime path/deployment applicability; upgrade supported patched Next/React/tooling and upload/editor/parser dependencies in reviewed changes, no audit fix --force; rerun affected contracts/browser/builds.
6. Release progression: M0 establishes harness and dependency remediation; M1–M3 add tests with owning tasks, and paid gate demands complete critical journeys/upgrade/restore evidence.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [.github/workflows/ci.yml](<../../.github/workflows/ci.yml>)
- [server/vitest.config.ts](<../../server/vitest.config.ts>)
- [client/playwright.config.ts](<../../client/playwright.config.ts>)
- [server/src/modules/quizzes/__tests__/quiz.v2.spec.ts](<../../server/src/modules/quizzes/__tests__/quiz.v2.spec.ts>)
- [audit/TEST_GAP_MATRIX.md](<../../audit/TEST_GAP_MATRIX.md>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
CI must fail before writes unless NODE_ENV=test and resolved DATABASE_URL/DIRECT_URL target the explicit local eduplatform_test allowlist. G3 release coverage targets: >=80% statements/lines/functions, >=75% branches over explicitly included production sources. M0 enforces separate regression/per-file ratchets documented in TESTING_RELEASE_GATES.md; critical invariants require tests regardless of percentage.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Do not call unrun tests passing. Keep 108/16 passing baseline distinct from incomplete project coverage. Advisory exemptions need exact package/path/applicability/owner/expiry; no untriaged critical/high production exposure at release. Test execution must never enable API-host code execution.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve existing meaningful tests and convert defect probes into secure regression expectations. Upgrade frameworks separately from data migrations; record lockfile/runtime versions and rollback compatibility. Windows Prisma DLL locks need clean process/CI regeneration, not ignored build errors.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-13-T01** — Wrong DB URL aborts before cleanup; disposable clean and previous-schema migration runs pass.
- **ENG-13-T02** — Seeded catalog/paid preview/teacher review/receipt/assessment/recovery Arabic/English browser journeys run with zero required skips.
- **ENG-13-T03** — Dependency report, whole-source coverage, JUnit/trace/build/restore artifacts correspond to exact commit; missing evidence fails gate.
- **ENG-13-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-13-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-13-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] M0 safe harness plus dependency remediation completed; final gate rerun in M3 with accumulated tests.
- [ ] A01/A39/A40 and all launch acceptance cases have named required CI jobs.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
