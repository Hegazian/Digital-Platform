# SEC-06 — Enforce public, unlisted and private visibility consistently

| Field | Value |
|---|---|
| Stable ID | SEC-06 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [SEC-04](SEC-04.md), [COM-01](COM-01.md) |
| Original finding / request | [SEC-06 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1: PRIVATE/UNLISTED visibility is not enforced [R: F02-F03] |
| Acceptance links | [A04](../AUDIT_TRACEABILITY.md#a04), [A12](../AUDIT_TRACEABILITY.md#a12) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Public course reads check publication status, not the `visibility` field. A published `PRIVATE` fixture returned **200 anonymously**. Neither private cohort access nor unlisted discovery semantics are implemented. Include visibility in catalog queries and per-course authorization; test all role/visibility/publication combinations.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

PUBLIC is discoverable; UNLISTED is link-discoverable metadata only; PRIVATE metadata requires owner/admin or active assigned membership. Learning always requires its own access decision.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: add visibility predicates to catalog/search/collections/recommendation queries; use one detail policy to prevent ID enumeration.
2. Frontend: separate public catalog from teacher studio; label unlisted/private state without treating URL secrecy as access.
3. Database: index publication/visibility and preserve configured visibility values.
4. Configuration/infrastructure: invalidate public caches on visibility changes and use private/no-store for membership-specific metadata.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)
- [server/src/modules/collections/collection.service.ts](<../../server/src/modules/collections/collection.service.ts>)
- [server/src/modules/careers/careers.service.ts](<../../server/src/modules/careers/careers.service.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
GET /api/v1/courses?visibility=PRIVATE as guest -> 422 unsupported public filter; GET private c_1 without membership -> 404 NOT_FOUND.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Published is necessary but insufficient. Private membership follows effective grants, not a stale UI flag. Concurrent visibility changes invalidate cache versions; new learning requests use current state.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Audit existing PRIVATE/UNLISTED courses before rollout; keep ownership and grants. Do not silently convert them to PUBLIC during backfill. Rollback keeps the stricter policy.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-06-T01** — Visibility × publication × guest/member/nonmember/owner/admin matrix covers list, detail, collection and direct learning.
- **SEC-06-T02** — Private titles/counts do not leak through search facets; unlisted course omitted from lists but link metadata works.
- **SEC-06-T03** — Browser switch public/private and refresh in Arabic/English; cache cannot retain old discoverability.
- **SEC-06-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-06-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-06-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] All discoverability surfaces share the matrix.
- [ ] Reproduced anonymous PRIVATE fixture is denied.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
