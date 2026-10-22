# SEC-01 — Replace known privileged seeds with safe provisioning

| Field | Value |
|---|---|
| Stable ID | SEC-01 |
| Priority | P0 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Identity and operations |
| Dependencies | [SCOPE-01](SCOPE-01.md) |
| Original finding / request | [SEC-01 original finding](../../../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P0: known privileged seed credential and password reset on every seed [S] |
| Acceptance links | [A06](../../../AUDIT_TRACEABILITY.md#a06) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../../../CURRENT_STATUS.md), [implementation results and task disposition](../../reviews/M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../../reviews/M0_REVIEW_ROUND_2.md), and [manual checks](../../../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. The M0 engineering/containment deliverable is complete at **d9c720f**, including the follow-up regressions. See [current verification](../../../CURRENT_STATUS.md), [first review](../../reviews/M0_REVIEW_RESOLUTION.md) and [second review](../../reviews/M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../../../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[seed.ts:11](<../../../../server/prisma/seed.ts>) contains a literal administrator password and identifiable administrator account. Its `upsert.update` resets that account's password and administrator role whenever seeding runs. Demo accounts also have fixed known passwords. No production guard prevents this seed from being run against a live database.

Remove privileged literals, separate safe reference-data seeding from demo users, require secure one-time administrator provisioning, and rotate the seeded credentials wherever used. Do not copy the credential into tickets or public reports. Check history and deployment usage before deciding whether history cleanup is necessary.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../../../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Reference-data seeding is safe in production; privileged accounts require explicit one-time provisioning and never receive a fixed/reset password from seed.

Identity and operations owns this change. Shared implementation must use the owning tasks in the [ownership register](../../../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../../../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: split reference seed and local demo fixture commands; production demo seeding must abort before writes.
2. Frontend: no new public admin registration; route setup invitations to existing secure account flow.
3. Database: use unique administrator identity provisioning with explicit operator input and bcrypt; existing users are never role/password-updated by reference seed.
4. Configuration/infrastructure: remove privileged literals, inventory deployment/history use, rotate affected live credentials and sessions through an operator runbook; keep secret values out of logs/docs.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/prisma/seed.ts](<../../../../server/prisma/seed.ts>)
- [server/create-admin.js](<../../../../server/create-admin.js>)
- [server/.env.example](<../../../../server/.env.example>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Reference seed result: {"createdReferenceRows":12,"usersModified":0}; demo command requires NODE_ENV=development and an explicit disposable database allowlist.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../../../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Only an authenticated operator with database provisioning authority can create an initial admin. Repeated reference seeds are idempotent; concurrent provisioning obeys unique identity constraints and does not overwrite an existing account.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Do not delete existing administrators. Record affected account IDs privately, force reset/revoke sessions if deployed, and retain an audit record. Rollback may restore reference data, never the old credential literal or seed password reset behavior.

Follow [expand/backfill/verify/cutover](../../../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-01-T01** — Run reference seed twice against a populated snapshot; assert every password hash and role unchanged.
- **SEC-01-T02** — Production demo/provision commands with missing secrets abort with zero user mutations; concurrent duplicate admin creation produces one account.
- **SEC-01-T03** — Login with pre-seed credentials still works only for unchanged legitimate accounts; published guides expose no password.
- **SEC-01-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-01-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-01-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] No known privileged password remains in tracked seed paths.
- [ ] Operator records credential remediation and safe repeated seeding evidence.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
