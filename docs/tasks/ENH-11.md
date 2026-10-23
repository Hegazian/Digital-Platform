# ENH-11 — Establish minor consent now and stage a guardian portal

| Field | Value |
|---|---|
| Stable ID | ENH-11 |
| Priority | P1 |
| Release milestone | M3 — Paid release and operations |
| Status | **Planned** |
| Implementation owner | Product privacy and identity |
| Dependencies | [ENG-11](ENG-11.md), [ENH-16](ENH-16.md) |
| Original finding / request | [Revised enhancement scope](../PRODUCT_SCOPE.md) |
| Original evidence classification | Agreed scope/enhancement request; no defect reproduction claimed. |
| Acceptance links | [A42](../AUDIT_TRACEABILITY.md#a42) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Launch onboarding has a reviewed age/consent and data-minimization policy. A separately scoped guardian portal is M4 and remains disabled until implemented.

Product privacy and identity owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend launch: implement age-band/consent requirements approved by qualified local policy review; version consent text, responsible adult attestation where required and refusal/revocation path; make current studentNumber school/national identifier optional by default unless a documented necessary approved purpose requires it.
2. Frontend launch: Arabic/English plain-language student/guardian notices and support process; remove unnecessary required school/national identifier inputs.
3. Database: ConsentRecord(user,policyVersion,purpose,actor,proofReference,status,timestamps) with restricted access; avoid storing full birthdate if age band suffices and preserve/restrict existing identifiers pending retention review.
4. Configuration/infrastructure launch: gate real-minor pilot on policy approval, consent evidence, retention and incident support; no legal-compliance claim from code alone.
5. M4 portal: add scoped guardian role/link invitation, verified linkage approval/revocation, limited progress summaries and read-only access, never shared student credentials or answer/note access.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/src/modules/auth/auth.service.ts](<../../server/src/modules/auth/auth.service.ts>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [client/src/components/AuthModal.tsx](<../../client/src/components/AuthModal.tsx>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
POST /api/v1/consents {"policyVersion":"pv_1","purpose":"STUDENT_LEARNING","decision":"ACCEPT","attestationId":"..."}; POST /guardian/links -> 503 FEATURE_DISABLED at launch.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Policy decisions on age thresholds/legal basis require owner and qualified local review before real-minor onboarding; do not hardcode guessed law. Portal link must be verified and scoped per child; unlink takes effect on next access, parent role never grants teacher/admin authority.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Inventory existing minors/consent evidence; unknown consent is not backfilled accepted. Stage re-consent without deleting coursework and offer support/export. Rollback disables onboarding/portal for affected scope, preserves consent evidence securely.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENH-11-T01** — Launch required consent refusal/missing/withdrawn blocks dependent processing appropriately; data minimization checked.
- **ENH-11-T02** — M4 unverified guardian cannot claim arbitrary student; revoked link loses access and never exposes private notes/submission content beyond approved scope.
- **ENH-11-T03** — Arabic/English notice comprehension, concurrent link revoke/read, age transition and support workflow pass.
- **ENH-11-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENH-11-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENH-11-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] M3 minimal consent policy/evidence is approved before minor pilot.
- [ ] M4 guardian portal stays API-disabled until independent acceptance passes.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
