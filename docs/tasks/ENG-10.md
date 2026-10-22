# ENG-10 — Bound queries, shared rate limits and sensitive logging

| Field | Value |
|---|---|
| Stable ID | ENG-10 |
| Priority | P2 |
| Release milestone | M3 — Paid release and operations |
| Status | **Planned** |
| Implementation owner | Platform engineering |
| Dependencies | [SEC-04](../archive/completed/M0/SEC-04.md), [LRN-15](LRN-15.md), [ENG-07](ENG-07.md) |
| Original finding / request | [ENG-10 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P2 / S |
| Acceptance links | [A04](../AUDIT_TRACEABILITY.md#a04), [A38](../AUDIT_TRACEABILITY.md#a38) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Course catalog loads full nested lessons/questions/resources for up to 100 courses, and multiple list endpoints are unbounded. Memory cache/rate limits are per process despite Redis infrastructure. API request deadlines, per-user AI/media quotas, and load budgets are missing. Morgan request logs include query-string stream tokens.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Catalog and list workloads are bounded across instances; media quotas/deadlines and log redaction prevent avoidable cost/leaks.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: project metadata-only catalog, paginate all large lists and add endpoint budgets/request deadlines; remove query token logging and full sensitive body logs.
2. Frontend: cancel stale list requests and lazy-load editors/players; measure before optimizing bundle hotspots.
3. Database: inspect EXPLAIN on representative taxonomy/enrollment scale; add justified composite indexes and query timeout.
4. Configuration/infrastructure: use shared Redis-backed rate limit/cache with explicit outage policy, media quota reservation from ENH-03, redacted URL/path logger, per-route concurrency limits and load test budgets.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/utils/cache.ts](<../../server/src/utils/cache.ts>)
- [server/src/app.ts](<../../server/src/app.ts>)
- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)
- [docker-compose.yml](<../../docker-compose.yml>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Default list pageSize=20,max=50; 429 RATE_LIMITED with Retry-After; logger emits path=/assets/:id/delivery and requestId, never token/query signature; protected payloads private/no-store.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Rate keys combine user/action/IP as appropriate, never trust client actor header. Public reads may use conservative local fallback limits; security-sensitive creation fails closed if global quota state unavailable. No AI cost-budget requirement survives scope removal.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Preserve data while replacing caches; version keys/invalidate safely, avoid stale public protected responses. Deploy shared limiter in observe mode then enforce measured budgets; rollback never restores signed-token logging.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-10-T01** — Two API instances share limits; list endpoints cannot return unbounded nested lessons/questions.
- **ENG-10-T02** — Load on target dataset meets documented p95/error/memory budget; Redis outage follows declared fail policy.
- **ENG-10-T03** — Scan logs for query grants/tokens/receipts; Arabic/English slow-network pagination retries without duplicate data.
- **ENG-10-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-10-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-10-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Published load report includes dataset, concurrency and limits.
- [ ] Sensitive capabilities never appear in application/access logs.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
