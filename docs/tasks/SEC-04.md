# SEC-04 — Separate public catalog DTOs from protected learning DTOs

| Field | Value |
|---|---|
| Stable ID | SEC-04 |
| Priority | P0 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Learning access; COM-01 owns the final shared policy |
| Dependencies | None; start independently within the milestone gate. |
| Original finding / request | [SEC-04 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P0: public course payload includes paid lesson content and storage paths [R: F02-F03] |
| Acceptance links | [A04](../AUDIT_TRACEABILITY.md#a04) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [implementation results and task disposition](../M0_IMPLEMENTATION_STATUS.md), [follow-up review fixes](../M0_REVIEW_RESOLUTION.md), and [manual checks](../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-13 keeps its broader release obligation In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current behavior and evidence

[course.service.ts:152](<../../server/src/modules/courses/course.service.ts>) includes full lesson text, videos, materials, quizzes, and block configurations before returning a public published course. The list endpoint also loads nested lesson resources. The sanitizer only removes selected answer fields; it does not check enrollment or redact protected resources. A client paywall cannot protect these API responses.

Split catalog metadata from authenticated learning delivery. Return only lesson titles/preview metadata from catalog endpoints. Enforce access before serializing each protected lesson/resource, including non-video text and blocks.

Evidence is tied to baseline commit **2fbdc8e**, 21 October 2026. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Public reads expose curated discovery metadata; protected lesson bodies, blocks, assessment content and asset grants are serialized only after an explicit access decision.

Learning access; COM-01 owns the final shared policy owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: build allowlisted CatalogCourse/CatalogLesson serializers; add protected learning delivery service and strip nested resources from list/detail/section/collection routes.
2. Frontend: fetch catalog and learning separately; remove reliance on protected resources preloaded in catalog payloads.
3. Database: project selected columns and bounded lesson summaries; no destructive schema change for the immediate fix.
4. Configuration/infrastructure: purge old public response caches, set protected responses private/no-store and add response-schema security tests.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/courses/course.service.ts](<../../server/src/modules/courses/course.service.ts>)
- [server/src/modules/courses/course.routes.ts](<../../server/src/modules/courses/course.routes.ts>)
- [server/src/modules/collections/collection.service.ts](<../../server/src/modules/collections/collection.service.ts>)
- [client/src/components/VideoPlayerSection.tsx](<../../client/src/components/VideoPlayerSection.tsx>)
- [client/src/lib/apiTypes.ts](<../../client/src/lib/apiTypes.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
GET /api/v1/courses/c_1 -> {"data":{"id":"c_1","title":{"ar":"رياضيات"},"lessons":[{"id":"l_1","title":{"ar":"الجبر"},"isPreview":false}]}}; GET /api/v1/learning/lessons/l_1 -> 403 ACCESS_REQUIRED without a grant.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Catalog never returns text bodies, block configs, raw object keys, live host links or question keys, including for an authenticated teacher browsing public routes. Learning policy initially denies safely; COM-01 extends access-source parity. Preview delivery is explicit under LRN-09.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Version unsafe clients to new DTOs; do not preserve leaked fields as compatibility. Keep legacy lesson IDs and catalog URLs. If rollout fails, disable protected reads and repair clients rather than re-expose nested resources.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-04-T01** — Recursively inspect list/detail/sections/collections across guest/student/unrelated teacher/admin public browsing for forbidden fields.
- **SEC-04-T02** — Entitled learning response supplies required content; unauthorized IDs and draft sibling content are denied.
- **SEC-04-T03** — Two users through the same cache never receive each other’s learning payload; Arabic/English catalog remains usable.
- **SEC-04-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-04-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-04-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A04 has allowlist assertions and source query projection.
- [ ] Direct API calls cannot bypass the visual paywall.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
