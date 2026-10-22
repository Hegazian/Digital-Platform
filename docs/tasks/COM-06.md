# COM-06 — Make payment transitions auditable and fulfillment recoverable

| Field | Value |
|---|---|
| Stable ID | COM-06 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Commerce state machine and financial ledger owner |
| Dependencies | [COM-05](COM-05.md), [ENG-05](ENG-05.md), [ENG-07](ENG-07.md), [ENH-02](ENH-02.md) |
| Original finding / request | [COM-06 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S/G |
| Acceptance links | [A15](../AUDIT_TRACEABILITY.md#a15), [A18](../AUDIT_TRACEABILITY.md#a18) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. The M0 integration validates optional checkout expectedCourseId against voucher scope before consuming the code, and the checkout UI confirms actual course access before success. Wrong-course attempts retain usage and grants unchanged. COM-08 retains ownership of durable per-student voucher idempotency and global capacity races; COM-06 owns payment transitions, fulfillment and reconciliation. The context guard alone does not complete either task. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[fulfillOrder](<../../server/src/modules/commerce/commerce.service.ts>) permits any status except PAID to become PAID, including REFUNDED/CANCELLED. No refund/revocation workflow is implemented; gateway callbacks are not constrained to the order's payment method and transaction references are not unique.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Verified manual decisions and later provider events follow one state machine with an immutable ledger, exact-once access effects and reversible grants on refund.

Commerce state machine and financial ledger owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: separate order payment state from fulfillment state; validate legal transitions and expected version; do not allow REFUNDED/CANCELLED to return to PAID.
2. Frontend: admin queue displays receipt/reference, amount/EGP, immutable product snapshot and conflicting decision state; provide reconciliation/retry and reasoned refund controls.
3. Database: add PaymentEvent/inbox uniqueness, Fulfillment record and grant sourceOrderId; transactionally record PAID and READY_TO_FULFILL/outbox, then idempotently apply access.
4. Configuration/infrastructure: durable reconciliation worker retries stuck fulfillment; alerts on paid-but-unfulfilled, duplicate external transaction use and mismatch; every admin actor audited.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/commerce/commerce.service.ts](<../../server/src/modules/commerce/commerce.service.ts>)
- [server/src/modules/commerce/commerce.controller.ts](<../../server/src/modules/commerce/commerce.controller.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/admin/OfflinePaymentQueue.tsx](<../../client/src/components/admin/OfflinePaymentQueue.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Payment: PENDING_PAYMENT -> UNDER_REVIEW -> PAID | REJECTED | EXPIRED | CANCELLED; PAID -> REFUND_PENDING -> REFUNDED. Fulfillment: NONE -> PENDING -> FULFILLED | FAILED_RETRYABLE. POST /admin/orders/o_1/verify {"expectedVersion":3,"decision":"APPROVE","receiptAssetId":"a_1"}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Only privileged verified reconciliation may record a paid event; matching payment method/currency/amount required. Composite (provider,merchant,transactionId) unique; manual decision uses durable unique event ID. Refund revokes only grants from that order; other valid sources remain.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Import existing order status and original amounts/dates as legacy events with provenance, not invented provider verification. Preserve refunded/cancelled terminal history. Recover failed grants through the same idempotent fulfillment worker; financial rollback is compensating ledger event, never row deletion.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-06-T01** — Parallel approvals/callback retries create one paid event and one grant; approve/reject race returns one conflict.
- **COM-06-T02** — Cancelled/refunded order rejects stale paid event; same provider transaction cannot pay another order.
- **COM-06-T03** — Worker crash after paid commit resumes fulfillment; refund retains history and removes only source grant; Arabic/English states match.
- **COM-06-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-06-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-06-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] No durable payment is lost or reported fulfilled without usable access.
- [ ] Ledger, manual verification and refund/reconciliation drills pass.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
