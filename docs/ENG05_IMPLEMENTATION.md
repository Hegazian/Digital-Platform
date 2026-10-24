# ENG-05 migration implementation evidence

The latest eight-migration install/drift/populated-preservation run is recorded in [the 24 October task-review evidence](../audit/m1-closure/verification.json). Preserve the earlier checkpoint reports below; their CI results do not validate later migrations or authorize history adoption on an existing database.

M1 follow-through, **24 October 2026**: the chain now has eight migrations, adding SEC-13 refresh-token families, SEC-14 MFA recovery, COM-09 course lifecycle, SEC-07 quiz/question-bank ownership and COM-01 free-enrollment provenance after the ENG-02 config migration. A fresh `npm run db:migrate:fixture` passes empty installation/parity, drift rejection, populated adoption and repeated deploy, preserving **22 rows across 21 tables**. See [M1 evidence](../audit/m1-review/verification.json). Earlier row counts and CI below remain historical. The current M1 commit still needs its own CI; representative restored-copy review, backup/restore and rollback remain Open.

Status: **In Progress**. The baseline and synthetic migration tests are implemented. Exact-head Node 22 CI passed for commit `b6dd8d462a1f4d111f94c6125259d0576738beb9`; an authorized representative backup/restore rehearsal and production adoption review remain open. See the [full ENG-05 acceptance criteria](tasks/ENG-05.md), [migration artifacts](../server/prisma/fixtures/migrations-readme.md) and [next steps](NEXT_STEPS.md#eng-05-operational-follow-through).

## Migration design

The checked-in pre-M0 snapshot is copied from audit baseline **2fbdc8e**. A source comparison shows that M0's only Prisma schema change since that commit is `User.authVersion Int @default(1)`. The initial migration is generated with Prisma 5.11.0 from an empty PostgreSQL schema and is byte-compared against a fresh generation from the snapshot by the fixture.

The ordered migrations are:

1. `20261022000000_pre_m0_baseline` — the complete create-only pre-M0 schema. It contains no data backfill or destructive table operation.
2. `20261022000100_m0_auth_version` — the existing additive M0 bridge: add `authVersion` if absent, change legacy zero values to one, and set the database default to one. Reapplying it preserves higher values and existing records.
3. `20261023000000_eng02_config_version` — add the config version with default one and normalize the charge currency to EGP while preserving the indicative exchange rate.
4. `20261024000000_sec13_refresh_token_families` — add family, parent and consumed-time fields and assign existing sessions independent family IDs.
5. `20261024000100_sec14_secure_mfa` — add pending enrollment state and one-use recovery-code storage without rewriting existing MFA secrets.
6. `20261024000200_com09_course_lifecycle` — add archive/retraction timestamps, reason and actor while preserving course rows and grants.
7. `20261024000300_sec07_quiz_ownership` — add nullable creator ownership to quizzes and question pools; legacy content remains for admin review.
8. `20261024000400_com01_access_policy` — add the `FREE_ENROLLMENT` entitlement provenance value.

An empty database applies all eight files. For a populated database, the initial create-only SQL must **never** run against its existing tables. An operator first compares a restorable copy to the immutable pre-M0 or current schema, resolves the baseline as applied only after the relevant schema diff is empty, and then deploys the reviewed follow-ups. Existing history, drift, concurrent writers or an unknown baseline require investigation before resolution. This branch did not connect to or baseline a production database.

## Local PostgreSQL fixture

Run from `server` with `.env.test` targeting loopback `eduplatform_test`:

```powershell
npm run db:migrate:fixture
```

The script validates **both** database URLs, creates two unpredictable run-specific schemas inside the already dedicated test database, and never connects to a development or production target. It deletes only those two schemas in its cleanup path.

The latest empty-install case applied eight migrations, matched the current Prisma schema, and passed a repeated no-op deployment. A separate drift case added an unexpected table, confirmed the read-only diff returned Prisma's drift exit code, and confirmed `_prisma_migrations` was not created. The populated case created the exact pre-M0 snapshot in its isolated schema; a read-only diff returned no changes before baseline resolution. Its synthetic data covers two accounts, Egyptian grade/subject, a published course and preview section, lesson/progress, quiz and assessment snapshots/attempts, assignment/grading/submission file, a paid order/entitlement, and AppConfig. **22 rows across 21 tables were preserved**, with explicit expected authVersion/config-version/currency updates and the indicative rate retained; new lifecycle columns remain null, and quiz/question-bank ownership is additive and nullable. The final schema diff was empty and repeat deployment was harmless. The earlier M0 two-migration checkpoint preserved 21 rows across 20 tables; it is historical evidence, not the current migration-chain count. All temporary fixture schemas were cleaned up.

Verification commands and results:

- `node --check scripts/migration-upgrade-fixture.cjs` — passed.
- `node --check scripts/db-env.js` — passed.
- `npx prisma validate --schema prisma/schema.prisma` — passed.
- `npx prisma validate --schema prisma/fixtures/m0-before.prisma` — passed.
- `npm run db:migrate:fixture` — passed against the dedicated local PostgreSQL service.
- `git diff --check` — passed during implementation.

This fixture is deterministic in its data and assertions, but uses random schema names so repeated runs cannot collide with one another. It is a synthetic schema/data-upgrade rehearsal, not a physical database backup/restore drill, external service validation, remote GitHub Actions run or production migration sign-off.

## CI and safe schema commands

The server CI job now applies reviewed migrations to its fresh PostgreSQL test service, runs the populated-upgrade fixture, then typechecks/builds/tests. The independent production and development browser jobs also initialize from migrations. The workflow does not mark history applied on any shared database.

`npm run db:migrate` deploys the checked-in chain using the configured direct migration URL. `npm run db:migrate:test` is limited to loopback `eduplatform_test`. `npm run db:push` uses a guard and is limited to loopback `eduplatform_dev`; `npm run db:push:test` remains for explicitly isolated tests/fixture setup. These schema-push commands are not release initialization paths.

## Remaining acceptance and release work

- [x] Remote Node 22 CI passed all five checks for commit `96d3c362a81a373ac8cde83dfeaeba4710c7e664`, including API migration/fixture, documentation/advisory, web build/lint, and production/development desktop/mobile jobs. [GitHub Actions run 39781488417](https://github.com/Hegazian/Digital-Platform/actions/runs/39781488417).
- [ ] Restore a representative authorized database copy; run the read-only pre-M0/current schema comparisons; document drift and anomaly decisions without editing source records.
- [ ] Rehearse baseline resolution, bridge deployment, interrupted/repeated deployment and compatible code rollback or forward repair on that copy.
- [ ] Perform and verify a database backup/restore drill; compare counts/checksums for students, curriculum/progress, attempts/submissions, purchases/grants and asset references.
- [ ] Obtain operator review of direct-versus-pooled connections, database lock/maintenance window and exact deployment command before production use.

ENG-05 remains **In Progress** until the applicable task acceptance and review evidence is complete. The fixture alone does not complete task acceptance A39 or G1.
