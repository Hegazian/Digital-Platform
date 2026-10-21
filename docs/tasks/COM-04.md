# COM-04 — Disable simulated gateways and implement official adapters later

| Field | Value |
|---|---|
| Stable ID | COM-04 |
| Priority | P1 |
| Release milestone | M3 — Paid release and operations |
| Status | **Planned** |
| Implementation owner | Commerce provider adapters; staged subdeliverables |
| Dependencies | [ENG-03](ENG-03.md), [COM-06](COM-06.md), [COM-07](COM-07.md) |
| Original finding / request | [COM-04 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S/G |
| Acceptance links | [A14](../AUDIT_TRACEABILITY.md#a14), [A15](../AUDIT_TRACEABILITY.md#a15) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

Payment callbacks are custom simulations of gateway contracts. Paymob expects a nested transaction payload and its documented HMAC field sequence; this code signs sorted arbitrary key/value pairs and accepts header signatures only. Fawry uses custom field names, status handling, and a custom signature scheme, explicitly acknowledged in [webhook-security.ts](<../../server/src/utils/webhook-security.ts>). No real gateway checkout creation was found.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Launch exposes only manual/voucher/free paths. Paymob then Fawry are independent post-launch adapter deliverables using selected official merchant contracts.

Commerce provider adapters; staged subdeliverables owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend launch containment: reject automated checkout/callback paths with FEATURE_DISABLED; do not accept custom simulations as payment proof.
2. Frontend launch: remove automated provider choices and gateway success claims; keep verified manual instructions.
3. Database: retain historic provider references flagged for reconciliation; do not treat previously simulated events as newly verified settlement.
4. Configuration/infrastructure launch: provider credentials optional while disabled; no provider request in launch CI.
5. Post-launch Paymob: select merchant API/version, implement real checkout + official nested callbacks/HMAC field sequence, verify amount/EGP/merchant/order/terminal status and provider transaction uniqueness.
6. Post-launch Fawry: independently select notification version and reference lifecycle; verify official signature/status transitions and expiry; use official sandbox fixtures, not the existing custom signer.
7. Enable each provider independently only after sandbox settlement, reconciliation/refund, duplicate/out-of-order and outage tests; reviewed secret rotation and staged rollout required.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/utils/webhook-security.ts](<../../server/src/utils/webhook-security.ts>)
- [server/src/modules/commerce/commerce.routes.ts](<../../server/src/modules/commerce/commerce.routes.ts>)
- [server/src/modules/commerce/commerce.service.ts](<../../server/src/modules/commerce/commerce.service.ts>)
- [client/src/components/commerce/CheckoutModal.tsx](<../../client/src/components/commerce/CheckoutModal.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Launch POST /api/v1/commerce/checkout/paymob -> 503 FEATURE_DISABLED; future ProviderAdapter.createCheckout(orderSnapshot) -> {providerReference,redirectUrl,expiresAt}; adapters emit verified PaymentEvent, never direct grants.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Launch containment is required in M3; automated provider enablement remains M4 and cannot inherit completion from containment. COM-06 owns payment state machine. Raw provider callbacks are authenticated by the selected official contract, not app sessions; durable inbox deduplicates before effects.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve all historical orders/events. Reconcile uncertain simulated records manually before paid release; do not auto-charge or revoke legitimate access from inference. Rollback provider flag off, retain pending checkout events for reconciliation, and never lose a payment record.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-04-T01** — Launch direct calls to both checkout/callback APIs are disabled for all roles and cause no grant or provider network request.
- **COM-04-T02** — M4 official unmodified sandbox fixtures settle once; tampered merchant/currency/amount/order/status/signature fail closed.
- **COM-04-T03** — M4 duplicate/reordered callbacks, provider outage, manual retry and rollback produce one ledger result with accurate Arabic/English client state.
- **COM-04-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-04-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-04-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Launch paid release passes without gateway credentials and advertises manual payments only.
- [ ] Paymob enablement and Fawry enablement each have separate M4 evidence before the corresponding API flag is enabled.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
