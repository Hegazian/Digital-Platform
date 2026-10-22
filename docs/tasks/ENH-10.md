# ENH-10 — Deliver durable notifications and communication preferences

| Field | Value |
|---|---|
| Stable ID | ENH-10 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Durable notification delivery owner |
| Dependencies | [ENG-07](ENG-07.md), [COM-01](COM-01.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A11](../AUDIT_TRACEABILITY.md#a11), [A30](../AUDIT_TRACEABILITY.md#a30), [A38](../AUDIT_TRACEABILITY.md#a38) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

In-app/email notifications survive restarts with scoped recipient dedupe, retry visibility and communication preferences.

Durable notification delivery owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: notification consumer for announcement/grade/review/payment/security events; distinguish mandatory security/transactional from optional study/marketing messages.
2. Frontend: paginated inbox, unread count/read-owned action, per-channel preferences and localized templates/status.
3. Database: Notification unique(eventId,recipientId,channel), DeliveryAttempt and CommunicationPreference; outbox links and retry scheduling.
4. Configuration/infrastructure: Postgres outbox plus Redis/BullMQ delivery transport, provider timeouts, max attempts/dead-letter/replay and operator queue; no memory fallback success.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/notifications/notification.service.ts](<../../server/src/modules/notifications/notification.service.ts>)
- [server/src/utils/email.ts](<../../server/src/utils/email.ts>)
- [client/src/components/StudentDashboard.tsx](<../../client/src/components/StudentDashboard.tsx>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
PATCH /api/v1/me/communication-preferences {"studyEmail":false,"announcementEmail":true}; read action POST /notifications/n_1/read; enqueue returns QUEUED, not delivered.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Recipients resolved from effective policy and deduped. Recheck permission for sensitive deep links; notification body contains minimal data and no answer keys/live host links. Channel preference cannot disable essential account-security notification policy.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve existing notifications/read flags and derive stable legacy dedupe IDs. Do not resend old announcements automatically. Rollback pauses delivery queue, retains attempts/events for safe resume.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-10-T01** — Worker crash/provider timeout/duplicate event delivers at most one logical inbox item and records retries.
- **ENH-10-T02** — Student B cannot mark/read A message; opted-out optional email not sent; transactional policy explicit.
- **ENH-10-T03** — Arabic/English templates/links/inbox and concurrent read/unread requests preserve state.
- **ENH-10-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-10-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-10-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Durable queue/outbox restart and dead-letter recovery demonstrated.
- [ ] A30 notification recipient/delivery evidence replaces best-effort sends.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
