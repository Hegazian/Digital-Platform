# SEC-07 — Scope quiz and question-bank privileges to owners and assignments

| Field | Value |
|---|---|
| Stable ID | SEC-07 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [SEC-05](../archive/completed/M0/SEC-05.md), [ENG-05](ENG-05.md) |
| Original finding / request | [SEC-07 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1: any teacher receives any quiz's answer key [R: F04] |
| Acceptance links | [A05](../AUDIT_TRACEABILITY.md#a05) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[quiz.controller.ts:33](<../../server/src/modules/quizzes/quiz.controller.ts>) treats the global teacher role as permission to retrieve answers. `GET /quizzes/:id` does not check ownership, approval status, course access, or course publication. Standalone quizzes also have no creator relation and are explicitly editable by any approved teacher in [quiz.service.ts:152](<../../server/src/modules/quizzes/quiz.service.ts>).

Add a creator/owner and policy for quiz reads/edits. Teacher status alone must not grant access to another teacher's assessment answers. Make any shared question-bank policy explicit and separate from private course assessments.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Approved teachers may read keys or edit only owned/explicitly assigned assessments and banks; sharing is an explicit grant.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: pass actor separately, enforce assessment/bank ownership on every read/write/clone route, including standalone quizzes.
2. Frontend: show only writable banks in authoring pickers and distinguish shared read-only banks.
3. Database: backfill ownerId/createdById and ContentAssignment grants; ambiguous standalone records become admin-managed until assigned.
4. Configuration/infrastructure: publish ownership denial metrics without revealing private assessment titles.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/quizzes/quiz.controller.ts](<../../server/src/modules/quizzes/quiz.controller.ts>)
- [server/src/modules/quizzes/quiz.service.ts](<../../server/src/modules/quizzes/quiz.service.ts>)
- [server/src/modules/assessment/assessment.service.ts](<../../server/src/modules/assessment/assessment.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/question-pools/p_1/grants {"teacherId":"t_2","capability":"READ"} requires owner/admin; READ never implies EDIT or published answer-review access.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Global TEACHER role never authorizes answer keys. Clone requires source read permission and creates a new owner/revision; failed cross-account requests are 404. LRN-02 owns version migration.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Infer ownership only from reliable course/creator evidence. Preserve uncertain legacy banks read-only for admin assignment; keep old quiz IDs through adapters. Rollback retains new ownership ACLs.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-07-T01** — Teacher A cannot GET keys, edit, delete or attach teacher B’s quiz/bank by guessed ID.
- **SEC-07-T02** — Assigned read-only teacher can inspect source but cannot mutate; revoked approval invalidates access.
- **SEC-07-T03** — Concurrent grant revoke/edit and Arabic/English owner pickers enforce server decisions.
- **SEC-07-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-07-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-07-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] No global teacher-key shortcut remains.
- [ ] Every legacy standalone record has a documented owner or admin quarantine.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
