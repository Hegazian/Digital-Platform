# ENH-03 — Build private managed media with resumable uploads and processing

| Field | Value |
|---|---|
| Stable ID | ENH-03 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Assets, uploads and processing owner |
| Dependencies | [SEC-02](SEC-02.md), [SEC-03](SEC-03.md), [ENG-05](ENG-05.md), [ENG-06](ENG-06.md), [ENG-07](ENG-07.md), [ENH-02](ENH-02.md), [ENG-09](ENG-09.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A02](../AUDIT_TRACEABILITY.md#a02), [A03](../AUDIT_TRACEABILITY.md#a03), [A29](../AUDIT_TRACEABILITY.md#a29), [A34](../AUDIT_TRACEABILITY.md#a34), [A37](../AUDIT_TRACEABILITY.md#a37) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Asset IDs own private originals/renditions, quotas and processing lifecycle; production Supabase resumable uploads and local protected streaming use existing app identity.

Assets, uploads and processing owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: proposed assets module authorizes purpose/owner/target, reserves quota, issues server-scoped upload session, verifies completion by size/hash/detected type and storage metadata; never trust browser completion.
2. Frontend: media library with direct TUS resumable upload, progress/resume/cancel/retry, processing status and ownership-aware attach picker; signed per-object token only, no service key or Supabase Auth.
3. Database: Asset/AssetRendition/UploadSession/AssetAttachment/QuotaReservation/ProcessingJob state machine and unique immutable object keys; revisions reference asset IDs.
4. Configuration/infrastructure: private Supabase buckets, direct storage hostname and signed TUS x-signature; use server-issued createSignedUploadUrl token, no upsert for immutable originals; local driver streams outside static roots.
5. Workers: antivirus/signature verification then ffprobe/transcode supported uploaded video to baseline MP4 + optional private HLS renditions/thumbnails; separate bounded process/container with limits and no public educational generation.
6. Delivery/cleanup: reauthorize parent access for each grant/manifest/segment; private HLS keys/segments never public. Mark-and-sweep abandoned/quarantine files after grace period, retain referenced originals/history and legal holds.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/utils/storage.ts](<../../server/src/utils/storage.ts>)
- [server/src/modules/videos/video.service.ts](<../../server/src/modules/videos/video.service.ts>)
- [server/src/modules/materials/material.service.ts](<../../server/src/modules/materials/material.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/VideoUploader.tsx](<../../client/src/components/VideoUploader.tsx>)
- [client/src/components/MaterialUploader.tsx](<../../client/src/components/MaterialUploader.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/assets/uploads {"purpose":"LESSON_MEDIA","targetId":"draft_1","filename":"lesson.mp4","bytes":40000000,"sha256":"<64hex>"} -> {"data":{"assetId":"a_1","uploadSessionId":"us_1","protocol":"TUS","endpoint":"https://<project>.storage.supabase.co/storage/v1/upload/resumable","objectName":"<server-key>","token":"<per-object>","expiresAt":"..."}}; finalize returns 202 QUARANTINED, not READY.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Only admin/approved teacher owner/assigned editor uploads educational content; students only own submissions/receipts. Recheck authorization on finalize/attach; unique finalize event and processing job dedupe. Reserve quota atomically before capability issuance; release once on cancel/expiry. Processing retries max 5 then dead-letter, never publish on failure.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory every local/cloud file with checksum, ownership and references; map legacy IDs/URLs to asset IDs, quarantine unresolved files, copy/verify privately then switch adapters. Preserve original bytes, lesson IDs, submissions and purchased access; close old public paths atomically. Signed URLs expire independently of app JWT revocation; use short TTL/proxy for strict revocation.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-03-T01** — Interrupt/restart TUS upload, quota exhaustion/concurrent reservations, wrong actor finalize and forged size/hash are correct.
- **ENH-03-T02** — Scan/transcode crash/retry produces one rendition set; invalid/unsupported media quarantined, source original retained.
- **ENH-03-T03** — Private Supabase and local drivers deny raw paths, range/seek/caption playback works in target browsers and both locales; outage never falls back to disk in production.
- **ENH-03-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-03-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-03-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Managed asset state/ownership/quota and migration verification report complete.
- [ ] No READY or published asset exists before verified processing; source educational content remains uploader-provided.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
