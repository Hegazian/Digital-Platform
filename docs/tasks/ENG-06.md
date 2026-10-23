# ENG-06 — Make readiness, shutdown and storage outages honest

| Field | Value |
|---|---|
| Stable ID | ENG-06 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **In Progress** |
| Implementation owner | Reliability and deployment |
| Dependencies | None; start independently within the milestone gate. |
| Original finding / request | [ENG-06 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / R:F14/S |
| Acceptance links | [A38](../AUDIT_TRACEABILITY.md#a38) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. Implemented process-only /health/live and bounded /health/ready probes for PostgreSQL plus the selected storage backend; database/storage failure returns 503 with safe status-only dependency details, and shutdown marks readiness down before draining. Production requires explicit STORAGE_DRIVER=supabase and refuses local fallback; signal handling stops HTTP admission, drains connections to a deadline, then disconnects Prisma. Its 37-test/7-file focused suite passed with server typecheck and build, and exact-head Node 22 CI [39820430062](https://github.com/Hegazian/Digital-Platform/actions/runs/39820430062) passed all five checks for 34723cdded64a751b6a36c208a69421f4a57ac44. The repository has no durable job dispatcher yet; ENG-07 owns outbox/dispatch, and integration with a dispatcher remains open. Real Supabase outage, process-level signal rehearsal and browser outage UX remain open. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

`/health` returns HTTP 200 when the database is unavailable. [server.ts](<../../server/src/server.ts>) lacks graceful draining/shutdown. Storage errors silently fall back to local disk; a multi-instance deployment can lose or split uploads.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Liveness is separate from readiness; required dependency failure returns 503, graceful shutdown drains work and production storage cannot silently become local disk.

Reliability and deployment owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: add /health/live and /health/ready; probe DB, configured private storage and durable dispatch availability with deadlines; reject new commands while draining.
2. Frontend: surface retryable unavailability while preserving unsent user intent; never translate outage to missing entitlement.
3. Database: no fallback writes to memory; transaction outcomes remain authoritative.
4. Configuration/infrastructure: explicit STORAGE_DRIVER=filesystem only local/test and supabase in production; fail startup for missing production storage; SIGTERM stop readiness, drain HTTP/jobs, close Prisma/Redis then exit with bounded timeout.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/app.ts](<../../server/src/app.ts>)
- [server/src/server.ts](<../../server/src/server.ts>)
- [server/src/modules/health/health.service.ts](<../../server/src/modules/health/health.service.ts>)
- [server/src/modules/health/__tests__/health.spec.ts](<../../server/src/modules/health/__tests__/health.spec.ts>)
- [server/src/utils/storage.ts](<../../server/src/utils/storage.ts>)
- [server/src/utils/graceful-shutdown.ts](<../../server/src/utils/graceful-shutdown.ts>)
- [server/src/utils/__tests__/graceful-shutdown.spec.ts](<../../server/src/utils/__tests__/graceful-shutdown.spec.ts>)
- [server/src/utils/__tests__/storage-readiness.spec.ts](<../../server/src/utils/__tests__/storage-readiness.spec.ts>)
- [server/.env.example](<../../server/.env.example>)
- [docker-compose.yml](<../../docker-compose.yml>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
GET /health/live -> 200 {"status":"LIVE"}; GET /health/ready with DB down -> 503 {"status":"NOT_READY","draining":false,"dependencies":{"database":"unavailable","storage":"ready"}}; draining sets the readiness flag and public response omits internal connection details.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Health contains no secrets or internal hostnames; detailed probes admin/operator only. Storage outage never writes a new local fallback object. Use durable pending work/503 according to whether command committed.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory split local/cloud files before forbidding fallback and migrate via ENH-03. Keep recovery copies private. Rolling deploy readiness drains traffic; rollback retains explicit driver requirement.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-06-T01** — F14 database outage readiness is 503 while liveness stays live; recovery returns ready.
- **ENG-06-T02** — Supabase down or Redis dispatcher down preserves pending jobs and does not create local files.
- **ENG-06-T03** — SIGTERM during upload/commit/job, multi-instance reads and Arabic/English retry UI recover without false success.
- **ENG-06-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-06-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-06-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A38 outage/restart/drain tests pass.
- [ ] Production cannot enter implicit filesystem mode.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
