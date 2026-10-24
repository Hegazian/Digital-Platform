# ENH-09 — Provide deterministic mastery and revision practice

| Field | Value |
|---|---|
| Stable ID | ENH-09 |
| Priority | P2 |
| Release milestone | M4 — Post-launch enhancements |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [LRN-03](LRN-03.md), [LRN-12](LRN-12.md), [ENH-01](ENH-01.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A26](../AUDIT_TRACEABILITY.md#a26), [A28](../AUDIT_TRACEABILITY.md#a28) |
| Release disposition | Post-launch; disabled at the API until this task and its enablement gate pass. |



## Current delivery and next action

Updated **24 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Outcome mastery and revision queues are explainable rules over final assessment evidence, never AI recommendations or watch-time claims.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: version mastery rules with explicit evidence weights/thresholds and deterministic due-date spacing; only finalized eligible question grades count.
2. Frontend: show outcome evidence, rule version, weak topics and next teacher-provided practice; distinguish incomplete/pending from zero mastery.
3. Database: OutcomeEvidence keyed by attempt/question/gradeVersion and MasterySnapshot/ruleVersion; preserve historic snapshots and support replay after regrade.
4. Configuration/infrastructure: staged gate, outbox-driven recalculation and reconciliation, educator validates thresholds and exercise mapping before enablement.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/progress/progress.service.ts](<../../server/src/modules/progress/progress.service.ts>)
- [client/src/components/StudentDashboard.tsx](<../../client/src/components/StudentDashboard.tsx>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Mastery={"outcomeId":"lo_1","ruleVersion":1,"state":"DEVELOPING","evidenceCount":3,"score":0.6,"nextRevisionAt":"..."}; published rule v1 requires >=3 finalized questions and mean normalized score >=0.8 for MASTERED.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Student sees own records only; reviewer/admin sees permitted aggregate. Regrade removes old evidence by gradeVersion and recomputes idempotently. Videos watched never imply concept mastered; no fabricated predictions.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Backfill only reliable finalized grades with mapped outcomes; unknown legacy evidence excluded explicitly. Rule changes generate new snapshot versions, do not rewrite original grades. Rollback selects previous rule snapshot.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-09-T01** — Same evidence yields same score/queue, pending essays excluded and regrade replay updates once.
- **ENH-09-T02** — No access to another student or unavailable practice; missing outcome gives INSUFFICIENT_EVIDENCE.
- **ENH-09-T03** — Arabic/English explanation, clock boundary and parallel recalculation/retry remain deterministic.
- **ENH-09-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-09-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-09-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Educator signs off rule examples and educational limitations.
- [ ] M4 launch flag enabled only after deterministic replay tests.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
