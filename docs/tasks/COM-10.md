# COM-10 — Use effective audiences and real ledger metrics

| Field | Value |
|---|---|
| Stable ID | COM-10 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Audience projection; ENH-17 owns analytics expansion |
| Dependencies | [COM-01](COM-01.md), [COM-06](COM-06.md) |
| Original finding / request | [COM-10 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A11](../AUDIT_TRACEABILITY.md#a11), [A30](../AUDIT_TRACEABILITY.md#a30) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[teacher.service.ts](<../../server/src/modules/teacher/teacher.service.ts>) counts subject entitlements for rosters/announcements but omits normal subscriptions, direct course purchases, and grade bundles. The course dashboard counts direct course entitlements instead. Revenue is fabricated as `students.length * 1500`.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Rosters, announcements and teacher summaries include the same deduplicated active audience; revenue is derived from auditable actual payments/refunds.

Audience projection; ENH-17 owns analytics expansion owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: replace subject-entitlement-only and direct-course-only queries with AccessPolicy audience projection; remove students*1500 revenue.
2. Frontend: display eligible student count with definition/as-of time; hide unavailable revenue rather than estimate it.
3. Database: add audience projection indexes/views as needed; financial figures query COM-06 ledger and avoid multiplying by overlapping grants.
4. Configuration/infrastructure: refresh projection from durable grant/lifecycle events and reconcile against authoritative decisions; bound lag and display timestamp.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/teacher/teacher.service.ts](<../../server/src/modules/teacher/teacher.service.ts>)
- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)
- [client/src/components/teacher/TeacherAnalytics.tsx](<../../client/src/components/teacher/TeacherAnalytics.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
TeacherSummary={"courseId":"c_1","activeLearners":42,"asOf":"...","collectedMinor":300000,"refundedMinor":150000,"currency":"EGP"}; no fabricated revenue field.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Only owner/assigned teacher/admin sees a course roster. Aggregates do not grant access or expose unrelated minors. ENH-17 owns wider analytics/event definitions; this task owns replacing faulty roster/revenue consumers.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve historical enrollment/payment records; rebuild projections from authoritative sources, compare counts and investigate differences. Do not copy fabricated values into a ledger. Rollback may hide metrics, never restore estimates.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-10-T01** — Subscription/direct/subject/bundle/voucher/free users appear once; expired/future/revoked users excluded.
- **COM-10-T02** — Teacher B cannot see A roster or financial details; overlapping grants do not duplicate recipients or revenue.
- **COM-10-T03** — Concurrent revoke/send audience snapshot and late projection reconciliation tested; both locales label metric definitions.
- **COM-10-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-10-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-10-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A11 audience parity and A30 recipient counts pass.
- [ ] Displayed revenue reconciles to ledger or is explicitly unavailable.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
