# Milestone 1 manual verification

Updated **23 October 2026**. These are test instructions, not executed evidence. M1-R01–R04 in the [review](M1_REVIEW.md) are known failures in the current checkpoint. Record actual results, revision, locale, browser, screenshots or request IDs and persisted-state checks when running them.

## 1. Prepare a disposable environment

1. Read [test safety](TESTING_RELEASE_GATES.md) and the [migration runbook](MIGRATION_OPERATIONS.md). Use synthetic accounts/content only. Keep API and migration URLs on the same dedicated loopback `eduplatform_test` database; never copy a production connection into a test command.
2. From `server`, run `npm ci`, `npx prisma generate`, `npm run db:migrate:fixture`, `npm run typecheck`, `npm test` and `npm run build`. The migration fixture creates unique schemas, checks drift before baseline resolution, upgrades synthetic historical records and removes only its own schemas. It does not adopt the API's existing schema.
3. For a fresh empty disposable API schema, use the guarded `npm run db:migrate:test`. If it is already populated and reports P3005 or drift, stop and follow the restored-copy adoption procedure. Never execute the generated create-table baseline against existing tables or mark migrations applied merely to silence the error. A schema synchronized with `db push` is not migration-history evidence.
4. From `client`, run `npm ci`, `npm run typecheck`, `npm test`, `npm run lint` and `npm run build`. Read the results; warnings and untested journeys must remain recorded.
5. Verify the environment actually used by development startup: `server/.env` must point both database URLs at the disposable local schema, and `client/.env.local` must use the intended local API. `npm run dev` does not automatically select `server/.env.test`. Start the synthetic API with `npm run dev` from `server`, and the client with `npm run dev` from `client`, using the local URLs documented in each package's environment example. Keep credentials out of screenshots/log attachments. Provision an admin using the documented safe provisioning flow; use approved teacher/student synthetic accounts. Do not run demo seeds on shared data.
6. Open the client in two independent admin sessions (for example normal and private windows). Open DevTools Network with preservation enabled. Use the profile language setting to repeat the affected journeys in English and Arabic after reload.

## 2. Config persistence, currency and concurrency — ENG-02

1. In Platform Settings, confirm charge currency is fixed to EGP and the USD exchange rate is labeled indicative. Save rate `50`; check the request includes `expectedVersion` and only writable fields. Reload and confirm the persisted value and incremented version.
2. Keep session B on an old form. Save another rate in A, then save B. Expect `409 CONFIG_VERSION_CONFLICT`, visible retry/reload guidance and no overwrite of A's persisted rate. Reload B and confirm a fresh valid save succeeds.
3. Send an unauthorized config mutation and a valid-admin mutation with an unknown property or `currency: "USD"`. Expect a safe denial/validation response and unchanged persisted settings. Do not paste session tokens into documentation.
4. Confirm teacher/admin course editors and subject subscription pricing accept EGP only. Change the indicative rate and confirm catalog USD equivalents recalculate while EGP product/order snapshots remain unchanged. Inspect synthetic historical orders before and after; visual price display alone does not prove preservation.
5. **Known M1-R02 gap:** ordinary two-window stale saves do not deterministically reproduce the update/readback interleaving. Before accepting the fix, run the barrier-controlled PostgreSQL regression described in [the review](M1_REVIEW.md#required-regression-evidence). Confirm each success response belongs to its own write and a subsequent stale save conflicts.

## 3. Pricing draft preservation — M1-R03

1. Open two subjects A and B in Course Pricing. Change one subscription price under each without saving.
2. Save A. B's unsaved value must remain visible and unsent; the current checkpoint is expected to lose B's draft. Record this as a failure until fixed.
3. After the fix, repeat with a failed A request and with another edit typed while A is saving. All unrelated/newer drafts must survive. Reload only after explicitly saving or discarding each draft.
4. Repeat in Arabic and English, using keyboard navigation. Verify EGP amount/labels, server-confirmed A pricing and retained B value.

## 4. Upload, cancellation and private playback — ENG-09

1. As an approved teacher, upload a small valid supplied MP4 or WebM through the uploader. Confirm truthful indeterminate feedback, no simulated percentage and a `PROCESSING` result. Playback issuance for that new unverified record must return 409. Do not manually mark it READY to bypass the missing processing pipeline.
2. Try a disguised HTML file renamed `.mp4`, malformed multipart, a file larger than 500 MiB and a disallowed actor. Expect safe 4xx responses and no playable video record or publicly accessible staging object. Use purpose-made synthetic fixtures and inspect test storage/database state after each attempt.
3. Start two controlled uploads, then a third; inspect the documented admission response. Measure process RSS and staging disk usage, rather than inferring a memory bound from UI feedback. Test a slow scanner, storage failure and process restart; record all surviving staging files. A periodic stale-file janitor is still unimplemented.
4. **Known M1-R01 failure:** finish multipart body transmission while scanning remains blocked, then cancel/close the browser request. Verify scanner socket/source lifetime, staging cleanup and admission capacity using instrumented test infrastructure. Current cancellation watches the completed request and may leave the scan running. A cancel while the body is still uploading does not cover this defect.
5. Use a previously verified supported READY synthetic fixture for existing playback/range tests. Verify protected delivery with guest, unrelated student and entitled student. Seek repeatedly; valid prefix/open/suffix ranges return 206 and correct bytes; malformed, multi-range and unsatisfiable requests return 416 with the total length. Close playback during transfer and check for uncaught errors/leaked streams. Signed URLs must remain private.
6. Repeat upload/error/processing/player flows in English and Arabic, desktop Chromium and the supported actual mobile browsers. Emulation alone is not actual-device evidence. New-upload-to-READY, codec/duration checks, renditions and resumable uploads belong to ENH-03; retain them as G1 holds.

## 5. Reliability and milestone exit

1. Follow [ENG-05 evidence](ENG05_IMPLEMENTATION.md) to rehearse restored representative database/private-object recovery, read-only schema diff, reviewed history adoption and rollback/forward repair. Preserve counts/checksums and operator review separately from the synthetic fixture.
2. Follow [ENG-06 evidence](ENG06_IMPLEMENTATION.md) for real storage outage and process-level shutdown/drain checks. Liveness/readiness must differ, outages must not create filesystem fallback, and in-flight work must terminate or recover visibly.
3. Fix M1-R04's retained browser fixture first: use a known READY playable source and isolated lesson attachments, retaining normal-upload PROCESSING/409 checks separately. Run the retained suite using the [M0 manual guide](M0_MANUAL_TESTING.md) and collect production/development CI for the exact new commit. The review checkpoint has failing browser tests; Google Fonts sandbox failures must be separated from fixture failures. Smoke checks do not establish M1's config/upload acceptance by themselves.
4. Attach evidence for every remaining [M1 wave](NEXT_STEPS.md#m1-implementation-waves) and [G1 criterion](TESTING_RELEASE_GATES.md#gate-g1--durable-foundation-m1). Keep unfinished tasks open; do not finalize M1 or onboard real students based on this documentation/commit.
