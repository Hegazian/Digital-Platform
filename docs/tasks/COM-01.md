# COM-01 — Unify access decisions across all learning surfaces

| Field | Value |
|---|---|
| Stable ID | COM-01 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Commerce/access policy owner |
| Dependencies | [SEC-04](../archive/completed/M0/SEC-04.md), [COM-09](COM-09.md), [ENH-02](ENH-02.md) |
| Original finding / request | [COM-01 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / R:F06 |
| Acceptance links | [A11](../AUDIT_TRACEABILITY.md#a11) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[checkCourseAccess](<../../server/src/modules/commerce/commerce.service.ts>) only reads `Entitlement`, while the shared resolver also reads active `Subscription`. The player accepts a boolean false from this endpoint and never reaches its fallback. A paying subject subscriber can therefore see a paywall while the video/material services authorize access.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

AccessPolicy is the sole owner of effective learning decisions and audience membership across subscriptions, grants, purchases, bundles, vouchers and free enrollment.

Commerce/access policy owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: extend entitlement-resolver into a typed policy returning capability, reason, scope and effective expiry; replace checkCourseAccess and domain shortcuts.
2. Frontend: use per-lesson AccessDecision instead of a boolean false/fallback chain; distinguish preview, full, expired and unavailable.
3. Database: preserve Subscription and Entitlement history; add explicit free enrollment records and normalized policy queries, not destructive consolidation.
4. Configuration/infrastructure: evaluate effective time server-side; cache by user/auth/access/course version with bounded TTL, invalidate through durable events.
5. Integration: adapt media, assessment, assignment, discussion, download and roster consumers to the same resolver; audience queries must be equivalent to per-user decisions.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/commerce/commerce.service.ts](<../../server/src/modules/commerce/commerce.service.ts>)
- [server/src/modules/commerce/entitlement-resolver.service.ts](<../../server/src/modules/commerce/entitlement-resolver.service.ts>)
- [server/src/modules/videos/video.service.ts](<../../server/src/modules/videos/video.service.ts>)
- [client/src/components/VideoPlayerSection.tsx](<../../client/src/components/VideoPlayerSection.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
GET /api/v1/learning/courses/c_1/access -> {"data":{"courseId":"c_1","access":"FULL","source":"SUBSCRIPTION","validUntil":"2026-12-01T00:00:00Z","capabilities":["READ","ATTEMPT","DISCUSS"]}}
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Deny precedes allow for retraction/account disable; explicit preview is read-only. Owner/admin draft access is a separate studio capability, not a public entitlement. Use one captured now per decision/transaction; storage/DB uncertainty returns unavailable, not false ownership.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Keep legacy subscriptions and their original dates. Compare old/new decisions in an operator-only dry run, repair known mismatches, then switch all consumers together; no double-grants or reset expiry. Rollback retains strict protected delivery.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **COM-01-T01** — F06 active subject subscriber receives FULL in API/player/media/assessment/discussion and belongs to the roster.
- **COM-01-T02** — Test direct course, subject, grade bundle, voucher and free enrollments, overlapping and expired sources; unrelated student denied.
- **COM-01-T03** — Race revoke/access and inspect invalidation on two API instances; browser preview/full/paywall labels agree in both languages.
- **COM-01-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **COM-01-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **COM-01-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A11 parity matrix passes for every access source and consumer.
- [ ] No domain reimplements effective membership independently.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
