# ENH-13 — Offer rights-controlled expiring offline study packs

| Field | Value |
|---|---|
| Stable ID | ENH-13 |
| Priority | P2 |
| Release milestone | M4 — Post-launch enhancements |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [ENH-03](ENH-03.md), [COM-01](COM-01.md), [LRN-05](LRN-05.md), [ENH-16](ENH-16.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A02](../AUDIT_TRACEABILITY.md#a02), [A42](../AUDIT_TRACEABILITY.md#a42) |
| Release disposition | Post-launch; disabled at the API until this task and its enablement gate pass. |



## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Authorized students may cache explicitly licensed published study content with bounded lease, quotas and clear limits on offline revocation.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: pack manifest pins course revision/assets, rights policy, user/device scope and lease end=min(access end, issue+24h) by default; never include keys/host links or unsafe assessments.
2. Frontend: service worker/IndexedDB pack manager, storage estimate, download/cancel/delete, expiry/revalidate and accessible offline state.
3. Database: OfflineLease/PackManifest version plus device quota and delivery audit; store no reusable provider service credentials.
4. Configuration/infrastructure: staged gate and explicit rights opt-in; sign manifests, protect content transit, handle lost device and revoke at next online check; explain that downloaded bytes cannot be reliably recalled.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/components/VideoPlayerSection.tsx](<../../client/src/components/VideoPlayerSection.tsx>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/offline/packs {"courseId":"c_1","revisionId":"r_1","lessonIds":["l_1"]} -> {"data":{"manifestId":"op_1","expiresAt":"...","requiresOnlineRenewal":true}}.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

No promise of perfect DRM. Server grants bounded lease only after current access/rights check; cached assessment grading keys excluded. Logout/account switch clears accessible cache namespace; revoked/retracted pack blocked on next online validation and expiry enforced locally within stated limits.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

New tables/cache only; no migration of old private URLs into permanent public files. Preserve server progress and reconcile bounded queued study events through LRN-12. Rollback stops issuance and offers delete/revalidate, keeps lease audit.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-13-T01** — No-rights/expired/nonmember requests denied; pack excludes keys and private unrelated assets.
- **ENH-13-T02** — Interrupted download/resume, quota full, corrupted manifest, offline expiry and online retraction correct.
- **ENH-13-T03** — Arabic/English low-connectivity Android/iOS study, account switch/cache cleanup and sync retry pass.
- **ENH-13-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-13-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-13-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] M4 rights/security review accepts stated offline limits.
- [ ] No permanent public URL or unbounded entitlement is created.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
