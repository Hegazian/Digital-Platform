# SEC-14 — Complete secure MFA enrollment and recovery

| Field | Value |
|---|---|
| Stable ID | SEC-14 |
| Priority | P2 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [SEC-10](../archive/completed/M0/SEC-10.md), [ENG-05](ENG-05.md) |
| Original finding / request | [SEC-14 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P2: MFA enrollment, storage, recovery, and replay handling are incomplete [S/C/G] |
| Acceptance links | [A10](../AUDIT_TRACEABILITY.md#a10) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. The M0 integration exposes initial MFA enrollment in the profile but refuses replacement of an already enabled factor with HTTP 409. Opening or cancelling setup cannot disable an existing authenticator. Initial setup uses a conditional write against disabled MFA. Pending-factor replacement, secret encryption, replay/verification races, recovery and full session atomicity remain owned by this task; the availability guard is not a completed factor-replacement workflow. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

MFA secrets are stored directly in the user row. Re-enrollment sets `mfaEnabled: false` before the new factor is confirmed. There is no implemented backup-code or account recovery flow despite README claims. [totp.ts](<../../server/src/utils/totp.ts>) performs replay protection as a separate read then update, allowing a potential concurrent-use race. Stage pending enrollment separately, encrypt secrets with managed keys, implement recovery, and consume time steps atomically.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

New factor enrollment cannot disable an existing factor; secrets are encrypted and recovery/replay handling is atomic.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: require recent authentication; stage pending secret until proof, atomically consume TOTP timestep, issue hashed one-use recovery codes and audited factor-reset flow.
2. Frontend: retain existing enabled state during enrollment, display backup codes once, require confirmation and safe cancellation.
3. Database: separate pending/active encrypted secrets, key version, last accepted timestep and hashed recovery-code rows.
4. Configuration/infrastructure: provision managed encryption key and rotation procedure separate from JWT secrets; redact codes/QR payloads.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/auth/mfa.controller.ts](<../../server/src/modules/auth/mfa.controller.ts>)
- [server/src/utils/totp.ts](<../../server/src/utils/totp.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/settings/MfaSetupModal.tsx](<../../client/src/components/settings/MfaSetupModal.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/auth/mfa/enroll -> {"data":{"enrollmentId":"me_1","expiresAt":"...","setupUri":"<shown once>"}}; confirm includes enrollmentId and code; replay -> 409 CODE_ALREADY_USED.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Conditional TOTP race requires parallel DB proof. Re-enroll failure leaves active MFA working. Recovery code consumption uses conditional update; password proof plus rate limits required for sensitive changes.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Encrypt existing secrets in a controlled migration, verify decrypt capability before replacing columns, preserve MFA enabled status. Backup encrypted keys separately; key-loss recovery requires audited verified identity, never silently disable MFA.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-14-T01** — Reenroll/cancel/timeout keeps old factor valid; confirmed replacement invalidates it.
- **SEC-14-T02** — Parallel same TOTP/recovery code accepts once; unauthorized user cannot disable another factor.
- **SEC-14-T03** — Arabic/English keyboard enrollment/recovery browser journey and lost-key runbook drill pass.
- **SEC-14-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-14-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-14-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] No plaintext factor or backup code persists.
- [ ] Enrollment and one-use replay invariants survive restart and concurrent requests.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
