# ENG-09 implementation evidence

Updated **23 October 2026** on `codex/milestone-1`. This is a partial M1 implementation checkpoint, not task completion or production-readiness evidence. The normative scope and unchecked acceptance cases remain in [ENG-09](tasks/ENG-09.md).

The [M1 review](M1_REVIEW.md) identified **M1-R01**: disconnecting after the multipart body completes can release upload admission while its scan keeps running. The two-request admission check does not yet prove a two-scan or hard staging-disk bound. Fix response-close cancellation and work/cleanup lifetime before accepting containment. Fresh verification is recorded in [M1 evidence](../audit/m1-review/verification.json).

## Implemented locally

- Video multipart uploads use private disk staging instead of `multer.memoryStorage()`. The file cap is 500 MiB; one file and bounded multipart fields are accepted per request. Admission permits two requests per API process, but M1-R01 allows scans to outlive their slots; the intended two-upload/1 GiB active-data bound is not established. Cross-replica quotas remain ENH-03 work.
- Signature validation reads at most 8 KiB from a staged file. ClamAV receives staged uploads in 64 KiB chunks with backpressure. The storage adapter copies locally with streaming or sends a streaming Node request to configured private Supabase storage; API memory does not scale with the full video size.
- Staging files are removed after response completion/close. Failed local storage copies remove their partial destination. If video record creation fails after storage succeeds, the service attempts to delete the uploaded object.
- Malformed/oversized Multer requests receive bounded 400/413 responses. Upload requests have an inactivity timeout and request-abort scanner guards; response-close cancellation after body completion is missing (M1-R01). The existing local media stream retains strict single-range handling, 416 `Content-Range`, stream error handling and client-disconnect cancellation.
- New uploads remain `PROCESSING`. A filename, declared MIME type and file signature cannot establish valid codecs, duration or browser playback. Playback URL issuance and local streaming return 409 until a trusted media pipeline marks media `READY`. Legacy local-stream MIME is selected from the file extension rather than defaulting unknown formats to MP4.
- The upload component now has Arabic/English labels, truthful indeterminate progress, cancellation and server-state feedback. It no longer displays simulated percentage completion.

No Prisma schema change or production data migration was required. Existing uploaded originals and READY records were not mass-probed, changed or deleted.

## Verification run

Commands run from the package directories:

```text
server: npm run typecheck                                      PASS
server: npm test -- src/modules/videos/__tests__/video.service.spec.ts src/modules/videos/__tests__/video.integration.spec.ts src/modules/videos/__tests__/video-playback.spec.ts src/utils/__tests__/file-validation.spec.ts src/utils/__tests__/scanner.spec.ts src/utils/__tests__/storage-readiness.spec.ts
       6 test files / 55 tests PASS
client: npm run typecheck                                      PASS
client: npm test -- src/components/VideoUploader.test.tsx src/components/VideoPlayerSection.test.tsx src/lib/usePlaybackSource.test.tsx
       3 test files / 14 tests PASS
```

The video integration suite uses the repository's guarded local `eduplatform_test` database. It verifies an approved-teacher upload, PROCESSING response, early-playback rejection, bad-signature rejection and absence of a video row after validation failure. Playback tests cover authorization and the existing byte-range/disconnect behavior. Scanner tests confirm a staged file is passed to ClamAV without a whole-file Buffer. The uploader component tests assert truthful English and Arabic processing messages and no simulated percentage.

Fresh full package checks pass in the [M1 review evidence](../audit/m1-review/verification.json), but both network-enabled production and development browser suites fail: **21 passed / 3 failed / 0 skipped** per mode. M1-R04 requires a guarded READY fixture and attachment isolation for renewal/document tests while retaining normal-upload PROCESSING/409 assertions. This is an open regression, not permission to weaken readiness checks.

## Still required before ENG-09 completion

- Resolve M1-R01 and add a complete-body/response-close scanner regression with admission and Windows/Linux cleanup assertions.
- Measure peak API memory and staging-disk usage during two real concurrent maximum-size uploads; exercise the admission response, malformed multipart, disconnect, scanner outage and storage failure cleanup paths under load.
- Verify streaming uploads and cleanup against a disposable private Supabase bucket. Local filesystem tests do not verify vendor behavior or production network timeouts.
- Exercise process restart and stale staging-file cleanup. Current cleanup is request-lifecycle based; there is no periodic stale-file janitor yet.
- Complete target-device transport playback/seeking with known verified READY MP4/WebM fixtures, including Arabic/English browser journeys. ENG-09 can close this transport subgate before ENH-03 starts. New-upload codec/duration probing, durable processing, READY transitions and end-to-end A29 media acceptance belong to ENH-03 and remain required for G1; they are not prerequisites for the ENG-09 task on which ENH-03 depends.
- Rehearse any legacy media status/path migration only after a read-only inventory; this implementation does not mutate existing records.

ENG-09 remains **In Progress**. Do not promote the local checks to exact-head GitHub CI or production evidence until those runs happen on the eventual commit and deployment.
