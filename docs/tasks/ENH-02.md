# ENH-02 — Publish shared typed contracts and executable validation

| Field | Value |
|---|---|
| Stable ID | ENH-02 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Shared contract package owner |
| Dependencies | [ENG-05](ENG-05.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A01](../AUDIT_TRACEABILITY.md#a01) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

One versioned workspace package defines safe DTOs, command inputs, enums, validation and OpenAPI for existing Express and Next applications.

Shared contract package owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: introduce proposed packages/contracts with Zod input/output schemas and safe explicit serializers; keep Prisma private to server.
2. Frontend: replace divergent any/request types incrementally with inferred contract types and endpoint client wrappers.
3. Database: contract IDs map to existing schema; versioned discriminated JSON blocks/imports validated before writes; no need to expose database rows.
4. Configuration/infrastructure: add workspace/build resolution or equivalent local package linking without a framework rewrite; generate OpenAPI and compare compatibility in CI.
5. Contracts: implement C01–C10 register covering catalog/learning, files, revisions, assessments, imports, checkout/vouchers, taxonomy, progress and durable events.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/utils/schemas.ts](<../../server/src/utils/schemas.ts>)
- [server/src/utils/validate.ts](<../../server/src/utils/validate.ts>)
- [client/src/lib/apiTypes.ts](<../../client/src/lib/apiTypes.ts>)
- [client/src/lib/api.ts](<../../client/src/lib/api.ts>)
- [server/package.json](<../../server/package.json>)
- [client/package.json](<../../client/package.json>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
type ApiError={error:{code:string;messageKey:string;requestId:string;fields?:Array<{path:string;code:string}>}}; type CatalogCourse=z.infer<typeof CatalogCourseSchema>; server output parse forbids unexpected secret fields.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Input schemas strict, outputs allowlisted; no automatic widening from ORM fields. Breaking contract changes require adapter/deprecation except immediate security redactions. Shared policy verdicts remain server-owned, not trusted from client payload.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Adopt by vertical slice with old route adapters; record mapping and response changes. Preserve course/quiz/attempt IDs and never keep unsafe fields for compatibility. Rollback can use prior compatible package version with security fixes.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-02-T01** — Server/client contract compilation and HTTP response-schema tests pass for success/error paths.
- **ENH-02-T02** — Unknown fields, invalid nested IDs/dates/URLs/amounts/locale maps fail consistent validation.
- **ENH-02-T03** — No client bundle imports Prisma/server secrets; Arabic/English message keys and backward adapters validated.
- **ENH-02-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-02-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-02-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] One source of truth generates/types validates all named interfaces.
- [ ] CI catches DTO drift and secret-field leakage.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
