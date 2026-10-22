# SEC-11 — Apply a consistent pending and rejected teacher policy

| Field | Value |
|---|---|
| Stable ID | SEC-11 |
| Priority | P1 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Platform engineering |
| Dependencies | [SEC-10](SEC-10.md) |
| Original finding / request | [SEC-11 original finding](../../../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1: rejected teachers can log in [R: F11] |
| Acceptance links | [A09](../../../AUDIT_TRACEABILITY.md#a09) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../../../CURRENT_STATUS.md), [implementation results and task disposition](../../reviews/M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../../reviews/M0_REVIEW_ROUND_2.md), and [manual checks](../../../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. The M0 engineering/containment deliverable is complete at **34723cd**, including the follow-up regressions. See [current verification](../../../CURRENT_STATUS.md), [first review](../../reviews/M0_REVIEW_RESOLUTION.md) and [second review](../../reviews/M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../../../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[auth.service.ts:118](<../../../../server/src/modules/auth/auth.service.ts>) blocks only PENDING teachers, not REJECTED teachers. A rejected fixture received a session. The approval middleware blocks some operations, but shared authenticated endpoints remain accessible. Define and enforce a consistent rejected-account policy in login, refresh, MFA completion, and authorization.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../../../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

PENDING and REJECTED teacher accounts cannot obtain a normal platform session; an explicit approval/status flow is separate from learning authorization.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../../../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../../../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: centralize accountCanAuthenticate and approvedTeacher predicates for login, refresh, MFA completion and protected calls.
2. Frontend: localize pending/rejected messaging and appeal/support contact without presenting a logged-in dashboard.
3. Database: approval decision stores reason, actual admin actor and authVersion change.
4. Configuration/infrastructure: rate-limit status/auth flows; prevent account enumeration outside a successful password/challenge proof.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/auth/auth.service.ts](<../../../../server/src/modules/auth/auth.service.ts>)
- [server/src/modules/auth/mfa.controller.ts](<../../../../server/src/modules/auth/mfa.controller.ts>)
- [server/src/modules/auth/auth.middleware.ts](<../../../../server/src/modules/auth/auth.middleware.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Correct credentials for REJECTED teacher -> 403 ACCOUNT_NOT_APPROVED after credential verification; no access/refresh cookie is issued.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../../../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

STUDENT and ADMIN policies remain explicit. Rejecting an already authenticated teacher revokes through SEC-10. Reapproval requires a new session; refresh cannot change approval implicitly.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory active rejected teacher sessions and revoke at rollout. Retain owned drafts and review history. Restoring account status is an audited admin action, not a seed update.

Follow [expand/backfill/verify/cutover](../../../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-11-T01** — Password login, refresh and MFA completion deny both PENDING/REJECTED teachers.
- **SEC-11-T02** — Approved teacher succeeds; rejection after challenge creation prevents completion.
- **SEC-11-T03** — Arabic/English approval/status UI never grants hidden authoring API access.
- **SEC-11-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-11-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-11-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] F11 no longer issues a normal session.
- [ ] All authentication entry points use the same account-state policy.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
