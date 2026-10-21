# SEC-12 — Apply learning access to discussions, assignments and banks

| Field | Value |
|---|---|
| Stable ID | SEC-12 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [COM-01](COM-01.md), [SEC-07](SEC-07.md) |
| Original finding / request | [SEC-12 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1: course discussions and assignment reads bypass learning access [S] |
| Acceptance links | [A11](../AUDIT_TRACEABILITY.md#a11), [A27](../AUDIT_TRACEABILITY.md#a27) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

[discussion.controller.ts](<../../server/src/modules/discussions/discussion.controller.ts>) allows any authenticated account to list a course's complete threads/replies and post to it, without validating membership or the relationship between submitted course and lesson IDs. Assignment detail and lesson-assignment listing in [assignment.routes.ts](<../../server/src/modules/assignments/assignment.routes.ts>) similarly lack the learning-access guard applied to submission. Question pools are globally readable and writable by approved teachers with no ownership field. Apply a shared content/ownership policy to reads and writes, not just attempts and submissions.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Read and write authorization follows current course access and parent relationships for discussions, assignments and private banks.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: resolve lesson→course server-side, verify supplied courseId matches; apply AccessPolicy before lists/details/posts/files and assigned reviewer checks before grading.
2. Frontend: show access-required states for discussions and assignments; remove global private bank pickers.
3. Database: add verified relationship FKs/backfill orphan quarantine; assignment owner/grader uses explicit grants.
4. Configuration/infrastructure: paginate/moderate discussions and rate-limit posts; log denied IDs without content.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/discussions/discussion.controller.ts](<../../server/src/modules/discussions/discussion.controller.ts>)
- [server/src/modules/assignments/assignment.routes.ts](<../../server/src/modules/assignments/assignment.routes.ts>)
- [server/src/modules/assessment/assessment.routes.ts](<../../server/src/modules/assessment/assessment.routes.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/discussions {"courseId":"c_1","lessonId":"lesson_from_c2","body":"..."} -> 422 RELATIONSHIP_MISMATCH; unrelated member GET assignment -> 404.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Preview access does not imply posting, assignment submission or bank access. Admin/owner may preview drafts through studio routes. Membership expiry takes effect on new operations; history remains available only under documented personal-record policy.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Backfill associations from valid lessons; preserve orphan student submissions in admin quarantine, never delete on FK creation. Rollback retains guards and legacy protected adapters.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-12-T01** — Student without access cannot read/post threads or list assignment details/files by ID.
- **SEC-12-T02** — Cross-course forged association and unrelated teacher bank operations fail with zero writes.
- **SEC-12-T03** — Concurrent expiry/post and Arabic/English browser read/write tests match media/access outcomes.
- **SEC-12-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-12-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-12-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Every associated read/write route is covered by policy tests.
- [ ] No assignment or question-pool endpoint relies only on authenticated role.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
