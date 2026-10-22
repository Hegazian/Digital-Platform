# COM-07 — Validate products and snapshot explicit access durations

| Field | Value |
|---|---|
| Stable ID | COM-07 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [COM-06](COM-06.md), [COM-03](COM-03.md) |
| Original finding / request | [COM-07 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A13](../AUDIT_TRACEABILITY.md#a13), [A18](../AUDIT_TRACEABILITY.md#a18) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Products can lack or reference nonexistent resources. A paid order with no resource is committed without access. `ProductType.VOUCHER` is cast to an entitlement type that has no VOUCHER enum member. Every purchase receives a hardcoded 180-day entitlement.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Every sellable product identifies a valid resource, integer EGP amount and explicit duration; paid orders grant the exact purchased snapshot.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: typed product/resource validator for course/subject/bundle; exclude VOUCHER as an entitlement product kind; vouchers redeem valid grants through COM-08.
2. Frontend: admin pricing form requires resource, charge amount and duration or explicit non-expiring grant selection; checkout shows those exact values.
3. Database: add immutable OrderItem snapshot fields resourceType/resourceId/priceMinor/currency/durationVersion; constrain supported product-kind mapping.
4. Configuration/infrastructure: reject/disable invalid legacy products from sale, alert paid missing-resource records and reconcile with COM-06 instead of reporting success.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/commerce/commerce.service.ts](<../../server/src/modules/commerce/commerce.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/admin/CoursePricingManager.tsx](<../../client/src/components/admin/CoursePricingManager.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Product={"id":"p_1","resource":{"type":"COURSE","id":"c_1"},"priceMinor":150000,"currency":"EGP","duration":{"unit":"DAY","count":180}}; duration is mandatory and 180 is an example, never a default.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Admins edit future product offers only; an existing order snapshot is immutable. Charge/fulfill rechecks resource archival/retraction rules and returns conflict if no longer sellable. A post-payment technical failure stays visible as pending/failed fulfillment, not false success.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Map old valid product resources, preserve historic 180-day purchases as historical snapshots where evidence supports them. Unknown terms/resources require admin reconciliation; never invent a duration or delete payments. Rollback keeps snapshot-driven grants.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-07-T01** — Missing/wrong-kind/deleted resource and VOUCHER entitlement cast cannot sell or silently fulfill.
- **COM-07-T02** — Concurrent pricing edit does not alter existing order charge/duration; grant matches snapshot.
- **COM-07-T03** — Manual verification of valid product yields usable access; both languages show charge, effective dates and duration accurately.
- **COM-07-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-07-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-07-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A18 validates price/resource/duration before selling.
- [ ] Every paid-but-unfulfilled legacy record is visible to reconciliation.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
