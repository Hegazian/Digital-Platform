# LRN-06 — Render every supported ordered lesson block

| Field | Value |
|---|---|
| Stable ID | LRN-06 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Player block registry |
| Dependencies | [LRN-05](LRN-05.md), [SEC-04](SEC-04.md), [ENH-03](ENH-03.md) |
| Original finding / request | [LRN-06 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A20](../AUDIT_TRACEABILITY.md#a20) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

[VideoPlayerSection](<../../client/src/components/VideoPlayerSection.tsx>) copies resource/block data but has no renderer for lesson `content`, TEXT/LINK/DOCUMENT/LIVE_SESSION blocks, or their required ordering. Teachers can author content that students cannot consume.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

The player presents published human-authored lesson text and supported typed blocks in the authored order, with explicit required-block completion.

Player block registry owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: deliver versioned discriminated block DTOs; sanitize rich text/links and resolve asset grants through policy; reject unknown enabled block types at publication.
2. Frontend: registry renders VIDEO/TEXT/DOCUMENT/LINK/ASSESSMENT/ASSIGNMENT/LIVE_SESSION; preserve authored order, math/direction and fallback locale labels.
3. Database: store stable block IDs, schemaVersion, position and required/completionPolicy in revision snapshots; convert legacy lesson content into a text block once.
4. Configuration/infrastructure: whiteboard/code/offline remain disabled placeholders until owning gates pass; lazy-load heavy renderers and capture safe rendering error reports.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/VideoPlayerSection.tsx](<../../client/src/components/VideoPlayerSection.tsx>)
- [client/src/components/player/CurriculumSidebar.tsx](<../../client/src/components/player/CurriculumSidebar.tsx>)
- [client/src/components/player/PDFDocumentViewer.tsx](<../../client/src/components/player/PDFDocumentViewer.tsx>)
- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Block={"id":"b_1","type":"TEXT","schemaVersion":1,"position":0,"required":true,"content":{"ar":{"format":"sanitized-html","value":"<p>...</p>"}}}; DOCUMENT uses assetId, never arbitrary storage URL.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Only protected LearningDTO supplies content. Link URLs permit https only and no embedded credentials; sanitize hostile HTML. Completion is server-owned per policy and must not equate opening every block with mastery. Unknown stored blocks show recoverable unsupported state, not a crash.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Deduplicate old lesson.content and equivalent text blocks with a mapping record; keep old body backup and stable lesson/progress IDs. Preserve ordering and preview bits. Rollback uses published snapshot, never drops invisible content.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-06-T01** — Author/edit/review/publish/play each supported type and mixed order; no copied-but-unrendered text remains.
- **LRN-06-T02** — Malformed/hostile block/URL, unauthorized asset and disabled advanced block cannot execute or bypass access.
- **LRN-06-T03** — Arabic/English mixed text/equations, keyboard, mobile PDF/link/live and error retry tested.
- **LRN-06-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-06-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-06-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A20 is editor-to-student E2E for every launch-supported block.
- [ ] Required-block completion semantics and unsupported states are explicit.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
