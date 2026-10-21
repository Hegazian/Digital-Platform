# Implementation task template

Use one stable ID/file per task. All initial tasks are **Planned**. Link to an owning shared implementation rather than repeating an access/revision/asset/assessment engine. Preserve original findings and evidence uncertainty.

```text
# ID — Concrete outcome title

Metadata: stable ID, title, priority, milestone/subgate, status, implementation owner,
dependencies (stable task links), original finding/request, acceptance IDs,
launch versus staged disposition.

## Current behavior and evidence
Exact source locations and baseline/commit; R/S/C/G label; reproduce steps/results
or verification needed for conditional claim. Passing baseline is not task completion.

## Intended behavior and ownership boundary
Observable change; shared implementation owner/consumers; explicit exclusions.

## Ordered implementation changes
1. Backend policy/service/route changes.
2. Frontend typed state/forms/rendering/error/accessibility changes.
3. Database models/indexes/constraints/transactions and preservation.
4. Config/env/secrets/feature controls.
5. Infrastructure/workers/deployment/monitoring.
Provide real source paths; label proposed paths/models clearly. A layer with no
change must say why, rather than invent an unnecessary refactor.

## API/type/schema
Concrete valid success/error request/response or schema example; C01–C10 link;
validation/bounds/relationships/locales; compatibility/security field removals.

## Authorization/concurrency/idempotency/failure
Actor versus owner/assignment; current access; version/lock/unique key;
terminal/retryable outcomes, max retries, restart/dead-letter/manual recovery;
safe observability and no memory-only durable success.

## Migration/compatibility/rollback
Expand/backfill/verify/cutover/contract, original IDs/history preservation,
anomaly handling, prior clients/routes, immutable published/paid snapshots,
backup/rehearsal, safe rollback/forward fix. State no-data-change if applicable.

## Tests
ID-T01 positive normal journey with response and final durable state.
ID-T02 negative bounds/invalid relationship/unsupported state.
ID-T03 cross-account/role/approval/ownership matrix.
ID-T04 real DB concurrency, retries, stale versions and crash recovery.
ID-T05 Arabic/English, formatting/reload, browser/device/accessibility.
Additional migration/outage/compatibility/security tests as needed.
Explain genuinely inapplicable dimensions, never silently omit them.

## Observable acceptance and completion
- [ ] Desired behavior can be observed through actual API/UI, not mock success.
- [ ] Security/validation and negative/cross-account/concurrency cases pass.
- [ ] Both locales and applicable supported browsers/devices pass without skips.
- [ ] Migration/restore/rollback evidence and historic record counts preserved.
- [ ] Docs/contracts and consumers align, no duplicate engine/hidden feature bypass.
- [ ] Attach exact commit/environment/commands/test artifacts and review sign-off.
```

Statuses may later progress Planned → In progress → In review → Complete only with evidence. “Blocked” needs a concrete dependency/owner, not vague uncertainty. A staged task or subdeliverable stays incomplete until its enablement gate passes even if launch containment is done. Required release gates cannot be checked from this document-generation exercise.
