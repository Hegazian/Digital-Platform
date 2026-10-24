# COM-08 — Make voucher redemption unique per student

| Field | Value |
|---|---|
| Stable ID | COM-08 |
| Priority | P1 |
| Release milestone | M3 — Paid release and operations |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [COM-06](COM-06.md), [COM-07](COM-07.md) |
| Original finding / request | [COM-08 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / C |
| Acceptance links | [A17](../AUDIT_TRACEABILITY.md#a17) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **24 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Voucher max-use increments are protected, but same-student deduplication occurs before acquiring the voucher row lock and there is no redemption uniqueness record. Concurrent requests from one student can consume multiple uses and create duplicate grants when `maxUses > 1`.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

A student redeems a voucher at most once; global caps and all access effects commit atomically.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: lock or conditionally claim voucher capacity and insert unique voucher/student redemption in one transaction; grant through the commerce fulfillment primitive.
2. Frontend: preserve redeem intent/key and show already-redeemed as the same result without consuming another use.
3. Database: add VoucherRedemption with unique(voucherId,userId), sourceGrantId and immutable grant snapshot; keep global usage cap check in the same transaction.
4. Configuration/infrastructure: normalize codes, hash or redact them in logs, rate-limit guesses; retry serialization failures with bounded jitter.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/commerce/commerce.service.ts](<../../server/src/modules/commerce/commerce.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/VoucherRedeemModal.tsx](<../../client/src/components/VoucherRedeemModal.tsx>)
- [client/src/components/admin/VoucherManager.tsx](<../../client/src/components/admin/VoucherManager.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/commerce/vouchers/redeem {"code":"<opaque>"} -> {"data":{"redemptionId":"vr_1","grantId":"g_1","alreadyRedeemed":false}}; repeat returns vr_1/true.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Conditional finding: existing global-cap tests do not establish same-student correctness. Check eligibility, startsAt/endsAt, remaining uses and resource under lock. Failed grant rolls back usage and redemption.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Backfill known unique redemptions from reliable grant evidence; flag ambiguous duplicate historic grants for review without deleting access. Enforce unique index only after reconciliation. Rollback retains uniqueness.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-08-T01** — One student sends 20 parallel calls to maxUses>1: one use, one redemption and one intended grant.
- **COM-08-T02** — Many students cannot exceed global cap; expired/future/invalid voucher denies; transaction failure consumes no use.
- **COM-08-T03** — Cross-account history hidden, Arabic/English result accessible, replay after timeout returns same redemption.
- **COM-08-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-08-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-08-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A17 includes same-user and global concurrency with database assertions.
- [ ] No voucher code or full redemption history leaks through logs.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
