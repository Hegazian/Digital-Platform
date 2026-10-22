# COM-11 — Make course pricing atomic and preserve purchase history

| Field | Value |
|---|---|
| Stable ID | COM-11 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [COM-07](COM-07.md) |
| Original finding / request | [COM-11 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A15](../AUDIT_TRACEABILITY.md#a15) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Course/product creation and pricing updates are separate operations. A failure can leave a course without a valid product or display state inconsistent with checkout. Course deletion tries to delete products referenced by historical orders.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Course/product/pricing changes are transactional; deletion becomes archival when historical orders or student work reference a resource.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: wrap related course/product/default-pricing writes in one transaction using commerce service APIs; reject destructive deletion of referenced resources.
2. Frontend: admin archive action replaces misleading hard delete for sold/published courses; stale price forms require reload.
3. Database: use restrictive FKs/history snapshots and versioned product offers; preserve OrderItem resource labels even after archival.
4. Configuration/infrastructure: add reconciliation report for missing course/product links and transaction failure monitoring.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)
- [server/src/modules/commerce/commerce.service.ts](<../../server/src/modules/commerce/commerce.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
PATCH /api/v1/admin/courses/c_1/pricing with If-Match: "offer-v3" {"priceMinor":100000,"currency":"EGP","duration":{"unit":"DAY","count":90}} -> atomically new offer version; stale -> 412.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Current admin/authorized pricing role only. Existing order snapshots never change with display pricing. External storage cleanup is deferred via outbox after DB commit; no transaction assumes file deletion rollback.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory orphan products and referenced historical orders; repair via explicit mapping, no cascading deletion. Archive records rather than hard delete. Rollback restores prior sellable offer pointer, not old order amounts.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-11-T01** — Injected product/pricing failure leaves no partial course/price; order references remain intact.
- **COM-11-T02** — Deleting a sold course archives or returns conflict; student historic invoice remains readable.
- **COM-11-T03** — Parallel pricing edit/checkouts use one coherent snapshot; Arabic/English catalog and checkout agree.
- **COM-11-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-11-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-11-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A purchase history cannot be deleted by course maintenance.
- [ ] Course and product display state commit atomically.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
