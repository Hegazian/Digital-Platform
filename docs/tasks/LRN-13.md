# LRN-13 — Send validated announcements to owned-course audiences

| Field | Value |
|---|---|
| Stable ID | LRN-13 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [SEC-09](../archive/completed/M0/SEC-09.md), [COM-10](COM-10.md), [ENH-10](ENH-10.md) |
| Original finding / request | [LRN-13 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A07](../AUDIT_TRACEABILITY.md#a07), [A30](../AUDIT_TRACEABILITY.md#a30) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[AnnouncementManager:27](<../../client/src/components/teacher/AnnouncementManager.tsx>) submits no `courseId`, which the backend requires. Ordinary UI broadcasts cannot resolve the course and an undefined unique ID can fail Prisma validation before any notification is sent.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Teacher chooses an owned/assigned course, previews the deduplicated audience and submits one durable announcement.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: strict courseId/title/body schemas and ownership before query; use audience projection plus durable notification event, not direct best-effort fanout.
2. Frontend: add required owned-course selector, localized field errors and recipient count/as-of preview; persist send key until result known.
3. Database: Announcement retains actor/owner/course/revision and audience snapshot event; notification uniqueness prevents duplicate delivery.
4. Configuration/infrastructure: report queued/delivered/failed counts and allow bounded replay through ENH-10 worker.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/teacher/AnnouncementManager.tsx](<../../client/src/components/teacher/AnnouncementManager.tsx>)
- [server/src/modules/teacher/teacher.controller.ts](<../../server/src/modules/teacher/teacher.controller.ts>)
- [server/src/modules/teacher/teacher.service.ts](<../../server/src/modules/teacher/teacher.service.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/teacher/announcements with Idempotency-Key:ann_1 {"courseId":"c_1","title":{"ar":"تنبيه"},"body":{"ar":"..."}} -> 202 {"data":{"announcementId":"an_1","status":"QUEUED","eligibleRecipients":42}}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Missing courseId is 422 before Prisma, foreign course 404, forged teacherId rejected. Audience effective at enqueue; recheck active membership before sensitive delivery if revoked meanwhile. Never report all delivered at enqueue.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve existing announcement records and notification read state. Do not replay ambiguous old sends automatically; import known recipients with dedupe keys if operator requests recovery.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-13-T01** — Ordinary teacher UI includes courseId and queues a valid announcement; missing/foreign course has zero sends.
- **LRN-13-T02** — All grant sources counted once; duplicate submit/worker restart does not duplicate messages.
- **LRN-13-T03** — Arabic/English course selector, queued status and partial failure/retry are accessible in browser.
- **LRN-13-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-13-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-13-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A30 checks real recipient IDs and durable delivery status.
- [ ] No undefined unique lookup or false immediate-delivery claim remains.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
