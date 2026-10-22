# LRN-14 — Use validated teacher-provided live meeting links

| Field | Value |
|---|---|
| Stable ID | LRN-14 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [SEC-09](SEC-09.md), [ENH-02](ENH-02.md), [COM-01](COM-01.md) |
| Original finding / request | [LRN-14 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S/G |
| Acceptance links | [A07](../AUDIT_TRACEABILITY.md#a07), [A31](../AUDIT_TRACEABILITY.md#a31) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[live.service.ts:25](<../../server/src/modules/live/live.service.ts>) invents Zoom meeting IDs/URLs rather than creating meetings. The UI's entered URL is ignored. StudentDashboard expects `summary.courses[].subjectId`, which the summary does not return, so it never fetches live sessions.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Teachers supply actual existing HTTPS meeting links; platform stores/schedules/presents them without fabricating or provisioning meetings.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: persist validated join URL, optional separately protected host URL, start/end/timezone and course/subject associations; implement edit/cancel/list under ownership.
2. Frontend: honor entered URL, show scheduled/cancelled state, return subjectId in course summary and fetch across all eligible subjects.
3. Database: retain live-session actor/owner/revision, exact UTC times and cancellation history; meeting provider generation is excluded.
4. Configuration/infrastructure: validate allowed HTTPS meeting hosts/admin-configured allowlist without server-side fetching; audit link changes and send schedule notices through durable events.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/live/live.service.ts](<../../server/src/modules/live/live.service.ts>)
- [server/src/modules/live/live.controller.ts](<../../server/src/modules/live/live.controller.ts>)
- [client/src/components/teacher/LiveSessionManager.tsx](<../../client/src/components/teacher/LiveSessionManager.tsx>)
- [client/src/components/StudentDashboard.tsx](<../../client/src/components/StudentDashboard.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/live-sessions {"courseId":"c_1","joinUrl":"https://approved.example/meeting/123","startsAt":"2026-11-01T14:00:00Z","endsAt":"2026-11-01T15:00:00Z","timeZone":"Africa/Cairo"}; student DTO omits hostUrl.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Approved owner/assigned teacher or admin schedules; only entitled audience receives join link in permitted time window (15 minutes before start through end by default). Host secret never appears in catalog/student payload. Cancellation is idempotent and overrides upcoming joins.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Flag synthetic existing meeting links as needing teacher replacement; do not invent working URLs. Preserve old schedule/attendance history. Rollback can disable joins for unverified sessions but retains valid uploaded links.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-14-T01** — Entered real fixture URL is preserved; invalid scheme/host/credentials and forged owner fail.
- **LRN-14-T02** — Student sees sessions across all entitled subjects and cannot obtain host URL or unrelated joins.
- **LRN-14-T03** — Edit/cancel/concurrent join boundary, Cairo date display and Arabic/English dashboard browser journeys pass.
- **LRN-14-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-14-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-14-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A31 validates uploaded existing links, not provider auto-creation.
- [ ] No random Zoom identifier is represented as a real meeting.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
