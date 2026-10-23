# COM-02 — Allow renewal after effective subscription expiry

| Field | Value |
|---|---|
| Stable ID | COM-02 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [COM-03](COM-03.md), [COM-09](COM-09.md) |
| Original finding / request | [COM-02 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A12](../AUDIT_TRACEABILITY.md#a12) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[subscription.service.ts:46](<../../server/src/modules/subscriptions/subscription.service.ts>) rejects another subscription when an existing row has ACTIVE status, regardless of its expired `endDate`. No expiry worker was found.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Renewal uses effective dates, even when a historic row still says ACTIVE; reconciliation cannot be required for a student to renew.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: compute active interval from status plus dates; support explicit renewal starting at max(now, active end) according to the purchased product.
2. Frontend: display current expiry and proposed renewal interval before payment; show pending review separately from active access.
3. Database: retain each original subscription and add renewal linkage/order snapshot; prevent duplicate open renewal for one scoped idempotency key.
4. Configuration/infrastructure: schedule idempotent expiry reconciliation for status/reporting and alert failures; access remains date-authoritative if worker stops.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/subscriptions/subscription.service.ts](<../../server/src/modules/subscriptions/subscription.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/commerce/CheckoutModal.tsx](<../../client/src/components/commerce/CheckoutModal.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/subscriptions/renew {"subscriptionId":"s_1","productId":"p_month"} -> {"data":{"orderId":"o_2","startsAt":"...","endsAt":"...","status":"PENDING_PAYMENT"}}; expired ACTIVE row is not a conflict.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Only owner student/admin reconciliation can renew; manual approval grants once under COM-06. No early access from future renewal dates; no worker job may extend a paid term without a purchase.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Backfill effective status without deleting or rewriting paid historical intervals. Keep renewal links and old IDs. On job failure replay by subscription/version, with counts of rows changed; rollback disables worker but retains date checks.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-02-T01** — Expired ACTIVE row can renew and receives advertised term after approval.
- **COM-02-T02** — Future/overlapping renewal and duplicate approve do not create gaps or double extensions.
- **COM-02-T03** — Worker stopped/restarted and simultaneous renewals preserve final dates; Arabic/English expiry text matches server.
- **COM-02-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-02-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-02-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Renewal is independent of stale stored ACTIVE state.
- [ ] Reconciliation is repeatable and auditable.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
