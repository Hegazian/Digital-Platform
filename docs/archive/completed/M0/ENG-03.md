# ENG-03 — Enforce server capability controls for staged features

| Field | Value |
|---|---|
| Stable ID | ENG-03 |
| Priority | P1 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Capability policy owner |
| Dependencies | None; start independently within the milestone gate. |
| Original finding / request | [ENG-03 original finding](../../../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A14](../../../AUDIT_TRACEABILITY.md#a14) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../../../CURRENT_STATUS.md), [implementation results and task disposition](../../reviews/M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../../reviews/M0_REVIEW_ROUND_2.md), and [manual checks](../../../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. The M0 engineering/containment deliverable is complete at **34723cd**, including the follow-up regressions. See [current verification](../../../CURRENT_STATUS.md), [first review](../../reviews/M0_REVIEW_RESOLUTION.md) and [second review](../../reviews/M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../../../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Teacher registration, course-approval, board, and playground flags are stored/displayed but not consistently enforced server-side. A hidden registration control does not disable its API.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../../../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Operational controls are checked at the service/API boundary and fail closed; approval-required teacher publication cannot be switched off.

Capability policy owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../../../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../../../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: introduce typed CapabilityPolicy and enforce teacher registration, gateway, board, code execution, developer integrations and future portal/offline/certificate paths before effects.
2. Frontend: fetch display capabilities and show unavailable states; UI flags are descriptive, never authority.
3. Database: version capability settings with actor/reason; immutable product invariant teacherApprovalRequired=true is not a configurable bypass.
4. Configuration/infrastructure: env hard-off overrides DB enable; unavailable policy fails closed for advanced commands; protected defaults and kill-switch tests in CI.
5. Safety: code execution requires ENH-15 isolated adapter, board requires ENH-14, providers COM-04, developer integrations ENG-12; a boolean alone cannot certify readiness.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/utils/env.ts](<../../../../server/src/utils/env.ts>)
- [server/src/modules/config/config.routes.ts](<../../../../server/src/modules/config/config.routes.ts>)
- [server/src/app.ts](<../../../../server/src/app.ts>)
- [client/src/lib/configStore.ts](<../../../../client/src/lib/configStore.ts>)
- [client/src/components/admin/PlatformSettings.tsx](<../../../../client/src/components/admin/PlatformSettings.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
CapabilityPolicy.require("CODE_EXECUTION", actor) -> 503 FEATURE_DISABLED before spawn; effective = hardOff ? false : approvedImplementation && configuredEnabled.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../../../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Admin cannot bypass disabled safety capability with an arbitrary body flag. Allow teacher-registration toggle only for new signups; existing approved teachers retain valid access. AI capability is removed, not a toggle.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Map legacy display flags to safe disabled defaults and preserve values in migration record. On unknown setting/version default disabled. Rollback keeps hard-off controls independent of config database.

Follow [expand/backfill/verify/cutover](../../../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-03-T01** — Direct APIs remain disabled when UI hidden, flags forged, policy unavailable or admin calls endpoint.
- **ENG-03-T02** — Teacher review cannot be disabled by old requireApproval=false config; valid admin self-publication remains possible.
- **ENG-03-T03** — Two API instances react to kill switch; Arabic/English unavailable UI matches returned capability.
- **ENG-03-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-03-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-03-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Every staged feature has API-boundary denial tests.
- [ ] A flag cannot enable an unimplemented or unsafe runtime path.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
