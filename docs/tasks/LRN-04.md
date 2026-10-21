# LRN-04 — Serialize assignment attempts and assessment submission

| Field | Value |
|---|---|
| Stable ID | LRN-04 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [LRN-02](LRN-02.md), [ENH-03](ENH-03.md) |
| Original finding / request | [LRN-04 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / C |
| Acceptance links | [A23](../AUDIT_TRACEABILITY.md#a23), [A25](../AUDIT_TRACEABILITY.md#a25), [A27](../AUDIT_TRACEABILITY.md#a27) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

[assignment.service.ts](<../../server/src/modules/assignments/assignment.service.ts>) checks submission count then creates a submission without transactional serialization. Assessment submission similarly checks status then updates without atomically claiming the attempt.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Attempt limits and terminal submission transitions hold under real concurrent requests; retries return the same submission.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: atomically claim IN_PROGRESS assessment and allocate assignment attempt number under scoped lock/serializable transaction; use client submissionId for idempotency.
2. Frontend: persist submission ID during retry, disable only pending duplicate actions and recover from timeout by querying status.
3. Database: unique(assignmentId,studentId,attemptNo), unique(studentId,submissionId) and conditional status/version updates; reference only owned READY asset IDs.
4. Configuration/infrastructure: bounded serialization retry with safe 409/503 after exhaustion; preserve request correlation for recovery.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/assignments/assignment.service.ts](<../../server/src/modules/assignments/assignment.service.ts>)
- [server/src/modules/assessment/assessment.service.ts](<../../server/src/modules/assessment/assessment.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/assignments/a_1/submissions {"submissionId":"sub_client_1","assetIds":["asset_1"],"text":{"ar":"..."}} -> one attemptNo; parallel different IDs cannot exceed maxAttempts.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Conditional race must be verified with real PostgreSQL barriers. Deadline/late policy checked under the same consistent decision; assessment grades commit only after terminal claim. No retry counts twice or attaches another student’s file.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory duplicate attempt numbers and preserve every submission body/file/grade; allocate stable historical sequence with provenance before uniqueness constraint. Do not discard student work to fit a constraint. Forward-fix stalled claimed submissions through visible status.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-04-T01** — 20 requests at one remaining assignment attempt yield one accepted attempt and bounded conflicts.
- **LRN-04-T02** — Parallel submit/expire yields one terminal assessment and one grade event; same submissionId repeats same result.
- **LRN-04-T03** — Late policy, cross-account file, malformed payload, restart/timeouts and Arabic/English browser retry preserve work.
- **LRN-04-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-04-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-04-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A27 and A25 assert final row counts, limits and grades.
- [ ] No count-then-create window remains unprotected.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
