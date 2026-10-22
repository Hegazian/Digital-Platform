# ENG-15 — Align capability claims, runbooks and software-license status

| Field | Value |
|---|---|
| Stable ID | ENG-15 |
| Priority | P2 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Documentation and product owner |
| Dependencies | [SCOPE-01](SCOPE-01.md) |
| Original finding / request | [ENG-15 original finding](../../../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P2 / S |
| Acceptance links | [A36](../../../AUDIT_TRACEABILITY.md#a36) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../../../CURRENT_STATUS.md), [implementation results and task disposition](../../reviews/M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../../reviews/M0_REVIEW_ROUND_2.md), and [manual checks](../../../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **d9c720f**. The M0 engineering/containment deliverable is complete at **d9c720f**, including the follow-up regressions. See [current verification](../../../CURRENT_STATUS.md), [first review](../../reviews/M0_REVIEW_RESOLUTION.md) and [second review](../../reviews/M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../../../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

README claims include encrypted HLS, a fully isolated playground, parent accounts, usable developer tokens/webhook delivery, and other capabilities absent from the implemented flows. The root MIT badge has no corresponding LICENSE file, while the server package declares ISC.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../../../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Documentation clearly separates prototype, planned launch and staged capabilities and does not claim a software license that the repository does not establish.

Documentation and product owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../../../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../../../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: inventory actual endpoints/env/scripts and remove unsupported implementation claims from server guide.
2. Frontend: document actual Next client commands and current production limitations; no encrypted-HLS/isolated-playground/guardian/developer-delivery claims without evidence.
3. Database: no schema migration; preserve previous requirements/FR/TC IDs in exact archived originals.
4. Configuration/infrastructure: make runbook match DIRECT_URL/test isolation/private storage/capability gates; link baseline checks and release evidence.
5. Licensing: withdraw unsupported MIT/ISC claims; keep source private and mark the server package private/UNLICENSED. Product/legal owner chooses the intended distribution license and scope before public source distribution; then add approved LICENSE and align manifests in a later reviewed implementation commit.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [README.md](<../../../../README.md>)
- [server/README.md](<../../../../server/README.md>)
- [client/README.md](<../../../../client/README.md>)
- [docs/README.md](<../../../README.md>)
- [docs/M0_MANUAL_TESTING.md](<../../../M0_MANUAL_TESTING.md>)
- [server/package.json](<../../../../server/package.json>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Capability register entry {"name":"automatedPayments","state":"STAGED","ownerTask":"COM-04","evidence":null}; licenseStatus="OWNER_DECISION_REQUIRED" until an approved license file exists.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../../../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Do not select MIT/ISC or provide legal conclusions on behalf of owner. License decision gates public distribution; private engineering progress continues. Documentation edits do not certify implemented functionality.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Archive old guides byte-for-byte with hashes and superseded status. Root entry points become accurate current navigation; old claims remain labeled historical. No deletion of prior evidence or silent rewrite of original FR/TC identifiers.

Follow [expand/backfill/verify/cutover](../../../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-15-T01** — All active docs link to revised mission, backlog, architecture, tests and operations.
- **ENG-15-T02** — Every implemented claim has source/baseline evidence; staged capabilities have server-denial task and no unqualified release claim.
- **ENG-15-T03** — Documentation validator confirms archived hashes and no false license badge; bilingual content/UI policy is unambiguous.
- **ENG-15-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-15-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-15-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Product owner can see what is implemented, planned and disabled.
- [ ] License ownership decision is explicit and pending until actually resolved.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
