# ENH-04 — Import versioned assessments and assignments safely

| Field | Value |
|---|---|
| Stable ID | ENH-04 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Structured import owner |
| Dependencies | [LRN-02](LRN-02.md), [LRN-03](LRN-03.md), [LRN-05](LRN-05.md), [ENH-03](ENH-03.md), [ENH-02](ENH-02.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A35](../AUDIT_TRACEABILITY.md#a35) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Uploaders preview/validate versioned JSON assessment/assignment packages and CSV question banks, then explicitly commit drafts atomically.

Structured import owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: proposed imports module parses bounded UTF-8 JSON/CSV in staged validation, reports row/path errors and validates relationship/asset/point/rubric constraints; no remote URL fetching.
2. Frontend: bilingual downloadable templates, drag/drop, preview warnings/errors, mapping for CSV headers and explicit confirm; imported keys visible only to authorized editor.
3. Database: ImportSession(owner,target,schemaVersion,checksum,expectedDraftVersion,expiresAt,status) and ImportError rows; commit creates revisions/question versions/assignment rubric in one transaction.
4. Configuration/infrastructure: cap v1 JSON at 10MiB/1000 questions, CSV at 5MiB/5000 rows; never execute spreadsheet formulas, reject archive bombs/unsupported schema version; expire unconfirmed sessions.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/assessment/assessment.service.ts](<../../server/src/modules/assessment/assessment.service.ts>)
- [server/src/modules/assignments/assignment.service.ts](<../../server/src/modules/assignments/assignment.service.ts>)
- [client/src/components/teacher/AssessmentBuilder.tsx](<../../client/src/components/teacher/AssessmentBuilder.tsx>)
- [client/src/components/teacher/AssignmentStudio.tsx](<../../client/src/components/teacher/AssignmentStudio.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
{"schemaVersion":1,"kind":"ASSESSMENT","title":{"ar":"اختبار","en":"Quiz"},"questions":[{"externalId":"q1","type":"SINGLE_CHOICE","prompt":{"ar":"..."},"points":1,"options":[{"id":"a","text":{"ar":"..."}},{"id":"b","text":{"ar":"..."}}],"correctOptionIds":["a"]}]}; POST /imports/im_1/commit {"expectedDraftVersion":4,"previewHash":"..."}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Uploader must own/assigned target draft and each referenced asset. Import never approves or publishes. Commit uses unique session ID, exact preview checksum, current actor and draft version; partial validation failure commits nothing. CSV exports escape formula-leading cells.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

No overwrite of published definitions/attempts. Imports append a new draft or explicit mapping to current draft; preserve external IDs within import namespace, not global destructive upsert. Rollback abandons uncommitted session or restores prior draft pointer, keeping audit.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-04-T01** — Valid all-five-type JSON and assignment rubric import yields editable draft; CSV supports objective bank questions with explicit template.
- **ENH-04-T02** — Row-level bad option IDs/score sums/locale/asset ownership/duplicate external IDs/unsupported version returns stable errors and zero writes.
- **ENH-04-T03** — Concurrent edit/commit, retry, expired session and Arabic/English preview/confirm flows preserve exact bytes reviewed.
- **ENH-04-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-04-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-04-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A35 uploader/import replacement passes with exact revision approval.
- [ ] Atomic commit and no-auto-publish proved by API/database tests.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
