# SEC-05 — Eliminate answer-key leaks through explicit question DTOs

| Field | Value |
|---|---|
| Stable ID | SEC-05 |
| Priority | P0 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Assessment serialization |
| Dependencies | [SEC-04](SEC-04.md) |
| Original finding / request | [SEC-05 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P0: short-answer keys survive course sanitization [R: F02-F03] |
| Acceptance links | [A05](../AUDIT_TRACEABILITY.md#a05) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../CURRENT_STATUS.md), [implementation results and task disposition](../M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../M0_REVIEW_ROUND_2.md), and [manual checks](../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-13 keeps its broader release obligation In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. The M0 engineering/containment deliverable is complete at **d9c720f**, including the follow-up regressions. See [current verification](../CURRENT_STATUS.md), [first review](../M0_REVIEW_RESOLUTION.md) and [second review](../M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[course.service.ts:13](<../../server/src/modules/courses/course.service.ts>) spreads each question, strips option `isCorrect`, and clears `explanation`, but retains `correctAnswer`. An anonymous course response returned a short-answer key. Build student DTOs from explicit allowed fields and verify recursively that every answer-key representation is absent.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Every public/student question response is built from allowed fields; internal keys and explanations are returned only through separately authorized review policy.

Assessment serialization owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: replace object-spread sanitization with public question/result serializers for all supported types; use the same serializers on nested catalog compatibility routes.
2. Frontend: consume option IDs and prompts without correctness flags; review screens request an explicitly authorized review DTO.
3. Database: no key deletion; preserve private grading data and historical results.
4. Configuration/infrastructure: add recursive forbidden-field tests including correctAnswer, correctAnswerJson, questionsSnapshotJson and option correctness, then invalidate leaked response caches.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)
- [server/src/modules/quizzes/quiz.controller.ts](<../../server/src/modules/quizzes/quiz.controller.ts>)
- [server/src/modules/assessment/assessment.service.ts](<../../server/src/modules/assessment/assessment.service.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
StudentQuestion = {"id":"q_1","type":"SHORT_ANSWER","prompt":{"ar":"..."},"points":2}; correctAnswer and explanation are absent, not null placeholders copied from a row.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Assessment author/assigned reviewer privileges are separate from teacher role. A terminal attempt does not automatically reveal answers. SEC-08 owns attempt response adoption; SEC-07 owns read/edit ownership.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Do not modify keys or historical scores to achieve redaction. Remove fields from unsafe DTOs immediately, document the security compatibility break, and never roll back to raw-row serialization.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-05-T01** — Every question type at catalog/start/get/submit/expire/history endpoints has recursively forbidden fields absent.
- **SEC-05-T02** — Owner/admin authoring paths still return keys after explicit authorization; unrelated approved teacher is denied.
- **SEC-05-T03** — Arabic/English question rendering, partial grade display and allowed post-close answer review use separate safe contracts.
- **SEC-05-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-05-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-05-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A05 covers all representations and endpoints, including nested snapshots.
- [ ] No object-spread serializer can accidentally expose new grading fields.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
