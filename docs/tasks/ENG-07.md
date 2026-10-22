# ENG-07 — Persist actual audit actors and durable outbox events

| Field | Value |
|---|---|
| Stable ID | ENG-07 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Durable audit/outbox owner |
| Dependencies | [ENG-05](ENG-05.md) |
| Original finding / request | [ENG-07 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A38](../AUDIT_TRACEABILITY.md#a38) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Audit fallback is process memory. Course review logs actor ID `'ADMIN'`, which is not a real user FK, so reviews can fall into this fallback and disappear on restart. Other successful DB reads do not merge those fallback logs. Developer token/webhook creation also reports memory-only success after DB errors.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Important mutations and their actual actor/audit/outbox records commit together; memory fallback never reports durable success.

Durable audit/outbox owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: use transaction-aware audit service with actorId from current identity; remove literal ADMIN actor and memory-success branches; add transactional outbox dispatcher.
2. Frontend: audit/review UI shows persisted state and retryable failure accurately, not a fabricated saved token/webhook.
3. Database: AuditLog FK to real actor plus safe system actor convention; OutboxEvent(id,kind,aggregateId,payloadVersion,status,attempts,availableAt) with unique event key.
4. Configuration/infrastructure: Postgres outbox is source of truth, Redis/BullMQ transport may replay; worker idempotent, bounded exponential retry, dead-letter and admin recovery queue; redact secrets/student text.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/audit/audit.service.ts](<../../server/src/modules/audit/audit.service.ts>)
- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)
- [server/src/modules/developer/api-token.controller.ts](<../../server/src/modules/developer/api-token.controller.ts>)
- [server/src/utils/eventBus.ts](<../../server/src/utils/eventBus.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Transaction: update revision + insert AuditLog(actorId=currentUser.id) + insert OutboxEvent(kind="CONTENT_PUBLISHED",key="revision:r_1:published"); DB failure -> 503, zero fake success.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Only admin/auditor can read scoped logs. Event payload contains IDs/version, not raw keys/tokens/answers. At-least-once delivery requires consumer dedupe; no claim of exactly-once network delivery.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve existing durable logs; label missing/fallback-era evidence unknown, never reconstruct fictitious actors. Export any recoverable process-memory record before restart only with provenance. Rollback keeps durable writes, queues pause safely.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-07-T01** — Review stores actual admin FK and survives API/worker restart.
- **ENG-07-T02** — DB write failure reports failure with no memory-only successful token/review; audit mutation transaction is atomic.
- **ENG-07-T03** — Outbox retry/crash yields one consumer effect; Arabic/English audit filters and cross-account denials pass.
- **ENG-07-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-07-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-07-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A38 durable audit/outbox recovery demonstrated.
- [ ] No persistent-operation service returns success from process memory.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
