# ENH-07 — Present uploaded captions, transcripts and accessible lessons

| Field | Value |
|---|---|
| Stable ID | ENH-07 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Accessibility and uploaded text tracks |
| Dependencies | [ENH-03](ENH-03.md), [LRN-06](LRN-06.md), [LRN-16](LRN-16.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A37](../AUDIT_TRACEABILITY.md#a37), [A42](../AUDIT_TRACEABILITY.md#a42) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Uploaders attach authored SRT/WebVTT captions/transcripts/alt text; students can study through keyboard, screen reader and low-bandwidth alternatives.

Accessibility and uploaded text tracks owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: validate uploaded caption syntax/cue bounds/language and bind to exact media revision; technical SRT→WebVTT conversion allowed without rewriting words.
2. Frontend: caption selection/ar/en language labels, searchable entitled transcript, keyboard player, accessible math/alt descriptions and download alternatives where rights permit.
3. Database: MediaTextTrack(assetId,language,kind,sourceAssetId,revisionId) and uploader-provided transcript/alt text; preserve provenance.
4. Configuration/infrastructure: accessibility publication checklist, target WCAG 2.2 AA for launch flows, actual device/browser assistive-technology checks; gate absent required alternatives with explicit review issue.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/VideoPlayerSection.tsx](<../../client/src/components/VideoPlayerSection.tsx>)
- [client/src/components/player/PDFDocumentViewer.tsx](<../../client/src/components/player/PDFDocumentViewer.tsx>)
- [client/src/components/podcasts/PodcastPlayer.tsx](<../../client/src/components/podcasts/PodcastPlayer.tsx>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
TextTrack={"id":"tt_1","mediaAssetId":"a_video","captionAssetId":"a_vtt","language":"ar","kind":"CAPTIONS","label":"العربية"}; transcript text is supplied by uploader, not speech-generated.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Caption/transcript access equals parent lesson access; no public search leakage. Uploaded scripts/timing/HTML are sanitized, external cue URLs forbidden. Updated media requires reviewer to confirm caption alignment in new revision.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve uploaded originals/cues and mark missing captions as editorial tasks. Do not invent transcripts during migration. Keep old media version paired with its tracks; rollback restores pair atomically.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-07-T01** — Valid Arabic/English captions render with correct timing; invalid cue/range/encoding/foreign asset rejected.
- **ENH-07-T02** — Guest/nonmember cannot fetch protected tracks/transcript; expired grant renews safely.
- **ENH-07-T03** — Screen reader/keyboard/reduced motion/contrast/low-cost Android and iOS playback, equations and mixed direction tested.
- **ENH-07-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-07-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-07-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A37 uploaded-media/caption integrity and A42 accessible study pass.
- [ ] No automated narration or caption creation is required or invoked.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
