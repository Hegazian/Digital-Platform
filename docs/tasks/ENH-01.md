# ENH-01 — Model all Egyptian stages and versioned curriculum metadata

| Field | Value |
|---|---|
| Stable ID | ENH-01 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Academic registry owner |
| Dependencies | [ENG-05](ENG-05.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A32](../AUDIT_TRACEABILITY.md#a32), [A34](../AUDIT_TRACEABILITY.md#a34), [A41](../AUDIT_TRACEABILITY.md#a41) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Admin-configured stages, grades, tracks, academic years, terms, subjects, curriculum editions and learning outcomes cover all Egyptian school stages without hardcoded commercial tracks.

Academic registry owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: academic registry module owns stable codes and valid stage→grade→track/year/term/subject relationships; courses reference a coherent CurriculumEdition and explicit outcomes.
2. Frontend: cascading bilingual admin/teacher selectors with clear year/term edition; student school-stage selection remains optional where unnecessary for browsing.
3. Database: extend existing EducationalStage/Grade/AcademicYear/Subject, add Term/Track/CurriculumEdition/LearningOutcome and scoped join constraints; avoid a duplicate taxonomy.
4. Configuration/infrastructure: import admin-reviewed reference data with provenance/effective dates; do not scrape or assert official approval; archive referenced records rather than delete.
5. Validation: seed representative primary, preparatory, general secondary and configurable technical/other tracks; content availability may vary, but schema supports each without code changes.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/academic/academic.service.ts](<../../server/src/modules/academic/academic.service.ts>)
- [server/src/modules/courses/subject.service.ts](<../../server/src/modules/courses/subject.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/admin/AcademicStructureManager.tsx](<../../client/src/components/admin/AcademicStructureManager.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
CurriculumEdition={"id":"ce_1","stageId":"st_primary","gradeId":"g_6","trackId":null,"academicYearId":"ay_2026","termId":"term_1","subjectId":"math","edition":"uploader-declared","language":"AR"}; invalid grade/stage pair -> 422.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Admin manages taxonomy; approved teacher selects permitted references and proposes missing records for admin review. Stable code uniqueness scoped by parent/version; translated labels never serve as authorization keys. Concurrent reference updates use version checks.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Map existing grades/subjects/academicYear string IDs to verified FKs; retain IDs, pricing and grant associations. Ambiguous names generate resolution report, never merge by translated label alone. Snapshot older curriculum associations for historic progress.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-01-T01** — Create courses across multiple configured stages/years/terms/tracks; cross-stage invalid relation rejected.
- **ENH-01-T02** — Archive referenced edition does not delete purchased courses/progress or historical labels.
- **ENH-01-T03** — Arabic/English selector/search, admin duplicate races and migration rerun preserve all old course associations.
- **ENH-01-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-01-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-01-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] No Scientific-Math-only schema or fixed two-track catalog requirement remains.
- [ ] Curriculum metadata is educator-reviewed, versioned and traceable.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
