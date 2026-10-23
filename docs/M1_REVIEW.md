# Milestone 1 review — 23 October 2026

Disposition: **one introduced P2 defect fixed; Milestone 1 / G1 is not release ready**. One fresh independent reviewer inspected the full `codex/milestone-1` diff against merge base `322d070ff77cd6679afb8a3567963a295b7bb632`, including staged, unstaged and untracked files. The worktree was clean at reviewed revision `ad920ce5c72bbccfb99defc60c33ec584ebe3bdf`. Documentation reconciliation proceeded separately. The same reviewer rechecked the fix and found no new actionable issue. No other substantial introduced application regression was confirmed.

The [previous review](archive/reviews/M1_REVIEW_ROUND_1.md) preserves the original four findings, their reproductions and earlier test attempts. The [release closure](M1_RELEASE_READINESS.md) lists the full unfinished M1 scope. Review IDs supplement the original 58 finding IDs and reuse their owning backlog tasks.

## Current finding and resolution

| ID | Priority / owner | Location at reviewed revision | Disposition |
|---|---|---|---|
| M1-R05 | P2 / [ENG-06](tasks/ENG-06.md), ENG-13 verification | [process-shutdown.spec.ts](../server/src/utils/__tests__/process-shutdown.spec.ts), exit assertion at lines 120–121 of ad920ce | Resolved in the working tree; native Linux CI execution remains required |

**M1-R05 — resolved in the fixture:** the new test held a fake PostgreSQL handshake for up to 30 seconds, then required the API to exit within eight seconds after its readiness response. The existing shutdown helper waits for Prisma disconnect, which could not finish while that connection startup remained pending. The reviewer reproduced the actual shutdown handler returning a draining 503 at about three seconds while the process remained alive beyond the exit deadline.

The test now asserts the honest draining response first, settles the fake database sockets, and then waits for clean process exit. It uses disposable upload storage with owned-path cleanup. Windows exercises the registered SIGTERM handler through a test-only child bootstrap/IPC message because child termination there does not deliver a catchable POSIX signal; POSIX runners still send native SIGTERM. No production test hook or route was added. The focused process test passes locally without skips, server typecheck passes, and the reviewer independently confirmed the fix by inspection. This verifies the handler/HTTP-drain path on Windows; it does not establish native Linux signal delivery or a shutdown deadline for an indefinitely unresponsive real dependency.

## Retained original resolutions

- **M1-R01 — resolved in code/tests:** premature upload-response closure aborts the scanner and source; staging cleanup and admission release wait for owned work to terminate. The controlled real-HTTP/scanner regression covers two active uploads, rejection of a third, disconnect cleanup and safe reuse. Maximum-size resource and real-scanner evidence remain open.
- **M1-R02 — resolved in code/tests:** conditional config update and exact-row readback share a PostgreSQL transaction. Barrier-controlled and HTTP tests verify the first writer receives its own fields/version and stale saves conflict.
- **M1-R03 — resolved in code/tests:** a subject-pricing save reconciles only the confirmed subject and retains unrelated drafts and newer in-flight edits. Component tests cover success/failure, server-confirmed pricing, Arabic/English behavior and RTL.
- **M1-R04 — resolved in browser fixtures:** guarded setup supplies supported READY video only for renewal tests and isolates lesson attachments. Ordinary uploads retain PROCESSING and early-playback 409 protection. Both complete browser modes subsequently passed 32/32 with desktop/Pixel emulation, including bilingual admin and student charge cases.

The old failed/interrupted browser attempts remain in [machine-readable evidence](../audit/m1-review/verification.json). They are historical attempts, not current failures or silently replaced results. One later development run logged a transient proxy reset; the targeted four-case admin rerun passed without recurrence.

## Verification and limits

The reviewer ran both package typechecks and `git diff --check`, reproduced M1-R05 with a disposable loopback fixture and actual API handler, then rechecked the repair without modifying files or contacting external services. Full package/coverage, migration and browser results run by the implementation agent are recorded separately in [current status](CURRENT_STATUS.md) and [verification.json](../audit/m1-review/verification.json). Source hashes identify the verified files; earlier M0 CI results do not validate later M1 changes.

The Code Review plugin exposes PR CI diagnostics in this session. GitHub discovery returned no branch PR and no commit status checks for the reviewed revision, so no current remote CI pass is claimed. The review findings were returned locally; no external review/comment was posted.

The user selected **local fixtures only; keep external release checks open**. No production/staging migration, credential rotation, private Supabase/ClamAV canary, maximum-size production load, physical-device playback or representative backup/restore rehearsal was performed. Native Linux process execution requires CI.

## M1 release disposition

All 25 M1 tasks remain in the approved scope: four In Progress and 21 Planned at this checkpoint. The introduced review defect is repaired, but shared contracts, taxonomy, lifecycle/access parity, session/MFA concurrency, audit/outbox, canonical curriculum, managed assets and commerce foundations still require their owning implementations and acceptance. Reviewing config/media changes does not complete those tasks.

Completed task records are excluded from the active queue and archived under their own milestone; none of the unfinished M1 tasks is deleted or marked Complete without evidence. Follow [implementation order](NEXT_STEPS.md) and [the complete closure checklist](M1_RELEASE_READINESS.md). G1 acceptance must precede M1 finalization; real-student/paid onboarding additionally requires G2/G3.
