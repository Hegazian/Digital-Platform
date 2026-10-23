# ENH-06 — Complete teacher/admin manual authoring from draft to publication

| Field | Value |
|---|---|
| Stable ID | ENH-06 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Authoring UX orchestration |
| Dependencies | [LRN-05](LRN-05.md), [LRN-06](LRN-06.md), [ENH-03](ENH-03.md), [ENH-04](ENH-04.md), [ENH-05](ENH-05.md), [LRN-16](LRN-16.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A19](../AUDIT_TRACEABILITY.md#a19), [A20](../AUDIT_TRACEABILITY.md#a20), [A32](../AUDIT_TRACEABILITY.md#a32), [A35](../AUDIT_TRACEABILITY.md#a35) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

An approved teacher or admin can manually build a complete course, upload/import content, preview, submit and resolve review without direct database edits.

Authoring UX orchestration owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: compose existing curriculum, assets, import and revision services through owned studio endpoints; autosave draft with ETag and explicit completeness report.
2. Frontend: coherent course/unit/lesson/block editor, asset library, assessment/assignment tools, locale tabs, rights metadata, reorder, preview and admin review diff.
3. Database: add only draft autosave metadata/editor assignment records not owned elsewhere; use stable IDs and ownerId vs actorId.
4. Configuration/infrastructure: protect editor routes/capabilities, instrument save failures and preserve unsaved local buffer per actor/draft; avoid storing private answer banks in global persistence.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/teacher/CourseManager.tsx](<../../client/src/components/teacher/CourseManager.tsx>)
- [client/src/components/teacher/AssessmentBuilder.tsx](<../../client/src/components/teacher/AssessmentBuilder.tsx>)
- [client/src/components/teacher/AssignmentStudio.tsx](<../../client/src/components/teacher/AssignmentStudio.tsx>)
- [client/src/components/admin/CourseApprovalQueue.tsx](<../../client/src/components/admin/CourseApprovalQueue.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
GET /api/v1/studio/courses/c_1/completeness -> {"data":{"revisionId":"r_1","canSubmit":false,"issues":[{"path":"lessons.l_1.blocks.b_1.assetId","code":"ASSET_NOT_READY"}]}}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Teacher owns/assigned content, admin manages all; every nested attach/reorder/clone checked server-side. Shared engines remain owned by LRN-05/ENH-03/ENH-04; this task owns orchestration and UI, not alternate revision/import implementations.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Retain existing teacher forms until replacement slice passes. Migrate draft autosave with stable IDs; recover unsaved edits visibly on reload, never restore another actor’s draft. Rollback keeps published version unchanged.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-06-T01** — Teacher creates manually edited course with uploaded video/PDF/text and imported assessment/assignment, submits, responds to change request and gets admin publication.
- **ENH-06-T02** — Unapproved/unassigned teacher, stale autosave, asset processing failure and foreign course reorder rejected.
- **ENH-06-T03** — Admin self-publication, bilingual missing text, interrupted save/reload and keyboard/mobile editor journeys pass.
- **ENH-06-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-06-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-06-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A20/A35 editor-to-published student journey needs no SQL/manual API workaround.
- [ ] Review UI displays exact version and failures preserve draft work.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
