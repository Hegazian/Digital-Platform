# SCOPE-02 — Remove AI tutoring, generation and provider dependencies

| Field | Value |
|---|---|
| Stable ID | SCOPE-02 |
| Priority | P0 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Platform engineering |
| Dependencies | [SCOPE-01](SCOPE-01.md), [ENG-03](ENG-03.md) |
| Original finding / request | [Agreed product direction](../../../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A36](../../../AUDIT_TRACEABILITY.md#a36) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../../../CURRENT_STATUS.md), [implementation results and task disposition](../../reviews/M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../../reviews/M0_REVIEW_ROUND_2.md), and [manual checks](../../../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. The M0 engineering/containment deliverable is complete at **34723cd**, including the follow-up regressions. See [current verification](../../../CURRENT_STATUS.md), [first review](../../reviews/M0_REVIEW_RESOLUTION.md) and [second review](../../reviews/M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../../../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../../../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Remove tutor UI, route mounting, SDK, configuration, fabricated fallback answers and active claims; retain only uploader-created educational content.

Platform engineering owns this change. Shared implementation must use the owning tasks in the [ownership register](../../../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../../../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: remove AI controllers/routes/provider calls; retain a temporary explicit 410 tombstone at the legacy tutor endpoint without processing prompts.
2. Frontend: remove drawer, launch buttons, imports, state, API helpers and tutor-specific strings; show no replacement answer.
3. Database: inventory provider/prompt artifacts before deletion; no destructive user-content purge; apply approved retention via ENH-16.
4. Configuration/infrastructure: remove GEMINI_API_KEY and AI provider startup checks, CI secrets and SDK lockfile entries; coordinate secret revocation with operators after confirming usage.
5. Tests: replace nonempty-answer smoke assertions with no exposed tutor and no provider network calls; remove generation roadmap requirements while keeping historical reports.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/app.ts](<../../../../server/src/app.ts>)
- [server/package.json](<../../../../server/package.json>)
- [server/package-lock.json](<../../../../server/package-lock.json>)
- [server/.env.example](<../../../../server/.env.example>)
- [server/src/modules/ai/__tests__/ai.integration.spec.ts](<../../../../server/src/modules/ai/__tests__/ai.integration.spec.ts>)
- [client/src/app/layout.tsx](<../../../../client/src/app/layout.tsx>)
- [client/src/components/VideoPlayerSection.tsx](<../../../../client/src/components/VideoPlayerSection.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/ai/tutor (existing legacy route) -> 410 {"error":{"code":"CAPABILITY_REMOVED","messageKey":"capability.removed","requestId":"req_1"}}
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../../../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

No role, feature flag or direct endpoint may re-enable the removed capability. Tombstone must not echo prompts or contact providers. Upload processing may validate/transcode/extract thumbnails but never creates teaching text, translations, narration or captions.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory references with rg before removal; preserve authored courses and uploaded files. Keep a short compatibility tombstone through one published deprecation period, then remove it. Rollback must not restore a known exposed tutor; redeploy the patched API with the tombstone if UI removal fails.

Follow [expand/backfill/verify/cutover](../../../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SCOPE-02-T01** — Anonymous/student/teacher/admin direct calls receive 410 or removed-route 404 with zero provider requests.
- **SCOPE-02-T02** — Clean server/client installs and builds succeed without the provider SDK or key.
- **SCOPE-02-T03** — Arabic/English browser player contains no tutor entry point; uploaded lessons and quizzes continue to render.
- **SCOPE-02-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SCOPE-02-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SCOPE-02-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] No executable AI provider reference, fallback answer, credential requirement or tutor UI remains.
- [ ] Historical AI recommendations are explicitly withdrawn and A34–A37 replacements pass.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
