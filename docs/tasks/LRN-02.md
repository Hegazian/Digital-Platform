# LRN-02 — Unify versioned assessment definitions and frozen attempts

| Field | Value |
|---|---|
| Stable ID | LRN-02 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Assessment engine owner |
| Dependencies | [SEC-07](SEC-07.md), [ENH-02](ENH-02.md) |
| Original finding / request | [LRN-02 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A25](../AUDIT_TRACEABILITY.md#a25) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Quiz `dueDate` is saved but never checked in start/submit. Quiz definitions are editable by deleting/recreating questions while attempts reference the live definition. Existing/in-flight work can be graded against changed IDs/answers.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Extend the existing Assessment/QuestionPool/QuestionItem engine as canonical; legacy Quiz endpoints become adapters to versioned definitions and frozen attempts.

Assessment engine owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: centralize availability, dueDate, start/resume, question selection, randomization seed and frozen private snapshot; no grading against live mutable questions.
2. Frontend: author assessment drafts and preview exact version; legacy quiz links resolve via mapping without changing bookmarks.
3. Database: add AssessmentVersion, QuestionVersion, owner assignments, Attempt.versionId/expiresAt and LegacyQuizMap; preserve all legacy question/attempt IDs in mapping.
4. Configuration/infrastructure: migrate by expand/backfill/verify; retain legacy score provenance and route adapters; monitor unmapped/ambiguous records.
5. Integration: support SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY with explicit supported capabilities; LRN-03 owns grading semantics and LRN-04 atomic submission.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/quizzes/quiz.service.ts](<../../server/src/modules/quizzes/quiz.service.ts>)
- [server/src/modules/assessment/assessment.service.ts](<../../server/src/modules/assessment/assessment.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/teacher/AssessmentBuilder.tsx](<../../client/src/components/teacher/AssessmentBuilder.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Start body {"assessmentId":"as_1"}; AttemptDTO={"id":"at_1","versionId":"av_4","serverNow":"...","expiresAt":"...","questions":[{"id":"qv_1","type":"ESSAY","prompt":{"ar":"..."},"points":5}],"savedAnswers":{},"answerVersion":0}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

start requires entitlement and current availability; expiresAt=min(start+duration,closeAt) with UTC server instants. Existing attempt keeps frozen question IDs/points/order. Author cannot mutate a published AssessmentVersion; edits create a new draft.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve historical scores verbatim. If an original question version cannot be reconstructed, mark legacySnapshotProvenance=UNKNOWN and keep score as legacy, never invent keys or silently regrade. Adapter URLs retain original IDs and authorization. Rollback uses dual reads without discarding new attempts.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-02-T01** — Editing/deleting/reordering draft questions cannot change ongoing or historic grading.
- **LRN-02-T02** — Due/open/close boundaries, selected bank versions and randomization replay deterministically; unavailable or wrong-owner start denied.
- **LRN-02-T03** — Migrate mixed legacy fixtures and reopen old quiz URLs; Arabic/English question content and historic scores preserved.
- **LRN-02-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-02-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-02-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A25 immutable definitions and deadlines pass with real snapshots.
- [ ] One canonical engine owns new delivery; adapters retain legacy identity/history.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
