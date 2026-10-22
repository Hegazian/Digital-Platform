# ENG-01 — Repair the Zod 4 build blocker and nested config schema

| Field | Value |
|---|---|
| Stable ID | ENG-01 |
| Priority | P0 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Platform engineering |
| Dependencies | None; start independently within the milestone gate. |
| Original finding / request | [ENG-01 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P0 / compiler |
| Acceptance links | [A01](../AUDIT_TRACEABILITY.md#a01) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../CURRENT_STATUS.md), [implementation results and task disposition](../M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../M0_REVIEW_ROUND_2.md), and [manual checks](../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. The M0 engineering/containment deliverable is complete at **d9c720f**, including the follow-up regressions. See [current verification](../CURRENT_STATUS.md), [first review](../M0_REVIEW_RESOLUTION.md) and [second review](../M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Zod 4 record schema blocks backend typecheck/build at [config.routes.ts:23](<../../server/src/modules/config/config.routes.ts>).

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Backend generates Prisma and typechecks/builds from a clean lockfile install; config records use the installed Zod 4 signature and a bounded typed structure.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: replace one-argument z.record(z.any()) with explicit key/value schema; prefer concrete home-content object schemas for supported fields.
2. Frontend: align config form value types and handle schema errors without broad any casts.
3. Database: no data mutation; inspect existing config JSON against tightened schema and report incompatible entries.
4. Configuration/infrastructure: reproduce in clean CI Node baseline, generate Prisma before typecheck; do not misclassify stale generated-client errors as source defects.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/config/config.routes.ts](<../../server/src/modules/config/config.routes.ts>)
- [server/src/utils/schemas.ts](<../../server/src/utils/schemas.ts>)
- [server/package.json](<../../server/package.json>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
z.record(z.string().max(64), boundedHomeSectionSchema); PATCH homeContent unknown section/oversized nested value -> 422 VALIDATION_ERROR.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Existing admin authorization stays required. Compile success cannot be obtained by disabling typechecks, using ts-ignore or making all config values any. ENG-04 owns route-wide schema adoption.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Export existing config JSON before tightening; migrate known supported shapes explicitly, retaining unknown legacy values in an operator report. Rollback of validation never restores unsafe arbitrary active HTML.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-01-T01** — Clean npm ci, prisma generate, npm run typecheck and npm run build all pass on supported CI runtime.
- **ENG-01-T02** — Malformed nested config rejected and valid existing shape round-trips.
- **ENG-01-T03** — Admin Arabic/English home-content form error display matches messageKey/field paths.
- **ENG-01-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-01-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-01-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] TS2554 at config.routes.ts is removed without suppressions.
- [ ] A01 includes real clean generation/build evidence.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
