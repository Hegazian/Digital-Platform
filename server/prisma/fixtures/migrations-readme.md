# Prisma migration baseline and upgrade fixture

The initial migration, `20261022000000_pre_m0_baseline`, is generated from the exact Prisma schema at audit baseline commit `2fbdc8e`, with no application data or feature changes. Its source snapshot is `fixtures/m0-before.prisma`. Do not edit this baseline after adoption; add forward migrations.

Reviewed SHA-256: source snapshot `4624dde7a2fcf50ee5821ced56e1c350d993b81790cdf62fbc43a327c0b9a940`; baseline SQL `b31ee33d831fa30d881e286b63bf3d23aa01751818b2479837edcf69f1893f22`; auth-version migration `aaca9f315695f6f689142f6668f9ad2f073350f7ccdd6da031e651c00ce8b1ae`. The automated fixture verifies that the baseline SQL is exactly the Prisma-generated empty-to-snapshot diff.

The next migration, `20261022000100_m0_auth_version`, is the idempotent M0 auth-version bridge already used by this release. It adds `users.authVersion` when absent, raises legacy zero values to one, and leaves higher values alone. On an empty database, baseline SQL creates the pre-M0 schema and the bridge advances it to the current application schema.

Before adopting history on an existing database:

1. Take and verify a restorable database backup. Stop schema writers and hold the migration operator lock.
2. Run the fixture and tests in `server/.env.test`. It creates only unique schemas in the loopback `eduplatform_test` database and deletes only the schemas it created.
3. Against a restored copy of the target database, compare its actual schema to the committed pre-M0 snapshot or current Prisma schema. With environment variables set only to the restored copy, run `npx prisma migrate diff --from-schema-datasource prisma/fixtures/m0-before.prisma --to-schema-datamodel prisma/fixtures/m0-before.prisma --exit-code` for an exact pre-M0 database. Select `prisma/schema.prisma` for an exact current database. Use Prisma's read-only `migrate diff`; an unexpected diff aborts adoption. Do not use the initial create-table SQL on populated tables.
4. Confirm the database's schema state matches the baseline or has already received the idempotent auth-version bridge. Only then resolve `20261022000000_pre_m0_baseline` as applied and run `prisma migrate deploy` using the approved direct migration connection.
5. Compare the resulting schema with `prisma/schema.prisma`, verify account/session and historical-record counts, and rehearse code rollback or a forward repair against the restored copy.

For a new database, run `npm run db:migrate`. The API/runtime uses `DATABASE_URL`; Prisma migrations use the direct `DIRECT_URL`. The production migration is an operator-controlled release action after the backup, diff, and lock checks. Never run `prisma db push` or `migrate reset` against a production database.

CI uses `npm run db:migrate:test` before server/browser tests. Its populated-upgrade fixture first constructs a historical schema in a run-unique schema using `db push`; it is exclusively a test-fixture bootstrap, never a release/install path. The fixture checks the pre-M0 diff before adoption, snapshots users, courses, lessons, progress, attempts, submissions, payments and entitlements, resolves the reviewed baseline, deploys the bridge, and verifies schema and data preservation.
