# LRN-12 — Persist bounded watch progress and reliable completion

| Field | Value |
|---|---|
| Stable ID | LRN-12 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [LRN-07](LRN-07.md), [COM-01](COM-01.md) |
| Original finding / request | [LRN-12 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S/G |
| Acceptance links | [A28](../AUDIT_TRACEABILITY.md#a28) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. M0 now guards stale course/enrollment responses and preserves playback state across failed grant renewal/retry. These partial compatibility repairs do not complete bounded persisted watch progress, cross-device resume or mastery/completion semantics. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

The video player sends completion but never sends watch-time updates; there is no persisted resume position. Completion failures are swallowed after optimistic local success, without the claimed retry. Switching lessons/courses while async requests resolve can set stale player state.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Watch position, bounded watched intervals and completion survive reload/device change, while failures remain visibly unsynced.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: accept actor/session-sequenced heartbeats, validate duration/position/time deltas and merge watched intervals without double count; derive completion from declared block policy.
2. Frontend: send debounced play/pause/seek/visibility heartbeats, resume trusted position, queue bounded retry and show pending/error; abort/ignore stale lesson requests.
3. Database: add per-video/revision resume position and dedupe session/sequence; preserve stable LessonProgress and historical completion.
4. Configuration/infrastructure: cap heartbeat frequency and offline queue retention; expose sync lag/error without treating playback alone as mastery.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/VideoPlayerSection.tsx](<../../client/src/components/VideoPlayerSection.tsx>)
- [server/src/modules/progress/progress.service.ts](<../../server/src/modules/progress/progress.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/progress/heartbeats {"lessonId":"l_1","blockId":"b_video","sessionId":"ps_1","seq":12,"positionMs":45000,"playedDeltaMs":5000} -> {"data":{"acceptedSeq":12,"resumeMs":45000,"syncStatus":"SYNCED"}}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Student owns progress and must currently access the lesson. Do not trust arbitrary completion=true or delta greater than elapsed playback tolerance. Replayed/out-of-order sequences cannot inflate watched time; parallel devices merge monotonic completion but latest accepted position by timestamp policy.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Keep existing completed lessons completed unless an explicit curriculum change policy says otherwise; add new progress fields without resetting students. Unknown historic watch time remains unknown, never invented from completion.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-12-T01** — Refresh/device switch resumes correctly; replay/seek/pause/background/duplicate heartbeat cannot inflate time.
- **LRN-12-T02** — Network error leaves pending UI then retries same sequence; another student cannot update/read progress.
- **LRN-12-T03** — Slow course switch response cannot set stale state; Arabic/English mobile playback and completion retry work.
- **LRN-12-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-12-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-12-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A28 asserts persisted position, bounded time and honest sync state.
- [ ] Progress totals use canonical unique lesson IDs.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
