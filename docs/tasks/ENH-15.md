# ENH-15 — Move untrusted code to a separate isolated executor

| Field | Value |
|---|---|
| Stable ID | ENH-15 |
| Priority | P1 |
| Release milestone | M4 — Post-launch enhancements |
| Status | **Planned** |
| Implementation owner | Isolated executor security owner |
| Dependencies | [SEC-15](SEC-15.md), [ENG-07](ENG-07.md), [COM-01](COM-01.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A20](../AUDIT_TRACEABILITY.md#a20) |
| Release disposition | Post-launch; disabled at the API until this task and its enablement gate pass. |



## Current behavior and evidence

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Untrusted code executes only in a disposable isolated runtime without API/database/storage secrets, with resource and egress enforcement.

Isolated executor security owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: API validates exercise/access/language and enqueues bounded job; executor adapter accepts only signed internal job IDs and returns sanitized result.
2. Frontend: queued/running/timeout/cancel/result states and bounded stdout/stderr; no HTML execution of output.
3. Database: ExecutionJob(owner,exerciseVersion,language,status,limits,idempotencyKey) and result metadata; preserve source only under explicit retention policy.
4. Configuration/infrastructure: dedicated worker host/microVM or reviewed container isolation with nonroot/read-only base, ephemeral workdir, dropped capabilities, seccomp, no host socket/mounts, deny network, CPU/memory/PID/time/output quotas and full process-tree kill.
5. Security: pinned runtime images, artifact scanning, tenant isolation/no shared writable cache, independent credentials/queue scope and penetration/resource-exhaustion review before enabling.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/courses/playground.controller.ts](<../../server/src/modules/courses/playground.controller.ts>)
- [client/src/components/editor/CodePlaygroundBlock.tsx](<../../client/src/components/editor/CodePlaygroundBlock.tsx>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/executions {"exerciseVersionId":"ev_1","language":"python","source":"print(1)","clientJobId":"job_1"} -> 202 job; default limits 2s CPU, 5s wall, 128MiB memory, 16 processes, 64KiB output; unsupported languages rejected.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

No app-host subprocess path may remain as fallback. Access checked at enqueue/start/result; quotas per user/global. Jobs idempotent per actor/intent, cancel/timeout terminal and descendants killed. Executor cannot reach PG, metadata services or public internet.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve saved exercises as inert data, no replay of old submissions automatically. Rollback server flag off, stop admission, terminate running jobs, retain result/audit metadata and destroy ephemeral environments.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-15-T01** — Filesystem escape/network/metadata/fork/memory/output/time adversarial fixtures contained with no API secret access.
- **ENH-15-T02** — Cross-account job/result, duplicate enqueue and cancel/finish race correct; dead worker recovery cannot rerun side effects outside sandbox.
- **ENH-15-T03** — Arabic/English queued/error/output UI, resource alerts and clean environment destruction verified.
- **ENH-15-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-15-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-15-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Independent isolation review and operational kill-switch drill pass before enablement.
- [ ] General API/CI processes never execute untrusted source.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
