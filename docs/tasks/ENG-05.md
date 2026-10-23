# ENG-05 — Introduce versioned migrations and upgrade verification

| Field | Value |
|---|---|
| Stable ID | ENG-05 |
| Priority | P1 |
| Release milestone | M1 — Foundation and content delivery |
| Status | **In Progress** |
| Implementation owner | Database migrations and operations |
| Dependencies | None; start independently within the milestone gate. |
| Original finding / request | [ENG-05 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S |
| Acceptance links | [A01](../AUDIT_TRACEABILITY.md#a01), [A39](../AUDIT_TRACEABILITY.md#a39) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. The exact branch Node 22 run [39820430062](https://github.com/Hegazian/Digital-Platform/actions/runs/39820430062) for commit 34723cdded64a751b6a36c208a69421f4a57ac44 passed all five checks, including API migrations/fixture and production/development browser jobs. The historical 2fbdc8e schema has a checked-in baseline and the reviewed follow-up is the M0 auth-version bridge. The local PostgreSQL fixture also passes empty installation, deliberate drift rejection before history write, exact pre-M0 adoption, historical preservation plus the current 22-row/21-table ENG-02 config migration fixture, schema parity, repeat deploy and two simultaneous baseline-fixture runs. ENG-05 remains In Progress until an authorized representative restore, rollback/forward-repair rehearsal and operator review of the runbook are complete. See [migration evidence](../ENG05_IMPLEMENTATION.md) and the [runbook](../NEXT_STEPS.md#eng-05-operational-follow-through). Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

No migration history is present. [CI](<../../.github/workflows/ci.yml>) uses `prisma db push`, testing the latest empty-schema shape rather than upgrades from an existing production database. The schema requires `DIRECT_URL`, omitted from the server environment example.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

New databases and verified legacy databases use an exact, immutable pre-M0 Prisma baseline plus the idempotent auth-version migration. Schema adoption requires a read-only diff against a restored copy.

Database migrations and operations owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: generate the create-only initial SQL from the exact pre-M0 Prisma schema and commit the immutable source snapshot. Keep M0 authVersion as a separate forward migration.
2. Frontend: no direct schema ownership; retain API compatibility through the expand/backfill/verify migration window.
3. Database: CI migrates empty PostgreSQL; a run-unique populated fixture proves exact old-schema match before resolving baseline and deploying the bridge. Preserve IDs and values for accounts, curriculum, progress, quiz/assessment attempts, assignment files, orders and entitlements.
4. Configuration/infrastructure: expose migrate deploy/test/fixture commands, guard schema push to local development/test targets and replace CI release-path db push with reviewed migration deployment.
5. Operations: document backup, read-only diff, operator lock, baseline resolution, restore, checksums/counts and safe forward recovery.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)
- [server/prisma/fixtures/m0-before.prisma](<../../server/prisma/fixtures/m0-before.prisma>)
- [server/prisma/fixtures/migrations-readme.md](<../../server/prisma/fixtures/migrations-readme.md>)
- [server/prisma/migrations/20261022000000_pre_m0_baseline/migration.sql](<../../server/prisma/migrations/20261022000000_pre_m0_baseline/migration.sql>)
- [server/prisma/migrations/20261022000100_m0_auth_version/migration.sql](<../../server/prisma/migrations/20261022000100_m0_auth_version/migration.sql>)
- [server/prisma/migrations/migration_lock.toml](<../../server/prisma/migrations/migration_lock.toml>)
- [server/scripts/migration-upgrade-fixture.cjs](<../../server/scripts/migration-upgrade-fixture.cjs>)
- [server/scripts/db-env.js](<../../server/scripts/db-env.js>)
- [server/package.json](<../../server/package.json>)
- [server/.env.example](<../../server/.env.example>)
- [.github/workflows/ci.yml](<../../.github/workflows/ci.yml>)
- [docker-compose.yml](<../../docker-compose.yml>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Empty target -> migrate deploy applies pre-M0 baseline + authVersion bridge. Verified populated pre-M0 target -> read-only diff, resolve baseline as applied, then migrate deploy applies the bridge. Never execute baseline create-table SQL against populated tables.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Migration DDL uses a dedicated direct connection; runtime uses DATABASE_URL. Test fixture accepts only loopback eduplatform_test, creates unique PostgreSQL schemas and drops only those schemas. A nonempty or drifted existing database must fail closed until reviewed; repeat bridge deploy leaves versions above 1 intact.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Fixture is generated from the exact 2fbdc8e source snapshot. Existing environments require backup, read-only diff and operator decision before migrate resolve. Keep the additive authVersion column and security boundaries on rollback; after data changes, repair forward.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **ENG-05-T01** — Empty chain installs and equals the current Prisma schema; second deploy is a no-op.
- **ENG-05-T02** — Populated pre-M0 schema diff is empty before baseline resolution; bridge preserves all 21 synthetic rows across 20 tables, sets authVersion to 1, and equals current schema.
- **ENG-05-T03** — Database drift aborts before DDL; concurrent fixture runs use independent schemas and cleanup never removes an unowned schema. Representative restore/rollback remains separate acceptance evidence; exact branch CI passed.
- **ENG-05-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **ENG-05-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **ENG-05-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] Checked-in baseline SQL is generated exactly from its immutable snapshot and contains only create operations.
- [ ] All local fixture schemas are removed on success; rows and IDs are unchanged after populated upgrade/redeploy.
- [ ] Remote CI, restored-copy schema review, backup/restore and compatible rollback/forward-repair evidence are attached before completion.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
