# ENG-04 — Validate every request boundary with shared schemas

| Field | Value |
|---|---|
| Stable ID | ENG-04 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Validation adoption; ENH-02 owns shared schemas |
| Dependencies | [ENH-02](ENH-02.md), [ENG-01](../archive/completed/M0/ENG-01.md) |
| Original finding / request | [ENG-04 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A04](../AUDIT_TRACEABILITY.md#a04) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Route inventory identifies **43 POST/PATCH/PUT declarations without `validateBody`**. Some are legitimate bodyless commands or multipart routes, so this is not 43 proven validation bugs. Important unvalidated bodies include live sessions, announcements, product/voucher creation, resource/block attachment, and developer endpoints.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Each route is classified and validates body/query/params/multipart metadata and cross-resource relationships; missing validateBody is not automatically a proven defect.

Validation adoption; ENH-02 owns shared schemas owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: review all 171 route declarations plus inline app routes; classify bodyless/multipart/JSON, assign schema and policy, and repair important unvalidated nested inputs first.
2. Frontend: use shared input/output types and localized field-error mapping; no duplicate divergent manual request shapes.
3. Database: align enum/FK/bounds with schema and use safe Prisma error translation; constraints still defend races.
4. Configuration/infrastructure: add route-contract coverage report; set JSON/multipart limits and safe URL protocols, no unrestricted nested config or arbitrary identity fields.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/utils/schemas.ts](<../../server/src/utils/schemas.ts>)
- [server/src/utils/validate.ts](<../../server/src/utils/validate.ts>)
- [server/src/modules/live/live.routes.ts](<../../server/src/modules/live/live.routes.ts>)
- [server/src/modules/commerce/commerce.routes.ts](<../../server/src/modules/commerce/commerce.routes.ts>)
- [audit/inventory.json](<../../audit/inventory.json>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Validation error -> {"error":{"code":"VALIDATION_ERROR","messageKey":"validation.invalid","requestId":"req_1","fields":[{"path":"blocks.0.assetId","code":"INVALID_RELATION"}]}}; bodyless command rejects unexpected body.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Original 43 write declarations require verification, not 43 blanket bug claims. Authenticate/authorize appropriate upload sessions before expensive body processing. Strict unknown fields, string/array bounds, date ordering and ownership are explicit per route.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory current clients and publish compatibility notes for rejected formerly ignored fields. No schema sync may erase data; legacy JSON migration reports invalid stored rows before reads break.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-04-T01** — Route inventory has a validation disposition for every declaration including bodyless/multipart.
- **ENG-04-T02** — Malformed IDs/enums/nested arrays/URL schemes/oversize/unknown identity field return safe 4xx, not Prisma 500.
- **ENG-04-T03** — Arabic/English client errors map stable paths; fuzz and cross-account relationship tests do not perform writes.
- **ENG-04-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-04-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-04-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] No unclassified request boundary remains.
- [ ] Contract and HTTP validation tests cover high-risk routes.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
