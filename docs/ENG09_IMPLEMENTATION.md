# ENG-09 implementation evidence

24 October follow-through: [the guarded maximum-size benchmark](../server/benchmarks/video-upload-load.ts) sent two actual 500 MiB multipart uploads concurrently through private disk staging, a loopback scanner-protocol fixture and local streaming storage. [Measured results](../audit/m1-closure/video-load.json) include process RSS and staged bytes, third-request rejection, PROCESSING responses and complete cleanup. The exact 500 MiB parser boundary is accepted; the first byte beyond the cap is rejected. The local measurement is complete; real Supabase/ClamAV and physical-device acceptance remain open. Current final verification is [recorded separately](../audit/m1-closure/verification.json); the checkpoint below is historical.

Updated **23 October 2026** on `codex/milestone-1`. This is a partial M1 implementation checkpoint, not task completion or production-readiness evidence. The normative scope and unchecked acceptance cases remain in [ENG-09](tasks/ENG-09.md).

The [M1 review](M1_REVIEW.md) identified **M1-R01**: disconnecting after the multipart body completes could release upload admission while its scan kept running. Scanner/source cancellation and cleanup now share one upload lifecycle; a controlled HTTP/scanner regression verifies admission and cleanup. M1-R04's READY fixture is also repaired. Startup and periodic cleanup now remove abandoned staging files older than 24 hours. ENG-09 remains In Progress for measured resource, real storage/scanner and device acceptance. Fresh verification is recorded in [M1 evidence](../audit/m1-review/verification.json).

## Implemented locally

- Video multipart uploads use private disk staging instead of `multer.memoryStorage()`. The file cap is 500 MiB; one file and bounded multipart fields are accepted per request. Admission permits two requests per API process and remains occupied until scanner/storage work stops and staging cleanup completes. Cross-replica quotas remain ENH-03 work.
- Signature validation reads at most 8 KiB from a staged file. ClamAV receives staged uploads in 64 KiB chunks with backpressure. The storage adapter copies locally with streaming or sends a streaming Node request to configured private Supabase storage; API memory does not scale with the full video size.
- Staging files are removed after owned work terminates on response completion/close. Failed local storage copies remove their partial destination. If video record creation fails after storage succeeds, the service attempts to delete the uploaded object.
- A startup pass and six-hour janitor remove only regular `.upload` files in the private staging directory after 24 hours. This exceeds the 15-minute request inactivity timeout, so a live request is not considered abandoned; unrelated files and directories are preserved.
- Malformed/oversized Multer requests receive bounded 400/413 responses. Upload requests have an inactivity timeout; request abort and premature response close stop the ClamAV socket and staged-file source, and route cleanup waits for source closure before releasing admission (M1-R01). The existing local media stream retains strict single-range handling, 416 `Content-Range`, stream error handling and client-disconnect cancellation.
- New uploads remain `PROCESSING`. A filename, declared MIME type and file signature cannot establish valid codecs, duration or browser playback. Playback URL issuance and local streaming return 409 until a trusted media pipeline marks media `READY`. Legacy local-stream MIME is selected from the file extension rather than defaulting unknown formats to MP4.
- The upload component now has Arabic/English labels, truthful indeterminate progress, cancellation and server-state feedback. It no longer displays simulated percentage completion.
- The guarded browser fixture creates a UUID-scoped supported READY local video for the paused renewal journey without weakening normal upload PROCESSING state (M1-R04).

No Prisma schema change or production data migration was required. Existing uploaded originals and READY records were not mass-probed, changed or deleted.

## Verification run

Commands run from the package directories:

```text
server: npm run typecheck                                      PASS
server: npm test -- src/modules/videos/__tests__/video.integration.spec.ts       PASS, including controlled scan saturation/disconnect/cleanup/capacity reuse
server: npm test -- src/utils/__tests__/scanner.spec.ts                          PASS, abort closes staged source before cleanup
client: npm run typecheck                                      PASS
client: npm test -- src/components/VideoUploader.test.tsx src/components/VideoPlayerSection.test.tsx src/lib/usePlaybackSource.test.tsx
       3 test files / 14 tests PASS
```

The video integration suite uses the repository's guarded local `eduplatform_test` database. It verifies an approved-teacher upload, PROCESSING response, early-playback rejection, bad-signature rejection and absence of a video row after validation failure. Playback tests cover authorization and the existing byte-range/disconnect behavior. Scanner tests confirm a staged file is passed to ClamAV without a whole-file Buffer. The uploader component tests assert truthful English and Arabic processing messages and no simulated percentage.

Fresh full package checks are recorded in the [M1 evidence](../audit/m1-review/verification.json). The complete server suite now passes **446/446** with zero skips, including stale staging cleanup. Complete local production and development/Strict Mode browser suites each passed **32/32**, with 0 failures/skips and clean exit. The suites cover the retained upload, protected playback, range, cancellation and document-switch checks alongside bilingual config and checkout flows. Ordinary uploads still require PROCESSING and reject early playback with 409. Browser emulation does not replace physical-device evidence.

## Still required before ENG-09 completion

- Verify streaming uploads and cleanup against a disposable private Supabase bucket. Local filesystem tests do not verify vendor behavior or production network timeouts.
- [x] Startup and periodic cleanup of abandoned files is implemented and covered by a local test that preserves recent uploads and unrelated files.
- [ ] Measure peak API memory and staging-disk usage during two real concurrent maximum-size uploads; exercise the admission response, malformed multipart, disconnect, scanner outage and storage failure paths under load.
- Complete target-device transport playback/seeking with known verified READY MP4/WebM fixtures, including Arabic/English browser journeys. ENG-09 can close this transport subgate before ENH-03 starts. New-upload codec/duration probing, durable processing, READY transitions and end-to-end A29 media acceptance belong to ENH-03 and remain required for G1; they are not prerequisites for the ENG-09 task on which ENH-03 depends.
- Rehearse any legacy media status/path migration only after a read-only inventory; this implementation does not mutate existing records.

ENG-09 remains **In Progress**. Do not promote the local checks to exact-head GitHub CI or production evidence until those runs happen on the eventual commit and deployment.
