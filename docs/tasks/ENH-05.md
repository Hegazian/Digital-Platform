# ENH-05 — Track content provenance, permissions and correction reports

| Field | Value |
|---|---|
| Stable ID | ENH-05 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Content provenance and issue owner |
| Dependencies | [LRN-05](LRN-05.md), [ENH-01](ENH-01.md), [ENH-03](ENH-03.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A34](../AUDIT_TRACEABILITY.md#a34), [A37](../AUDIT_TRACEABILITY.md#a37) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Published uploaded content has uploader-declared source/edition/page/outcome and permission evidence; students can report errors against exact published revisions.

Content provenance and issue owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: proposed provenance service records SourceRecord/ContentCitation/PermissionRecord and ContentIssue; publication requires rights declaration and adequate metadata, never infers permission from a public URL.
2. Frontend: teacher source/rights editor and admin review, student report-content-error with category/location and private follow-up.
3. Database: source owner vs acting uploader, checksum, source URL/edition/year/language/pages, license/permission evidence asset and revision links; correction/retraction history.
4. Configuration/infrastructure: moderate reports, notify responsible editors/admin through durable events and maintain private permission documents; no automatic source extraction/generation requirement.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/teacher/CourseManager.tsx](<../../client/src/components/teacher/CourseManager.tsx>)
- [client/src/components/VideoPlayerSection.tsx](<../../client/src/components/VideoPlayerSection.tsx>)
- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
ContentIssue={"revisionId":"r_1","lessonId":"l_1","blockId":"b_1","category":"FACTUAL_ERROR","description":"..."}; SourceRecord={"edition":"2026","pages":[12,13],"permissionBasis":"WRITTEN_PERMISSION","evidenceAssetId":"a_rights"}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Students report only accessible published content; cannot see private rights files or other reporters. Reviewer resolves with reason and replacement revision reference; retraction emergency uses COM-09. Concurrent duplicate reports can link, never delete evidence.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Existing source/rights gaps marked UNKNOWN and require editorial review before pilot; do not manufacture permissions. Preserve original uploads and issue links through revisions. Rollback cannot discard unresolved rights/error reports.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-05-T01** — Upload metadata/rights required for publication, missing evidence blocks approval; public URL alone insufficient.
- **ENH-05-T02** — Student error report links exact old revision after correction; unrelated account cannot read reporter/rights data.
- **ENH-05-T03** — Arabic/English pages/citations/report form and concurrent resolve/reopen workflow retain audit history.
- **ENH-05-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-05-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-05-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A34 human-upload provenance replacement passes.
- [ ] Correction workflow never mutates a published revision in place.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
