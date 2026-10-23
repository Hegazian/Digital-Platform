# ENG-09 — Bound existing media handling and stream ranges correctly

| Field | Value |
|---|---|
| Stable ID | ENG-09 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **In Progress** |
| Implementation owner | Media transport containment; ENH-03 owns processing |
| Dependencies | [SEC-03](../archive/completed/M0/SEC-03.md) |
| Original finding / request | [ENG-09 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S/C |
| Acceptance links | [A29](../AUDIT_TRACEABILITY.md#a29) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. M1 adds private disk-staged 500 MiB uploads, bounded signature/scan/storage streams, accurate PROCESSING feedback and protected range delivery. M1-R01 and M1-R04 regression findings are resolved: premature response close cancels the scanner/source and retains admission until cleanup, while guarded browser fixtures seed known supported READY media without changing normal PROCESSING behavior. Fresh local evidence includes a real-HTTP controlled-scanner admission/disconnect test and scanner source-close test. Complete production and development/Strict Mode browser suites pass 32/32 and include protected playback, cancellation, and document-switch coverage. Finish measured maximum-size resource bounds, real Supabase/ClamAV behavior and actual-device playback. ENG-09 closes transport acceptance; dependent ENH-03 owns managed new-upload probing/processing/READY and complete A29/G1 media acceptance. No production rollout or legacy mass migration is claimed. See [review](../M1_REVIEW.md), [transport evidence](../ENG09_IMPLEMENTATION.md) and [manual checks](../M1_MANUAL_TESTING.md). Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Video uploads buffer up to 500 MB per request in API memory; several parallel uploads can exhaust it. All allowed video types are marked READY immediately and streamed as `video/mp4`; AVI/MKV/etc. are not automatically browser-compatible. No transcoding, adaptive HLS, AES key pipeline, captions, or thumbnail job exists. Range parsing is not validated and streams lack error listeners.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Existing video uploads use bounded private disk staging and streams to storage without retaining a request-sized buffer. Range responses are strict; new uploads remain PROCESSING until ENH-03 verifies codecs and media metadata.

Media transport containment; ENH-03 owns processing owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: stage uploads under a private directory with a 500 MiB file limit, one-file multipart constraints and a two-upload per-process admission cap; validate signatures from a bounded read, scan in chunks, stream to storage and clean staging/failed local writes.
2. Frontend: show truthful upload/processing/failure states in Arabic and English, avoid simulated progress, and permit cancellation/retry.
3. Database: reuse VideoStatus; persist PROCESSING because no codec/duration probe exists yet. ENH-03 alone may mark managed assets READY after verified processing; no schema migration is needed here.
4. Configuration/infrastructure: enforce per-file/concurrent byte limits and request deadlines; preserve storage stream errors and client-disconnect cancellation; implement valid single byte ranges and 416 with Content-Range for unsatisfiable input.
5. Integration: hand off resumable uploads, durable cross-replica quotas, codec probing, transcoding/renditions and READY transitions to ENH-03 while preserving the existing endpoint.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/videos/video.routes.ts](<../../server/src/modules/videos/video.routes.ts>)
- [server/src/modules/videos/video.service.ts](<../../server/src/modules/videos/video.service.ts>)
- [server/src/utils/file-validation.ts](<../../server/src/utils/file-validation.ts>)
- [server/src/utils/storage.ts](<../../server/src/utils/storage.ts>)
- [server/scripts/m0-browser.cjs](<../../server/scripts/m0-browser.cjs>)
- [client/e2e/m0/safety.spec.ts](<../../client/e2e/m0/safety.spec.ts>)
- [client/e2e/m0/review.spec.ts](<../../client/e2e/m0/review.spec.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/videos/upload -> 201 data.status=PROCESSING; playback URL -> 409 until a trusted media processor verifies readiness. Range bytes=-500 -> 206 last 500 bytes; malformed/multiple/out-of-range -> 416 Content-Range: bytes */total.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Access is checked before bytes/header leakage. The intended bound is two active uploads including scanning/storage and cleanup, each at most 500 MiB; it is not a cross-replica quota. M1-R01 was reproduced at the initial review checkpoint and is now covered by a complete-body disconnect regression; production maximum-size memory/disk measurements and cross-replica quota remain unverified. Terminate sources/scanner on premature response close, clean staging and failed local writes, and release admission only when owned work stops. Do not claim a production OOM reproduction or codec verification.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve all originals and legacy IDs. Do not mass-change existing READY records without a read-only media probe inventory and reviewed migration. New unprobed media is PROCESSING. Rollback keeps bounds/range guards and private storage.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-09-T01** — A known supported READY fixture plays/seeks; suffix/open/invalid/out-of-range/multiple ranges have exact 206/416 behavior.
- **ENG-09-T02** — Parallel uploads, disconnect, malformed multipart and storage errors keep API memory bounded and clean staging/partial files.
- **ENG-09-T03** — Unauthorized raw stream denied; Arabic/English upload/processing state and target mobile playback validated.
- **ENG-09-T04** — M1-R01: finish the multipart body, then close the response while a controlled scanner is blocked. Scanner socket/source terminate, staging cleanup succeeds on Windows/Linux and repeated cancellation cannot create more than two live admitted scans.
- **ENG-09-T05** — M1-R04: guarded browser fixtures seed known supported READY video, isolate/restore lesson attachments and retain actual renewal/pause/position/speed assertions in production/development desktop/mobile jobs. Ordinary uploads separately remain PROCESSING and reject early playback with 409.
- **ENG-09-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-09-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-09-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] ENG-09 transport acceptance covers bounded uploads, cancellation/cleanup and protected range playback with known verified READY fixtures. ENH-03 depends on this subgate and owns new-upload processing/READY plus complete A29 media acceptance at G1.
- [ ] No MIME or READY state claims unimplemented codec validation, transcoding, HLS or encryption.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
