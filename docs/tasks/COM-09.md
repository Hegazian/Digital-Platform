# COM-09 — Define effective dates, archival and retraction semantics

| Field | Value |
|---|---|
| Stable ID | COM-09 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Access lifecycle primitives |
| Dependencies | [ENG-05](ENG-05.md) |
| Original finding / request | [COM-09 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A12](../AUDIT_TRACEABILITY.md#a12) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Entitlement resolvers check expiry but not `startsAt`; future-dated grants can work immediately. Several teacher/analytics queries also ignore expiry. Archived/unpublished course state is not consistently included in learning authorization.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Effective grants require startsAt <= now < expiresAt and no revocation. Archive stops discovery/new sales while retaining existing purchased access; explicit retraction denies student learning.

Access lifecycle primitives owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: implement pure effective-date/course-lifecycle predicates consumed by COM-01; separate ARCHIVED from RETRACTED and DRAFT.
2. Frontend: admin archive/retract actions explain existing access and reason; student UI distinguishes expiry and content withdrawal.
3. Database: add lifecycle timestamps/reason/actor and preserve last published revision binding; null expiry means explicitly perpetual only.
4. Configuration/infrastructure: invalidate access/catalog cache on transitions and emit auditable retraction notices; short delivery URL lifetime remains documented.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/commerce/entitlement-resolver.service.ts](<../../server/src/modules/commerce/entitlement-resolver.service.ts>)
- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
effective(grant,now) = active && startsAt<=now && (expiresAt==null || now<expiresAt) && revokedAt==null; archive(c_1) retains preexisting grants; retract(c_1) denies student delivery.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Only admin can retract published content, with reason and incident record. Teachers request withdrawal via review workflow. Archive is not an entitlement revocation; unpublishing cannot secretly erase purchases. Existing bounded signed URLs may last to expiry; strict retraction uses proxy delivery.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Classify old archived/unpublished records without guessing paid-access intent. Preserve all grants and last published snapshot; unresolved lifecycle rows become admin review items. Rollback must not reopen retracted content.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-09-T01** — Exact startsAt, one millisecond before expiry, exact expiry, revoked and future grants behave identically.
- **COM-09-T02** — Existing purchaser can read archived course until expiry; new checkout/discovery blocked; retract blocks every student surface.
- **COM-09-T03** — Race archive/payment/retract and assert no new sale after archive decision; Arabic/English states and expiry match.
- **COM-09-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-09-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-09-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A12 lifecycle/date truth table is normative and tested.
- [ ] Archive and retraction are separate auditable operations.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
