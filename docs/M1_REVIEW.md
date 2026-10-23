# Milestone 1 review — 23 October 2026

Initial disposition: **changes required; M1/G1 remains open**. A single independent, read-only reviewer inspected `codex/milestone-1` against `origin/main` at merge base `322d070ff77cd6679afb8a3567963a295b7bb632`, including staged, unstaged and all four untracked files present at review start. The author has since implemented the four findings and run focused regressions plus the retained browser suite. This resolution record is evidence from the current working tree; it is not a second independent review or exact-commit CI result.

## Confirmed findings and implementation order

These review IDs supplement the original 58 finding IDs; they do not add duplicate backlog tasks. Each has one implementation owner. They were **Open** at the initial review checkpoint. Their targeted regressions now pass; ENG-02 and ENG-09 remain In Progress for their remaining acceptance and operational gates.

| ID | Owner | Affected location | Failure and required change |
|---|---|---|---|
| M1-R01 | [ENG-09](tasks/ENG-09.md) | [scanner cancellation](../server/src/utils/file-validation.ts#L105), `scanUploadedFile` | After Multer consumes the complete body, a browser disconnect closes the response without emitting `req.aborted`. The scan continues while upload admission releases its slot, allowing live scans/open staging files to accumulate beyond two. Cancel the scanner and its source on premature response close; release capacity and remove staging only when owned work has terminated. |
| M1-R02 | [ENG-02](tasks/ENG-02.md) | [transactional config persistence](../server/src/modules/config/config.controller.ts#L6), `persistConfigRevision` | Conditional update and subsequent read were separate. A later admin save could land between them; the first response then carried the later version while its UI retained older fields. The next save could overwrite unseen changes without conflict. Return the exact updated row/version atomically, using a conditional returning update or a correctly isolated transaction. |
| M1-R03 | [ENG-02](tasks/ENG-02.md) | [subject pricing save](../client/src/components/admin/CoursePricingManager.tsx#L115), `handleSavePricing` | Saving subject A reloaded all subjects and silently discarded unsaved edits for B. Merge only A's server-confirmed result, preserving B's draft and any newer in-flight edits. [COM-11](tasks/COM-11.md) retains long-term atomic pricing/history ownership. |
| M1-R04 | [ENG-09](tasks/ENG-09.md), test infrastructure support from ENG-13 | [new upload state](../server/src/modules/videos/video.service.ts#L30), retained [renewal test](../client/e2e/m0/safety.spec.ts#L76) | Uploads correctly remain PROCESSING, but the retained renewal test uploaded and immediately expected playback. Both browser projects failed before renewal assertions; its attached pending video also contaminated later document tests. Seed a known supported READY fixture through guarded test setup, isolate/restore attachments and test normal PROCESSING/409 separately. Do not weaken readiness protection. |

Locations refer to the reviewed working tree. The reviewer reproduced scanner cancellation and config interleaving in memory. TypeScript checks passed in both packages; static documentation validation passed with its report write intercepted in memory. The reviewer did not execute database, migration, browser, vendor or load suites.

## Resolution evidence and remaining acceptance

- **M1-R01 — resolved in code/tests:** a controlled local ClamAV-protocol server test completes multipart transmission, fills both upload slots, rejects a third request, disconnects one client during scanning, observes scanner closure and staging cleanup, then verifies a new upload is accepted while the other scan remains active. A scanner unit test covers abort after input consumption and waits for the file source to close before cleanup. The test does not establish a production memory bound, cross-process quota, or real-vendor behavior.
- **M1-R02 — resolved in code/tests:** conditional update and exact-row readback now run in one PostgreSQL transaction. A barrier-controlled test pauses the first transaction at readback, starts a same-version writer and verifies it cannot replace the first writer's result; the stale writer returns no row. The HTTP test verifies the successful response equals the persisted row/version and a later stale save conflicts.
- **M1-R03 — resolved in code/tests:** pricing save reconciles only the saved subject from the server response and retains unrelated drafts or newer values typed while the request is pending. Three component tests cover successful server reconciliation, preserving all drafts after a failed request, in-flight edits, Arabic copy and RTL form direction.
- **M1-R04 — resolved in browser fixtures:** the guarded runner seeds a UUID-scoped supported READY video and attaches it only to the renewal course. The existing upload path still returns PROCESSING and rejects early playback. Production and development/Strict Mode retained suites each pass all 24 desktop/mobile checks, including pause/renewal and document-switch cancellation.

The M1 review findings are resolved by these code-level regressions. They do not complete ENG-02, ENG-09 or M1/G1: representative restore/rollback, real storage/scanner outage, maximum-size resource measurement, actual devices, bilingual end-to-end config/order checks and exact-head CI remain open.

### Regression requirements for broader acceptance

- **M1-R01:** With a controlled scanner, finish sending the multipart body, then close the response connection while scanning is blocked. Verify scanner socket and file source terminate, staging is eventually removed on Windows as well as Linux, and admission capacity is not reusable while orphaned work remains. Repeat cancellations alongside two active uploads and verify the bound. Cover normal success, rejected signature, scanner timeout/unavailable/infected result, storage failure and late close without deleting a successful stored object.
- **M1-R02:** Use real PostgreSQL with barriers to put admin B's read/save between A's conditional write and attempted readback. A must receive A's saved fields and version, B must receive B's version, and a subsequent stale full-form save from A must conflict. Verify rollback and no version increment on rejected input or stale writes. Run an admin component test against responses that differ from the original draft.
- **M1-R03:** Edit prices for subjects A and B, save A and assert B's input remains unchanged. Verify A's confirmed pricing updates, failed saves retain both drafts, and changes typed while a save is pending survive. Exercise Arabic/English labels, keyboard use and currency display.
- **M1-R04:** Run production and development browser modes with known READY media fixtures and isolated lesson attachments. Preserve real pause, renewal, position and speed checks. Assert separately that ordinary new uploads remain PROCESSING and reject early playback; document-switch tests must not inherit another project's pending video.

The focused regressions above cover the originally reported interleavings. Continue the broader acceptance below before completing the owning tasks.

## Verification and evidence limits

Fresh package, migration and documentation results for this pass are recorded in [machine-readable evidence](../audit/m1-review/verification.json) and summarized in [current status](CURRENT_STATUS.md). Local command logs are retained under `audit/m1-review/*.log` and intentionally excluded from Git. The record distinguishes earlier M0 CI from the current M1 working tree; exact M1 commit CI remains required after commit/push.

The first local production browser run reported **14 passed / 10 failed / 0 skipped**. The same reviewer inspected all saved failure contexts/traces: baseline Google Fonts requests were denied by the sandbox; both renewal tests failed on PROCESSING playback, and the mobile document test additionally inherited the desktop test's pending attachment. Font failures are an environment limitation, not an introduced M1 defect. Windows teardown stalled; stopping only the verified test web servers let the runner finish and execute fixture cleanup. A rerun with network access is recorded separately in machine-readable evidence; never replace the first attempt with a claim that it passed.

The network-enabled production rerun and development/Strict Mode run initially finished with **21 passed / 3 failed / 0 skipped**. Both failed the desktop/mobile paused-video renewal tests and the mobile document-switch test contaminated by the prior pending attachment (M1-R04). Their processes exited with code 1 and fixture cleanup completed. After the fixture and cancellation assertions were corrected, production passed **24/24**, and the refreshed development/Strict Mode run passed **24/24**. These browser suites use the same 24 retained checks; desktop/mobile emulation is not physical-device acceptance.

There was no deployment, production schema adoption, credential rotation, advisory refresh, real Supabase/scanner exercise, measured maximum-size upload load, actual-device test or representative restore rehearsal during this pass. M0 coverage/browser results remain historical evidence, not fresh M1 results. The [manual guide](M1_MANUAL_TESTING.md) lists reproducible checks and known failure cases without claiming they passed.

## Completion handoff

1. Keep the four finding regressions above in CI and attach exact-head results after commit/push.
2. Complete the remaining ENG-02/09 browser, load and storage acceptance, plus ENG-05/06 operator rehearsals. Their status remains **In Progress**.
3. Close ENG-09's transport subgate using known supported READY fixtures. ENH-03, which depends on ENG-09, owns new-upload processing/READY and end-to-end media acceptance. This avoids an acceptance dependency loop while retaining the full G1 gate.
4. Follow the five dependency waves in [NEXT_STEPS.md](NEXT_STEPS.md). All 25 M1 tasks and G1 evidence must be accepted before M1 is finalized; these review fixes alone do not finish M1.
