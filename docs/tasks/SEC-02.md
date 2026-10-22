# SEC-02 — Close raw-file bypasses with authorized private delivery

| Field | Value |
|---|---|
| Stable ID | SEC-02 |
| Priority | P0 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Asset security; ENH-03 owns the final media library |
| Dependencies | [SEC-04](SEC-04.md) |
| Original finding / request | [SEC-02 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P0: private and paid files bypass authorization through static hosting [R: F01] |
| Acceptance links | [A02](../AUDIT_TRACEABILITY.md#a02), [A22](../AUDIT_TRACEABILITY.md#a22) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../CURRENT_STATUS.md), [implementation results and task disposition](../M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../M0_REVIEW_ROUND_2.md), and [manual checks](../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. The M0 engineering/containment deliverable is complete at **d9c720f**, including the follow-up regressions. See [current verification](../CURRENT_STATUS.md), [first review](../M0_REVIEW_RESOLUTION.md) and [second review](../M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[app.ts:72](<../../server/src/app.ts>) serves the entire uploads root without authentication. A local video fixture returned **HTTP 200 anonymously** despite the existence of a separate signed streaming endpoint. Materials and student submission files share the same public namespace. Cloud lesson materials also use public URLs in [storage.ts](<../../server/src/utils/storage.ts>).

Move protected assets to private storage, remove the catch-all public upload mount, and issue narrowly scoped download/playback grants after checking the requesting user's access. Student submissions need student/assigned-grader authorization. Filename obscurity is insufficient.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Every existing protected file requires the same learning/submission/receipt policy as its parent resource, including legacy local paths and cloud objects.

Asset security; ENH-03 owns the final media library owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: remove catch-all express.static uploads and public-URL issuance; add protected legacy resource-ID adapters that resolve policy before streaming/signing.
2. Frontend: request short-lived delivery grants rather than concatenate upload URLs; handle expiry by requesting a new grant.
3. Database: inventory existing files and ownership mappings; maintain old resource-ID mapping until ENH-03 migrates references to asset IDs.
4. Configuration/infrastructure: make educational buckets private, deny public aliases, protect local root outside static/proxy paths; use a storage canary before enabling traffic.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/app.ts](<../../server/src/app.ts>)
- [server/src/utils/storage.ts](<../../server/src/utils/storage.ts>)
- [server/src/modules/videos/video.service.ts](<../../server/src/modules/videos/video.service.ts>)
- [server/src/modules/materials/material.service.ts](<../../server/src/modules/materials/material.service.ts>)
- [server/src/modules/assignments/assignment.service.ts](<../../server/src/modules/assignments/assignment.service.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/assets/asset_1/delivery {"purpose":"INLINE"} -> {"data":{"assetId":"asset_1","url":"<short-lived capability>","expiresAt":"2026-11-01T10:02:00Z"}}
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Students: entitled published lesson, own submission/receipt only. Teacher: owner/assigned grader. Admin: audited access. Default download grant TTL is at most 120 seconds and bounded by access expiry; retraction denies new grants. Strictly immediate revocation requires the policy-checking proxy described in C03.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory/checksum first, dual-read only through protected adapters, cut off all old public paths before release. Historical URLs must not remain a security compatibility path. Storage outage fails 503, never local public fallback; restore private object backups if migration fails.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-02-T01** — Anonymous and another student cannot GET known raw video/material/submission/receipt paths; entitled and assigned-grader grants succeed.
- **SEC-02-T02** — Expired/revoked grant, archived purchased access, retracted course and proxy/cache behavior follow C02/C03.
- **SEC-02-T03** — Arabic/English browser playback/download works after token expiry without exposing bucket public URLs.
- **SEC-02-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-02-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-02-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] No local or Supabase public alias bypasses policy.
- [ ] Cross-account file tests and direct-origin canary pass.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
