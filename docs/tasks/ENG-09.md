# ENG-09 — Bound existing media handling and stream ranges correctly

| Field | Value |
|---|---|
| Stable ID | ENG-09 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **In Progress** |
| Implementation owner | Media transport containment; ENH-03 owns processing |
| Dependencies | [SEC-03](SEC-03.md) |
| Original finding / request | [ENG-09 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S/C |
| Acceptance links | [A29](../AUDIT_TRACEABILITY.md#a29) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. M1 implementation has started. The local protected stream now parses a single byte range strictly, supports suffix/open-ended ranges, clamps valid ends, returns 416 with Content-Range for malformed/multiple/unsatisfiable ranges, and stops file reads on client disconnect. The authenticated playback integration test covers these cases. Memory-bounded upload handling, processing status/MIME correctness, upload concurrency and full target-device playback remain open; ENH-03 owns the eventual managed-media pipeline. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Video uploads buffer up to 500 MB per request in API memory; several parallel uploads can exhaust it. All allowed video types are marked READY immediately and streamed as `video/mp4`; AVI/MKV/etc. are not automatically browser-compatible. No transcoding, adaptive HLS, AES key pipeline, captions, or thumbnail job exists. Range parsing is not validated and streams lack error listeners.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Immediate media paths avoid unbounded API-memory buffering, mark unprocessed formats honestly and return correct range/MIME/error behavior; ENH-03 owns the final pipeline.

Media transport containment; ENH-03 owns processing owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: stream legacy uploads to bounded protected temporary storage; validate media metadata before playable status; do not mark AVI/MKV READY as mp4.
2. Frontend: show upload/processing/error states instead of playable immediately; allow retry/cancel.
3. Database: migrate Video status to explicit pending/failed/ready mapping linked later to managed asset.
4. Configuration/infrastructure: set per-file/concurrent byte limits, request deadlines, cleanup and stream error/disconnect listeners; implement valid single byte ranges and 416 with Content-Range for unsatisfiable input.
5. Integration: hand off new resumable uploads, transcoding/renditions/quota ownership to ENH-03, preserving legacy video endpoints through protected adapters.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/videos/video.routes.ts](<../../server/src/modules/videos/video.routes.ts>)
- [server/src/modules/videos/video.service.ts](<../../server/src/modules/videos/video.service.ts>)
- [server/src/utils/storage.ts](<../../server/src/utils/storage.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Range: bytes=-500 -> 206 last 500 bytes; bytes=total- or malformed/multiple unsupported ranges -> 416 Content-Range: bytes */total; MIME derives from verified rendition.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Access checked before bytes/header leakage. Bound memory and temp-disk usage, terminate on disconnect and remove partials. Conditional resource-exhaustion risk needs measured parallel-upload proof; do not claim production OOM reproduced.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve original uploaded video files; probe existing READY media and downgrade incompatible files to PROCESSING/NEEDS_REUPLOAD, without deletion. Rollback keeps bounds/range guards and private storage.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-09-T01** — Real supported video plays/seeks; suffix/open/invalid/out-of-range/multiple ranges have exact 206/416 behavior.
- **ENG-09-T02** — Parallel uploads/disconnect/malformed multipart/storage error keep API memory within declared budget and clean partials.
- **ENG-09-T03** — Unauthorized raw stream denied; Arabic/English processing state and target mobile playback validated.
- **ENG-09-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-09-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-09-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A29 includes actual supported media and range assertions.
- [ ] Immediate fixes do not claim unimplemented HLS/encryption/transcoding capabilities.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
