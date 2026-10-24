# COM-05 — Scope checkout idempotency by actor and payload

| Field | Value |
|---|---|
| Stable ID | COM-05 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [ENG-05](ENG-05.md) |
| Original finding / request | [COM-05 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / R:F09 |
| Acceptance links | [A16](../AUDIT_TRACEABILITY.md#a16) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **24 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[createOrder](<../../server/src/modules/commerce/commerce.service.ts>) returns any order with the caller's idempotency key, without checking owner or original request fields. Knowledge/reuse of a key returns another student's order/reference. Concurrent first requests also have a find-then-create conflict.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

A retry returns the original caller’s identical order; no key can reveal another account’s order or silently change the purchase.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: canonicalize product/quantity/method snapshot hash and atomically reserve (userId, operation, key); catch unique conflict by reading the same actor scope.
2. Frontend: hold one opaque key for one checkout intent and persist it until terminal/cancelled; new payload starts a new intent.
3. Database: add composite unique scope and payloadHash; migrate legacy key entries without making cross-user keys readable.
4. Configuration/infrastructure: cap key length, retention and rate; retain idempotency records at least as long as retryable checkout intents.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/commerce/commerce.service.ts](<../../server/src/modules/commerce/commerce.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/commerce/CheckoutModal.tsx](<../../client/src/components/commerce/CheckoutModal.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/commerce/orders with Idempotency-Key: opaque_1 and {"productId":"p_1","method":"MANUAL_TRANSFER"}; same actor/key different payload -> 409 IDEMPOTENCY_CONFLICT.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Never return an existing global-key row before owner check. Parallel creates yield one order per scoped intent; identity and product snapshot are immutable. Do not retry permanent payload conflict under a new key automatically.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Backfill actor scope from Order.userId, preserve references and financial history. Quarantine impossible ownerless entries. Rollback keeps composite scope and never reverts to global lookup.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-05-T01** — F09 student B reusing A key cannot see A order/reference.
- **COM-05-T02** — 20 simultaneous first creates produce one order and stable response; changed product/method causes conflict.
- **COM-05-T03** — Refresh/reopen checkout in both languages retains the intent until explicit restart; DB timeout retries same key.
- **COM-05-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-05-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-05-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Cross-account disclosure and concurrent duplicate creation are prevented.
- [ ] Client and API use the same payload identity definition.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
