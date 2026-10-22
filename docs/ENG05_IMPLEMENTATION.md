# ENG-05 migration implementation evidence

Status: **In Progress**. The baseline and synthetic migration tests are implemented. This record covers the current branch's local evidence; remote CI, a representative backup/restore rehearsal and production adoption review remain open. See the [full ENG-05 acceptance criteria](tasks/ENG-05.md), [migration artifacts](../server/prisma/fixtures/migrations-readme.md) and [next steps](NEXT_STEPS.md#first-implementation-task--eng-05).

## Migration design

The checked-in pre-M0 snapshot is copied from audit baseline **2fbdc8e**. A source comparison shows that M0's only Prisma schema change since that commit is `User.authVersion Int @default(1)`. The initial migration is generated with Prisma 5.11.0 from an empty PostgreSQL schema and is byte-compared against a fresh generation from the snapshot by the fixture.

The ordered migrations are:

1. `20261022000000_pre_m0_baseline` — the complete create-only pre-M0 schema. It contains no data backfill or destructive table operation.
2. `20261022000100_m0_auth_version` — the existing additive M0 bridge: add `authVersion` if absent, change legacy zero values to one, and set the database default to one. Reapplying it preserves higher values and existing records.

An empty database applies both files. For a populated database, the initial create-only SQL must **never** run against its existing tables. An operator first compares a restorable copy to the immutable pre-M0 or current schema, resolves the baseline as applied only after the relevant schema diff is empty, and then deploys the idempotent bridge. Existing history, drift, concurrent writers or an unknown baseline require investigation before resolution. This branch did not connect to or baseline a production database.

## Local PostgreSQL fixture

Run from `server` with `.env.test` targeting loopback `eduplatform_test`:

```powershell
npm run db:migrate:fixture
```

The script validates **both** database URLs, creates two unpredictable run-specific schemas inside the already dedicated test database, and never connects to a development or production target. It deletes only those two schemas in its cleanup path.

The empty-install case applied both migrations, matched the current Prisma schema, and passed a repeated no-op deployment. The populated case created the exact pre-M0 snapshot in its isolated schema; a read-only diff returned no changes before baseline resolution. Its synthetic data covers two accounts, Egyptian grade/subject, a published course and preview section, lesson/progress, quiz and assessment snapshots/attempts, assignment/grading/submission file, and a paid order/entitlement. The bridge was deployed and a second deploy was repeated. **All 21 rows across 20 tables retained their IDs and values**, both account versions became `1`, and the final Prisma schema diff was empty. Both temporary schemas were cleaned up.

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

- [ ] Obtain and retain a successful remote Node 22 CI run for this branch, including empty migrations and populated fixture jobs.
- [ ] Restore a representative authorized database copy; run the read-only pre-M0/current schema comparisons; document drift and anomaly decisions without editing source records.
- [ ] Rehearse baseline resolution, bridge deployment, interrupted/repeated deployment and compatible code rollback or forward repair on that copy.
- [ ] Perform and verify a database backup/restore drill; compare counts/checksums for students, curriculum/progress, attempts/submissions, purchases/grants and asset references.
- [ ] Obtain operator review of direct-versus-pooled connections, database lock/maintenance window and exact deployment command before production use.

ENG-05 remains **In Progress** until the applicable task acceptance and review evidence is complete. The fixture alone does not complete task acceptance A39 or G1.
