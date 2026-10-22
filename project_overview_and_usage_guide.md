# Project overview and development usage

**Updated: 22 October 2026**, application checkpoint **d9c720f**. M0 engineering is finalized for internal synthetic data; production onboarding remains gated by G1–G3 and operator verification. See [current results and remaining gaps](docs/CURRENT_STATUS.md). **Next: [ENG-05 migration baseline](docs/NEXT_STEPS.md#first-implementation-task--eng-05)**, then the ordered M1 waves while ENG-13 continues testing. Previous content is [superseded and preserved](docs/archive/project_overview_and_usage_guide.md).

Read [scope](docs/PRODUCT_SCOPE.md) and [implementation status](docs/ROADMAP_BACKLOG.md) first. Students consume published content and manage their own work; approved teachers author owned/assigned drafts; admins approve teacher revisions and may publish their own valid content.

## Existing local commands (prototype)

CI uses Node 22; local M0 verification used Node 26.7.0. Install each package using its lockfile ('npm ci' in server and client). Compose defines PostgreSQL dev at 5434, test at 5433 and Redis at 6379; it is not an application production deployment. The [M0 manual guide](docs/M0_MANUAL_TESTING.md) gives complete isolated setup and commands.

Configure server environment from its example, including DATABASE_URL and DIRECT_URL, using separate dedicated databases. Tests/reset helpers allow only the explicit local eduplatform_test database. Never print secrets or run destructive tests against shared data. Disposable schema initialization uses db push; ENG-05 owns the full checked-in migration baseline. Existing deployments require the additive M0 auth-version SQL bridge and preservation checks in [operations](docs/MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold). Reference seeding no longer creates login accounts; initial admin provisioning requires explicit one-time opt-in and unique credentials.

In server, existing commands are 'npm run dev', 'npm run typecheck', 'npm run build', 'npm test'; in client, 'npm run dev', 'npm run typecheck', 'npm run build' and 'npm run lint'. Next 16 uses the separate ESLint CLI. Coverage and isolated browser commands are documented in docs/M0_MANUAL_TESTING.md. Backend normally runs on 5000 and frontend on 3000; verify configured proxy/API URL. Existing tests may delete whole tables: apply the [test database safety gate](docs/TESTING_RELEASE_GATES.md#test-protocol) before running them.

## Planned operational usage

Admin configures academic registry/payment instructions and approves teachers. Teacher creates course/unit/lesson, supplies locale text, uploads media/captions/rights evidence or previews structured imports, then submits exact revision. Admin reviews/requests changes/approves; student gets private entitled or explicit-preview delivery. Manual payment stays pending until administrator verifies settlement; voucher redemption is atomic. Detailed API and error contracts are [here](docs/API_DATA_CONTRACTS.md).

Production, migration, backup, support and rollback procedures are specified in [MIGRATION_OPERATIONS.md](docs/MIGRATION_OPERATIONS.md); they are planned work, not commands to execute against this prototype.
