# Project overview and development usage

**Updated: 22 October 2026**, M0 application checkpoint **d9c720f**. M0 engineering is finalized for internal synthetic data; G1–G3 and production onboarding remain gated by operator evidence. See [current results and remaining gaps](docs/CURRENT_STATUS.md). ENG-05 and ENG-06 code and exact-head CI passed; their representative restore and infrastructure rehearsals remain open. M1 implementation starts with dependency-ready ENG-09. See the [current M1 handoff](docs/NEXT_STEPS.md). Previous content is [superseded and preserved](docs/archive/project_overview_and_usage_guide.md).

Read [scope](docs/PRODUCT_SCOPE.md) and [implementation status](docs/ROADMAP_BACKLOG.md) first. Students consume published content and manage their own work; approved teachers author owned/assigned drafts; admins approve teacher revisions and may publish their own valid content.

## Existing local commands (prototype)

CI uses Node 22; local M0 verification used Node 26.7.0. Install each package using its lockfile ('npm ci' in server and client). Compose defines PostgreSQL dev at 5434, test at 5433 and Redis at 6379; it is not an application production deployment. The [M0 manual guide](docs/M0_MANUAL_TESTING.md) gives complete isolated setup and commands.

Configure server environment from its example, including DATABASE_URL and DIRECT_URL, using separate dedicated databases. Tests/reset helpers allow only the explicit local eduplatform_test database. Never print secrets or run destructive tests against shared data. Local application tests may use db:push:test against the disposable test database; empty installs and deployed upgrade paths use the checked-in migration chain. The ENG-05 fixture builds the exact pre-M0 schema with db push inside a unique, disposable test schema, never against existing tables. Existing deployments require a read-only schema comparison, backup and reviewed baseline resolution before the additive auth-version bridge is deployed; see [operations](docs/MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold). Reference seeding no longer creates login accounts; initial admin provisioning requires explicit one-time opt-in and unique credentials.

In server, existing commands are 'npm run dev', 'npm run typecheck', 'npm run build', 'npm test'; in client, 'npm run dev', 'npm run typecheck', 'npm run build' and 'npm run lint'. Next 16 uses the separate ESLint CLI. Coverage and isolated browser commands are documented in docs/M0_MANUAL_TESTING.md. Backend normally runs on 5000 and frontend on 3000; verify configured proxy/API URL. Existing tests may delete whole tables: apply the [test database safety gate](docs/TESTING_RELEASE_GATES.md#test-protocol) before running them.

## Planned operational usage

Admin configures academic registry/payment instructions and approves teachers. Teacher creates course/unit/lesson, supplies locale text, uploads media/captions/rights evidence or previews structured imports, then submits exact revision. Admin reviews/requests changes/approves; student gets private entitled or explicit-preview delivery. Manual payment stays pending until administrator verifies settlement; voucher redemption is atomic. Detailed API and error contracts are [here](docs/API_DATA_CONTRACTS.md).

Production, migration, backup, support and rollback procedures are specified in [MIGRATION_OPERATIONS.md](docs/MIGRATION_OPERATIONS.md); they are planned work, not commands to execute against this prototype.
