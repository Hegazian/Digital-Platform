# SEC-08 — Use safe assessment result and expiry responses

| Field | Value |
|---|---|
| Stable ID | SEC-08 |
| Priority | P1 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Platform engineering |
| Dependencies | [SEC-05](SEC-05.md) |
| Original finding / request | [SEC-08 original finding](../../../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1: submitted and expired exams return internal answer snapshots [R: F05] |
| Acceptance links | [A05](../../../AUDIT_TRACEABILITY.md#a05) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../../../CURRENT_STATUS.md), [implementation results and task disposition](../../reviews/M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../../reviews/M0_REVIEW_ROUND_2.md), and [manual checks](../../../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. The M0 engineering/containment deliverable is complete at **d9c720f**, including the follow-up regressions. See [current verification](../../../CURRENT_STATUS.md), [first review](../../reviews/M0_REVIEW_RESOLUTION.md) and [second review](../../reviews/M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../../../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[assessment.service.ts:315](<../../../../server/src/modules/assessment/assessment.service.ts>) and [assessment.service.ts:369](<../../../../server/src/modules/assessment/assessment.service.ts>) return raw attempt rows, including `questionsSnapshotJson` containing `correctAnswerJson`. Starting/reading an attempt sanitizes it, but submitting/expiring it does not. Students can collect answer banks for further attempts or other students. Return a dedicated result DTO and define when answer review is permitted.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../../../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Submit, expire, history and review responses expose only student-safe attempt summaries unless a separate answer-review policy permits more.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../../../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../../../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: replace raw attempt return values with AttemptResultDTO on every terminal branch, including repeated submit and auto-expire.
2. Frontend: render pending/manual scores without internal snapshots; load permitted review separately.
3. Database: keep questionsSnapshotJson private and unchanged for grading/audit.
4. Configuration/infrastructure: forbid snapshots in logs/traces and apply no-store response headers.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/assessment/assessment.service.ts](<../../../../server/src/modules/assessment/assessment.service.ts>)
- [server/src/modules/assessment/assessment.controller.ts](<../../../../server/src/modules/assessment/assessment.controller.ts>)
- [client/src/components/player/AssessmentRunner.tsx](<../../../../client/src/components/player/AssessmentRunner.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
AttemptResult = {"id":"at_1","status":"AWAITING_REVIEW","score":null,"maxScore":20,"gradedPoints":10,"pendingQuestions":1,"versionId":"av_1"}
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../../../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

A student can read only their own attempt; assigned reviewer/admin uses an explicit grading endpoint. Repeating submit returns the same safe projection. ReleaseAnswer policy defaults NEVER until configured with after-close checks.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

No snapshot purge or regrading. Upgrade serializers first and adapters afterward; rollback may disable result endpoint but never return raw records.

Follow [expand/backfill/verify/cutover](../../../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-08-T01** — Submit/expire/repeat/history responses recursively exclude correctAnswerJson and snapshots for all types.
- **SEC-08-T02** — Another student/unrelated teacher cannot read the attempt; authorized grade queue can access needed private keys.
- **SEC-08-T03** — Terminal attempts before/after answer-release time show exactly allowed fields in Arabic/English.
- **SEC-08-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-08-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-08-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] F05 regression asserts absence of internal fields after both submit and expire.
- [ ] Client does not depend on private snapshots.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
