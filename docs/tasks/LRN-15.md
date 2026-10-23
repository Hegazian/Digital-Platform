# LRN-15 — Repair catalog routing, search, filters and pagination

| Field | Value |
|---|---|
| Stable ID | LRN-15 |
| Priority | P2 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [SEC-06](SEC-06.md), [ENH-01](ENH-01.md), [ENH-02](ENH-02.md) |
| Original finding / request | [LRN-15 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P2 / S/G |
| Acceptance links | [A41](../AUDIT_TRACEABILITY.md#a41) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[CourseCatalog:100](<../../client/src/components/CourseCatalog.tsx>) calls `/career-tracks`, while the API exposes `/careers`. It requests 200 courses but the backend caps the response at 100; there is no paging/search/filter UI. Teacher catalog queries ignore some supplied filters, so teachers can see their drafts in the public browsing view.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Public catalog finds configured Egyptian stages/grades/subjects/terms beyond the first page, using the supported /careers route where career filtering is relevant.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: typed bounded cursor query with stable sort and Arabic-aware indexed search; enforce public metadata projection/visibility in all filters.
2. Frontend: correct /career-tracks to /careers, add page/load-more, debounced search and stage/grade/subject/term/year filters; separate studio drafts from public browsing.
3. Database: indexes for taxonomy/publication/search and normalized search text preserving original Arabic spelling; unique tie-break ID for cursor.
4. Configuration/infrastructure: cap pageSize at 50, max 100 only for explicit admin export; cache public query variants safely and bound query timeout.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/CourseCatalog.tsx](<../../client/src/components/CourseCatalog.tsx>)
- [server/src/modules/courses/course.routes.ts](<../../server/src/modules/courses/course.routes.ts>)
- [server/src/modules/careers/careers.routes.ts](<../../server/src/modules/careers/careers.routes.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
GET /api/v1/courses?stageId=st_1&gradeId=g_1&termId=t_1&q=%D8%AC%D8%A8%D8%B1&pageSize=20&cursor=opaque -> {"data":[...CatalogCourse],"page":{"nextCursor":"opaque2","hasMore":true}}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Teacher browsing public catalog never receives their draft via a role exception. Cursor encodes validated sort/filter version, not raw SQL. Empty/error/loading states are distinct; query edits cancel stale requests.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve course IDs/URLs and current selected filters where valid; deprecated careers route can redirect to /careers without duplicating data. Rebuild search indexes without changing educational text.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-15-T01** — Seed >100 courses; known Arabic/English topic on late page is found without duplicates/skips.
- **LRN-15-T02** — Private/draft filters cannot reveal records; invalid cursor/filter/page size gets 422.
- **LRN-15-T03** — Browser network error, empty result, paging/filter reset and teacher public/studio separation pass both locales.
- **LRN-15-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-15-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-15-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A41 has seeded nonempty and late-page assertions.
- [ ] All-school taxonomy replaces hardcoded two-career discovery assumptions.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
