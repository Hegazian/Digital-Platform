# LRN-10 — Resume attempts from server deadlines and saved answers

| Field | Value |
|---|---|
| Stable ID | LRN-10 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [LRN-02](LRN-02.md), [LRN-04](LRN-04.md) |
| Original finding / request | [LRN-10 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A24](../AUDIT_TRACEABILITY.md#a24) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

[InteractiveQuizRunner:147](<../../client/src/components/player/InteractiveQuizRunner.tsx>) ignores the returned start time and sets a fresh local deadline. A resumed attempt appears to have a full duration although the server's deadline is earlier. State such as answers, question index, and result is not fully reset when the `quiz` prop changes.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Reload resumes one attempt/version, saved answers and authoritative expiresAt; switching identity cannot retain unrelated state.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: return serverNow/expiresAt/answerVersion/savedAnswers; add bounded idempotent answer autosave with expected version and deadline checks.
2. Frontend: derive countdown from server-clock offset, key state by actor/attempt/version, abort stale loads; autosave debounced with unsynced indicator and retry.
3. Database: persist answer revisions separately from frozen private questions; terminal attempts reject further edits.
4. Configuration/infrastructure: serialize autosave updates per attempt and bound payload/frequency; no answer key in optimistic client cache.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/player/InteractiveQuizRunner.tsx](<../../client/src/components/player/InteractiveQuizRunner.tsx>)
- [client/src/components/player/AssessmentRunner.tsx](<../../client/src/components/player/AssessmentRunner.tsx>)
- [server/src/modules/assessment/assessment.service.ts](<../../server/src/modules/assessment/assessment.service.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
PUT /api/v1/attempts/at_1/answers {"expectedAnswerVersion":4,"answers":{"qv_1":["opt_2"]}} -> {"data":{"answerVersion":5,"savedAt":"...","expiresAt":"...","serverNow":"..."}}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Only owner can autosave; late updates cannot extend server deadline. Conflicting devices get 409 and reload saved state with explicit user choice for unsaved changes; no silent stale overwrite.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Legacy attempts derive deadline only from trusted start/duration/close snapshot; mark uncertain legacy values for safe expiry/review. Do not reset duration on reopen. Rollback preserves saved server answers and terminal state.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-10-T01** — Start, answer, reload/resume keeps same expiresAt and saved answers despite incorrect local clock.
- **LRN-10-T02** — Switch quiz/lesson/course/account while slow request resolves: no old answers/index/result appears.
- **LRN-10-T03** — Concurrent device autosave/conflict, offline timeout and Arabic/English terminal countdown browser cases pass.
- **LRN-10-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-10-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-10-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A24 proves server deadline and state isolation.
- [ ] Unsynced answers are visible and recoverable within deadline.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
