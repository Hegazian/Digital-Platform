# SEC-03 — Reject disguised active content and quarantine uploads

| Field | Value |
|---|---|
| Stable ID | SEC-03 |
| Priority | P0 |
| Release milestone | M0 — Scope and immediate safety |
| Status | **Complete** |
| Implementation owner | Upload security; ENH-03 owns worker scheduling |
| Dependencies | [SEC-02](SEC-02.md) |
| Original finding / request | [SEC-03 original finding](../../../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P0: allowed upload MIME can host active HTML/JavaScript on the app origin [R: F15] |
| Acceptance links | [A03](../../../AUDIT_TRACEABILITY.md#a03) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |

**M0 checkpoint evidence:** See [current verification](../../../CURRENT_STATUS.md), [implementation results and task disposition](../../reviews/M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../../reviews/M0_REVIEW_ROUND_2.md), and [manual checks](../../../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.


## Current delivery and next action

Updated **22 October 2026** against application commit **34723cd**. The M0 engineering/containment deliverable is complete at **34723cd**, including the follow-up regressions. See [current verification](../../../CURRENT_STATUS.md), [first review](../../reviews/M0_REVIEW_RESOLUTION.md) and [second review](../../reviews/M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed. The [remaining execution plan](../../../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

[assignment.routes.ts](<../../../../server/src/modules/assignments/assignment.routes.ts>) trusts client-supplied MIME, while [storage.ts](<../../../../server/src/utils/storage.ts>) retains the filename extension and static serving chooses the response type from that extension. Harmless `.html` and `.js` fixtures submitted as `application/pdf` were accepted with **201** and anonymously served as **text/html** and **text/javascript**.

This establishes an active-content hosting path and a stored-XSS risk when a user opens attacker-supplied material. Browser execution/exfiltration was not attempted. Validate actual file signatures and allowed extensions, generate server-owned names, scan/quarantine content, force attachment disposition where appropriate, and serve user content from a separate origin without application credentials. Existing MIME filters do not provide these guarantees.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../../../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Filename, declared MIME, detected signature and permitted purpose must agree before a file can become deliverable.

Upload security; ENH-03 owns worker scheduling owns this change. Shared implementation must use the owning tasks in the [ownership register](../../../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../../../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: centralize a bounded allowlist/signature validator; server-generate object keys; reject HTML/JS/SVG active content by default, traversal and mismatched extensions.
2. Frontend: present validation/quarantine status and localized actionable errors without trusting client checks.
3. Database: record detected media type, size, checksum and validation outcome with legacy-file quarantine mapping.
4. Configuration/infrastructure: scan in an isolated processing worker; serve untrusted downloads on a separate uncredentialed origin, nosniff and attachment disposition for non-inline-safe formats; fail closed when scanner unavailable.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/assignments/assignment.routes.ts](<../../../../server/src/modules/assignments/assignment.routes.ts>)
- [server/src/modules/materials/material.routes.ts](<../../../../server/src/modules/materials/material.routes.ts>)
- [server/src/modules/videos/video.routes.ts](<../../../../server/src/modules/videos/video.routes.ts>)
- [server/src/utils/storage.ts](<../../../../server/src/utils/storage.ts>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Upload PDF with filename="lesson.html", contentType="application/pdf" -> 422 VALIDATION_ERROR at file.type; scanner outage -> accepted quarantine record, never READY.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../../../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Apply identical validation to materials, submissions, receipts, import packages and caption files; only purpose-approved types differ. Never execute/parse unbounded archives in the API. Complete/finalize repeats do not bypass quarantine.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Scan existing uploaded assets and quarantine unknown/mismatched files without deleting student work. Allow an operator to recover verified files under new safe keys; rollback preserves quarantine and separate origin.

Follow [expand/backfill/verify/cutover](../../../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **SEC-03-T01** — Harmless .html/.js labeled PDF, invalid magic bytes, polyglots, double extensions and oversized files cannot become public/deliverable.
- **SEC-03-T02** — Valid Arabic-named PDFs and supported media survive scan; another user cannot complete or download the session.
- **SEC-03-T03** — Concurrent finalize/scanner retry publishes one state transition; browser content cannot execute in app origin.
- **SEC-03-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **SEC-03-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **SEC-03-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Spoofing probes now assert rejection/quarantine and no executable response.
- [ ] Scanner failure and historical-file remediation are observable.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
