# SEC-13 — Consume refresh tokens atomically and define tab-race handling

| Field | Value |
|---|---|
| Stable ID | SEC-13 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **Planned** |
| Implementation owner | Identity concurrency |
| Dependencies | [SEC-10](SEC-10.md), [ENG-05](ENG-05.md) |
| Original finding / request | [SEC-13 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1: refresh-token consumption is not atomic [C] |
| Acceptance links | [A10](../AUDIT_TRACEABILITY.md#a10), [A33](../AUDIT_TRACEABILITY.md#a33) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current behavior and evidence

[auth.service.ts:232](<../../server/src/modules/auth/auth.service.ts>) reads `revokedAt` before the transaction, then revokes by ID without a `revokedAt: null` predicate. Two simultaneous refreshes can both observe a valid token and issue successors. Browser tabs can also race and trigger all-session revocation on later reuse. Use atomic conditional consumption, a session/family identifier, and an explicit concurrent-refresh policy. This requires real-database parallel tests; the current unit run does not prove the race absent.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

One refresh token creates at most one successor; ordinary tab races are recoverable without revoking unrelated sessions.

Identity concurrency owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: atomically claim token with revokedAt IS NULL and expected family/version; create successor in the same transaction with a unique parent reference.
2. Frontend: single-flight refresh in a tab plus Web Locks/BroadcastChannel coordination; losing tab retries with the newly installed cookie after a bounded conflict.
3. Database: add familyId, parentId uniqueness, consumedAt and compromise metadata; preserve hashed token storage.
4. Configuration/infrastructure: define immediate-race conflict window of 5 seconds: consumed token reuse in window returns 409 REFRESH_ALREADY_ROTATED without a successor; reuse later revokes only its family.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/auth/auth.service.ts](<../../server/src/modules/auth/auth.service.ts>)
- [client/src/lib/api.ts](<../../client/src/lib/api.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/auth/refresh -> 200 successor once; overlapping consumed token -> 409 REFRESH_ALREADY_ROTATED; proven later replay -> 401 SESSION_REVOKED for that family.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Conditional finding: first reproduce with real PostgreSQL barriers; do not label the race reproduced from source alone. Bounded serialization retries (max 3, jitter); no plaintext token persistence or replayable successor in logs.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Backfill each old token as a family or invalidate old sessions once. Keep hashes/revocation evidence until retention expiry. Rollback cannot restore nonconditional consumption; force login if schema compatibility is uncertain.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-13-T01** — 20 simultaneous refreshes yield one successor branch and no extra active child rows.
- **SEC-13-T02** — Two real browser tabs recover after 409; separate device family remains valid after compromised-family revocation.
- **SEC-13-T03** — DB timeout/429/503 preserves recoverable client state; Arabic/English retry and terminal messages differ.
- **SEC-13-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-13-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-13-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Real database concurrency establishes the outcome, with final row assertions.
- [ ] Family replay and benign tab races have distinct tested behavior.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
