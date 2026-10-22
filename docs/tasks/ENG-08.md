# ENG-08 — Make public reads side-effect free and reference keys unique

| Field | Value |
|---|---|
| Stable ID | ENG-08 |
| Priority | P2 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [ENG-05](ENG-05.md), [ENH-01](ENH-01.md) |
| Original finding / request | [ENG-08 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P2 / S |
| Acceptance links | [A38](../AUDIT_TRACEABILITY.md#a38) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Public config uses find-first/create without a singleton constraint; public subject reads can seed defaults; careers reads rewrite default tracks and link subjects on every request. Dynamic subject find-or-create has no supporting case-insensitive unique constraint.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

GET config/subjects/careers never seeds or rewrites data; singleton/config and taxonomy uniqueness are enforced in the database.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: move default creation/linking to explicit seed/migration/admin command; GET projects current records only.
2. Frontend: show empty/setup-needed state instead of relying on public requests to initialize system.
3. Database: fixed AppConfig key=platform, unique normalized taxonomy codes, case-insensitive name keys only within declared scope; upsert backed by constraints.
4. Configuration/infrastructure: seed once per controlled release with dry-run/change summary, no request-time mutations or hidden career relinking.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/config/config.routes.ts](<../../server/src/modules/config/config.routes.ts>)
- [server/src/modules/courses/subject.service.ts](<../../server/src/modules/courses/subject.service.ts>)
- [server/src/modules/careers/careers.service.ts](<../../server/src/modules/careers/careers.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
GET /api/v1/config with no configured row -> safe read-only defaults/configured=false; explicit operator seed upserts key="platform". Subject code uniqueness scoped by curriculum taxonomy, not arbitrary global translated label.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Admin/reference-data command only; public GET under concurrency remains read-only. Duplicate-create conflicts return existing validated identity or 409, not uncontrolled rows. Shared taxonomy owner ENH-01 defines canonical codes.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Deduplicate config/taxonomy with mapping report and preserve course/student references before adding unique constraints. Never merge subjects merely because Arabic labels normalize similarly. Rollback retains canonical mappings and read-only GET.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-08-T01** — Parallel public reads have zero INSERT/UPDATE and one stable config response.
- **ENG-08-T02** — Case/code duplicates within scope rejected; legitimate same label across distinct stages/years preserved.
- **ENG-08-T03** — Explicit seed rerun idempotent, public Arabic/English empty/setup states pass.
- **ENG-08-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-08-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-08-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] No anonymous request changes defaults or career-subject links.
- [ ] All find-or-create paths have actual unique backing keys.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
