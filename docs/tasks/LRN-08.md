# LRN-08 — Contain incomplete boards and preserve block identity

| Field | Value |
|---|---|
| Stable ID | LRN-08 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Board containment; ENH-14 owns enablement |
| Dependencies | [LRN-06](LRN-06.md), [ENG-03](../archive/completed/M0/ENG-03.md) |
| Original finding / request | [LRN-08 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A20](../AUDIT_TRACEABILITY.md#a20) |
| Release disposition | Required launch containment; future enablement has a separate owning task. |



## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

The whiteboard is rendered without its block ID, defaults to `demo-board-1`, and receives 404 from the corrected backend. It loads once and saves manually, with no realtime synchronization. Students are shown save controls even though backend writes are owner/admin-only.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Existing board references use real block IDs and honest read/write capability; launch collaboration remains unavailable until ENH-14.

Board containment; ENH-14 owns enablement owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: validate board belongs to requested published block/course; enforce feature disabled at read/write collaboration boundary before enabling any session.
2. Frontend: eliminate demo-board-1 fallback, pass actual block/revision ID and show staged-feature message; do not show student save controls as functional.
3. Database: map existing Board to owning lesson block and preserve saved drawings; ambiguous demo references quarantined for admin review.
4. Configuration/infrastructure: add independent board capability flag off in production; no realtime claim or websocket server exposed.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/editor/CollaborativeBoardBlock.tsx](<../../client/src/components/editor/CollaborativeBoardBlock.tsx>)
- [client/src/components/VideoPlayerSection.tsx](<../../client/src/components/VideoPlayerSection.tsx>)
- [server/src/modules/courses/board.controller.ts](<../../server/src/modules/courses/board.controller.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
BoardBlock={"id":"b_4","type":"WHITEBOARD","capability":"DISABLED"}; POST /api/v1/boards/b_4/session -> 503 FEATURE_DISABLED until ENH-14 approval.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

No UI fallback may point different courses to a shared board. Owner-only static board data remains protected if an admin recovery viewer is retained; collaboration authorization/protocol is owned by ENH-14.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Export/backup genuine drawings before remapping. Never merge records by demo ID or discard unrelated work. Rollback keeps server disabled and real identity mapping.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-08-T01** — Published player never sends demo-board-1 or writes an arbitrary owner board.
- **LRN-08-T02** — Direct board/session/save calls remain disabled for all roles at launch; existing data unchanged.
- **LRN-08-T03** — Arabic/English disabled state is keyboard/touch accessible and contains no misleading save/collaboration controls.
- **LRN-08-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-08-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-08-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] F14-style board fixture uses real identity and correct staged state.
- [ ] Future realtime implementation has one owner, ENH-14.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
