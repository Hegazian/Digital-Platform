# ENH-17 — Measure real educational, editorial and commercial outcomes

| Field | Value |
|---|---|
| Stable ID | ENH-17 |
| Priority | P2 |
| Release milestone | M3 — Paid release and operations |
| Status | **Planned** |
| Implementation owner | Analytics definitions and projections |
| Dependencies | [COM-10](COM-10.md), [LRN-03](LRN-03.md), [LRN-12](LRN-12.md), [LRN-05](LRN-05.md), [ENG-07](ENG-07.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A38](../AUDIT_TRACEABILITY.md#a38) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. The compatible main integration replaces estimated teacher revenue with paid order totals for COURSE products owned by that teacher. Subject/grade bundle revenue is deliberately unallocated until a reviewed attribution rule exists, avoiding double-counting shared subjects. This partial correction does not complete ledger reconciliation, refunds, editorial/learning metrics, or bilingual analytics acceptance. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Dashboards use defined deduplicated facts: final assessment evidence, actual learning progress, editorial review throughput and reconciled EGP payment/refund totals.

Analytics definitions and projections owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: publish versioned metric definitions and event schemas; derive payment facts only from ledger, learning from finalized attempts/progress, editorial from revision decisions.
2. Frontend: show metric period/timezone/as-of, exclusions, pending grades and source; no invented revenue or watch-time-equals-mastery claims.
3. Database: aggregate projections keyed by event/grade/revision version, outbox offset and reconciliation checkpoints; retain raw authoritative rows under approved retention.
4. Configuration/infrastructure: bounded daily incremental jobs + full rebuild comparison, late events/refunds/regrades handled, privacy cohort suppression and role-based dashboard scopes.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/admin/PlatformMetrics.tsx](<../../client/src/components/admin/PlatformMetrics.tsx>)
- [client/src/components/teacher/TeacherAnalytics.tsx](<../../client/src/components/teacher/TeacherAnalytics.tsx>)
- [server/src/modules/progress/progress.service.ts](<../../server/src/modules/progress/progress.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Metric={"name":"net_collected_minor","definitionVersion":1,"currency":"EGP","period":{"from":"...","to":"...","timeZone":"Africa/Cairo"},"value":150000,"asOf":"..."}; editorial median review duration from submittedAt to exact decision.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Teacher only own/assigned cohorts and approved financial scope; admin aggregates, students own progress. Suppress small cohorts per approved policy, never expose student answers in telemetry. Duplicate/reordered events recompute one fact per source/version.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Do not migrate fabricated historical estimates as real facts. Rebuild from ledger/grades/revisions, label unavailable periods explicitly and reconcile counts to sources. Rollback hides incorrect dashboard while preserving source data.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-17-T01** — Payments/refunds, duplicate events, grade pending/regrade, revision rejection/republication and multiple grant overlap produce expected metrics.
- **ENH-17-T02** — Cross-teacher/student scope and small-cohort privacy restrictions enforced at API.
- **ENH-17-T03** — Restart/rebuild matches incremental projection; Arabic/English Cairo period/EGP/date labels clear and no statistical overclaims.
- **ENH-17-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-17-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-17-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Every displayed metric links to a versioned definition and source reconciliation.
- [ ] No AI-production cost/generation metric remains in active product requirements.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
