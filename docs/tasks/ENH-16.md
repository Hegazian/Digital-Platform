# ENH-16 — Provide support and operational privacy/retention workflows

| Field | Value |
|---|---|
| Stable ID | ENH-16 |
| Priority | P1 |
| Release milestone | M3 — Paid release and operations |
| Status | **Planned** |
| Implementation owner | Support and privacy operations |
| Dependencies | [ENG-07](ENG-07.md), [ENH-05](ENH-05.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A38](../AUDIT_TRACEABILITY.md#a38), [A39](../AUDIT_TRACEABILITY.md#a39) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Students/teachers have human support and controlled data export/deletion; retention rules preserve necessary payment/audit evidence without indefinite unnecessary student data.

Support and privacy operations owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: support tickets with scoped attachments, privacy request identity verification, asynchronous export and deletion/anonymization plans with legal-hold exceptions.
2. Frontend: bilingual help/report/payment escalation, request status, downloadable private expiring export and explicit deletion consequences.
3. Database: SupportTicket/PrivacyRequest/RetentionPolicy/LegalHold and execution audit; separate educational drafts/submissions/notes/receipts/financial/audit retention classes.
4. Configuration/infrastructure: product/qualified local review approves retention durations/legal basis before real onboarding; scheduled dry-run deletion, job retries, backup expiry and incident response access process.
5. Operations: publish support hours/SLA/escalation and payment/refund/retraction procedures; test restore without resurrecting already-deleted data by replaying deletion ledger.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/auth/auth.routes.ts](<../../server/src/modules/auth/auth.routes.ts>)
- [server/src/modules/admin/admin.service.ts](<../../server/src/modules/admin/admin.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/StudentDashboard.tsx](<../../client/src/components/StudentDashboard.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/me/privacy-requests {"type":"EXPORT"} -> 202 requestId; DELETE request has verification/reasoned retained categories; export delivered as private asset grant to verified owner only.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Do not promise blanket erasure of legally retained payment evidence. Owner verification and recent auth before export/delete; support staff least privilege and actual actor audit. Jobs idempotent per request/item, failure visible and retryable, no partial false completion.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory existing personal data/storage/backups and ownership first. Approved retention version drives dry run, review, then execution; preserve evidence of actions with minimal identifiers. Rollback cannot restore deleted private data into active use without honoring deletion ledger.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-16-T01** — Student B/support without scope cannot obtain A export/receipts; expired export denied.
- **ENH-16-T02** — Delete/export concurrent activity, job crash/retry/legal hold and backup restore honor exact request state.
- **ENH-16-T03** — Arabic/English ticket/privacy flow, support escalation for failed payment and documented retention review pass.
- **ENH-16-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-16-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-16-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] M3 policy values and human support ownership approved before pilot.
- [ ] Export/deletion/retention/recovery drills have exact evidence and no invented legal guarantees.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
